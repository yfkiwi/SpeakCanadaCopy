// Browser TTS utility for replacing OpenAI TTS
export class BrowserTTS {
  constructor() {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
      this.isSupported = 'speechSynthesis' in window;
    } else {
      this.synthesis = null;
      this.isSupported = false;
    }
    this.currentUtterance = null;
  }

  // Check if browser supports speech synthesis
  isSupported() {
    return this.isSupported;
  }

  // Get available voices
  getVoices() {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }

  // Speak text using browser TTS
  speak(text, options = {}) {
    if (!this.isSupported) {
      console.warn('Speech synthesis not supported in this browser');
      return Promise.reject(new Error('Speech synthesis not supported'));
    }

    // Stop any current speech
    this.stop();

    return new Promise((resolve, reject) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set default options
        utterance.rate = options.rate || 1.0;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;
        utterance.lang = options.lang || 'en-US';

        // Try to use a female voice if available
        const voices = this.getVoices();
        const femaleVoice = voices.find(voice => 
          voice.name.includes('Female') || 
          voice.name.includes('Woman') || 
          voice.name.includes('Samantha') ||
          voice.name.includes('Karen') ||
          voice.name.includes('Victoria')
        );
        
        if (femaleVoice) {
          utterance.voice = femaleVoice;
        } else if (voices.length > 0) {
          // Fallback to first available voice
          utterance.voice = voices[0];
        }

        // Event handlers
        utterance.onend = () => {
          this.currentUtterance = null;
          resolve();
        };

        utterance.onerror = (event) => {
          this.currentUtterance = null;
          console.error('Speech synthesis error:', event.error);
          reject(new Error(`Speech synthesis error: ${event.error}`));
        };

        utterance.onstart = () => {
          console.log('Speech synthesis started');
        };

        // Store current utterance for stopping
        this.currentUtterance = utterance;

        // Speak
        this.synthesis.speak(utterance);

      } catch (error) {
        console.error('Error creating speech utterance:', error);
        reject(error);
      }
    });
  }

  // Stop current speech
  stop() {
    if (this.synthesis && this.synthesis.speaking) {
      this.synthesis.cancel();
    }
    this.currentUtterance = null;
  }

  // Pause current speech
  pause() {
    if (this.synthesis && this.synthesis.speaking && !this.synthesis.paused) {
      this.synthesis.pause();
    }
  }

  // Resume paused speech
  resume() {
    if (this.synthesis && this.synthesis.paused) {
      this.synthesis.resume();
    }
  }

  // Check if currently speaking
  isSpeaking() {
    return this.synthesis ? this.synthesis.speaking : false;
  }

  // Check if currently paused
  isPaused() {
    return this.synthesis ? this.synthesis.paused : false;
  }
}

// Create a singleton instance
export const browserTTS = new BrowserTTS();

// Fallback function for compatibility
export const speakText = (text, options = {}) => {
  return browserTTS.speak(text, options);
};
