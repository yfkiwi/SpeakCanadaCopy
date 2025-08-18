// utils/clientAudioProcessor.ts
export interface AudioMetrics {
  duration: number;
  quality: 'good' | 'poor';
  sampleRate: number;
}

export interface ProcessedAudio {
  wavData: ArrayBuffer;
  transcript: string;
  duration: number;
  timestamp: number;
}

export interface FeedbackData {
  overallScore?: number;
  title: string;
  message: string;
  suggestion?: string;
  samplesAnalyzed?: number;
  totalMessages?: number;
  conversationLength?: number;
}

export class ClientAudioProcessor {
  private audioContext: AudioContext | null = null;

  // Detect deployment environment
  static getEnvironment() {
    const isNetlify = typeof window !== 'undefined' && (
      window.location.hostname.includes('.netlify.app') ||
      window.location.hostname.includes('.netlify.com') ||
      process.env.NETLIFY === 'true' ||
      process.env.NETLIFY_ENV
    );
    
    const isProduction = typeof window !== 'undefined' && 
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1');
    
    return {
      isNetlify,
      isProduction,
      isDevelopment: !isProduction,
      netlifyEnv: process.env.NETLIFY_ENV || 'unknown'
    };
  }

  // Detect browser capabilities
  static getBrowserSupport() {
    const isIOS = /iPhone|iPad/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    return {
      webAudio: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
      webM: MediaRecorder.isTypeSupported('audio/webm;codecs=opus'),
      opus: MediaRecorder.isTypeSupported('audio/webm;codecs=opus'),
      isIOS,
      isSafari,
      supportsClientProcessing: !isIOS && typeof AudioContext !== 'undefined'
    };
  }

  // Get best supported MIME type for recording
  static getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return 'audio/webm'; // fallback
  }

  // Initialize audio context
  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      const AudioContextClass = AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: 16000 });
    }
    return this.audioContext;
  }

  // Convert WebM to WAV using Web Audio API
  async convertWebMToWAV(webmBlob: Blob): Promise<Blob> {
    try {
      const audioContext = this.getAudioContext();
      
      // Decode the audio data
      const arrayBuffer = await webmBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Extract mono PCM data at 16kHz
      const pcmData = this.extractMono16BitPCM(audioBuffer);
      
      // Create WAV file
      const wavBlob = this.createWAVBlob(pcmData, 16000);
      
      return wavBlob;
    } catch (error) {
      console.error('Audio conversion failed:', error);
      throw new Error(`Audio conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Extract mono 16-bit PCM data
  private extractMono16BitPCM(audioBuffer: AudioBuffer): Int16Array {
    const samples = audioBuffer.getChannelData(0); // Get first channel (mono)
    const targetSampleRate = 16000;
    const ratio = audioBuffer.sampleRate / targetSampleRate;
    
    const length = Math.floor(samples.length / ratio);
    const result = new Int16Array(length);
    
    // Downsample and convert to 16-bit integers
    for (let i = 0; i < length; i++) {
      const index = Math.floor(i * ratio);
      // Convert float32 (-1 to 1) to int16 (-32768 to 32767)
      result[i] = Math.max(-32768, Math.min(32767, Math.round(samples[index] * 32767)));
    }
    
    return result;
  }

  // Create WAV blob with proper headers
  private createWAVBlob(pcmData: Int16Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + pcmData.length * 2);
    const view = new DataView(buffer);
    
    // Helper function to write strings
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    // WAV header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length * 2, true); // File size
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM format chunk size
    view.setUint16(20, 1, true);  // PCM format
    view.setUint16(22, 1, true);  // Mono channel
    view.setUint32(24, sampleRate, true); // Sample rate
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true);  // Block align
    view.setUint16(34, 16, true); // Bits per sample
    writeString(36, 'data');
    view.setUint32(40, pcmData.length * 2, true); // Data chunk size
    
    // Write PCM data
    let offset = 44;
    for (let i = 0; i < pcmData.length; i++) {
      view.setInt16(offset, pcmData[i], true);
      offset += 2;
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }

  // Analyze audio quality
  async analyzeAudioQuality(audioBlob: Blob): Promise<AudioMetrics> {
    try {
      const audioContext = this.getAudioContext();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const duration = audioBuffer.duration * 1000; // Convert to milliseconds
      const quality = duration >= 1000 ? 'good' : 'poor'; // Minimum 1 second for good quality
      
      return {
        duration,
        quality,
        sampleRate: audioBuffer.sampleRate
      };
    } catch (error) {
      return {
        duration: 0,
        quality: 'poor',
        sampleRate: 0
      };
    }
  }

  // Process multiple audio samples with controlled concurrency
  async processAudioBatch(audioSamples: Array<{ blob: Blob; transcript: string; timestamp: number; duration: number }>): Promise<ProcessedAudio[]> {
    const results: ProcessedAudio[] = [];
    
    // Process 2 at a time to avoid overwhelming the browser
    for (let i = 0; i < audioSamples.length; i += 2) {
      const batch = audioSamples.slice(i, i + 2);
      
      const batchPromises = batch.map(async (sample) => {
        try {
          const wavBlob = await this.convertWebMToWAV(sample.blob);
          const wavData = await wavBlob.arrayBuffer();
          
          return {
            wavData,
            transcript: sample.transcript,
            duration: sample.duration,
            timestamp: sample.timestamp
          };
        } catch (error) {
          console.warn('Failed to process audio sample:', error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter((result): result is ProcessedAudio => result !== null);
      results.push(...validResults);
    }
    
    return results;
  }

  // Generate fallback feedback when Azure processing fails
  generateFallbackFeedback(totalMessages: number, scenarioTitle: string): FeedbackData {
    return {
      title: "Session Complete!",
      message: "Thanks for practicing! Your conversation was saved successfully.",
      suggestion: "Keep practicing to build confidence in real conversations.",
      samplesAnalyzed: 0,
      totalMessages,
      conversationLength: 0
    };
  }

  // Convert processed audio for API transmission
  processedAudioToBase64(processedAudio: ProcessedAudio[]): string[] {
    return processedAudio.map(audio => {
      const uint8Array = new Uint8Array(audio.wavData);
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
      }
      return btoa(binaryString);
    });
  }

  // Cleanup resources
  cleanup(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton instance
export const audioProcessor = new ClientAudioProcessor();