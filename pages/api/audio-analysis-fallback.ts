// pages/api/audio-analysis-fallback.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, Files, Fields, File } from 'formidable';
import OpenAI from 'openai';

// Disable body parsing, we'll handle it ourselves with formidable
export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type FallbackResponse = {
  success: boolean;
  feedback?: {
    overallScore?: number;
    title: string;
    message: string;
    suggestion?: string;
    samplesAnalyzed?: number;
    totalMessages?: number;
  };
  error?: string;
}

// Generate feedback for iOS/Safari fallback (simpler scoring)
function generateFallbackFeedback(audioCount: number, scenarioTitle: string): any {
  const scenario = scenarioTitle.toLowerCase();
  let scenarioContext = 'conversation';
  
  if (scenario.includes('tim hortons') || scenario.includes('coffee')) {
    scenarioContext = 'coffee ordering';
  } else if (scenario.includes('restaurant')) {
    scenarioContext = 'restaurant conversation';
  } else if (scenario.includes('doctor') || scenario.includes('medical')) {
    scenarioContext = 'medical consultation';
  }
  
  // Simple scoring based on engagement (number of audio samples)
  let score = Math.min(50 + (audioCount * 10), 85); // Base 50, +10 per sample, max 85
  
  if (score >= 70) {
    return {
      overallScore: score,
      title: "🎉 Great Practice Session!",
      message: `Excellent engagement in ${scenarioContext}! You participated actively and showed great effort.`,
      suggestion: "You're doing well! Try exploring more challenging scenarios to continue building your confidence."
    };
  }
  
  return {
    overallScore: score,
    title: "💪 Good Practice!",
    message: `Nice work practicing ${scenarioContext}! Your active participation shows commitment to learning.`,
    suggestion: "Keep practicing! Try to speak a bit longer in each response for even better results."
  };
}

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<FallbackResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('📱 Processing fallback audio analysis for iOS/Safari...');
    
    // Parse the form with the audio files
    const form = new IncomingForm({
      keepExtensions: true,
      maxFiles: 10, // Limit number of files
      maxFileSize: 5 * 1024 * 1024, // 5MB per file
    });

    const formData: [Fields, Files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve([fields, files]);
      });
    });

    const [fields, files] = formData;
    
    const scenarioTitle = Array.isArray(fields.scenarioTitle) ? fields.scenarioTitle[0] : fields.scenarioTitle || '';
    const userId = Array.isArray(fields.userId) ? fields.userId[0] : fields.userId || '';
    
    // Count audio files
    const audioFiles = Object.keys(files).filter(key => key.startsWith('audio_'));
    console.log(`📱 Found ${audioFiles.length} audio files for analysis`);
    
    if (audioFiles.length === 0) {
      return res.status(200).json({
        success: true,
        feedback: {
          title: "Session Complete!",
          message: "Thanks for practicing! Try speaking longer sentences next time.",
          suggestion: "Record audio responses for better feedback in future sessions.",
          samplesAnalyzed: 0,
          totalMessages: 0
        }
      });
    }
    
    // For fallback, we'll do basic quality check using OpenAI Whisper
    // and generate simpler feedback based on participation
    let transcriptionCount = 0;
    let totalDuration = 0;
    
    // Process a few samples to get basic quality metrics
    const samplesToCheck = Math.min(audioFiles.length, 3); // Check max 3 files to avoid timeout
    
    for (let i = 0; i < samplesToCheck; i++) {
      const audioFileKey = audioFiles[i];
      const audioFileArray = files[audioFileKey];
      
      if (!audioFileArray || !Array.isArray(audioFileArray) || audioFileArray.length === 0) {
        continue;
      }
      
      const audioFile = audioFileArray[0] as File;
      
      try {
        // Quick transcription check with OpenAI
        const { createReadStream } = await import('fs');
        const audioStream = createReadStream(audioFile.filepath);
        
        const transcription = await openai.audio.transcriptions.create({
          file: audioStream,
          model: "whisper-1",
          language: "en",
        });
        
        if (transcription.text && transcription.text.trim().length > 0) {
          transcriptionCount++;
          // Estimate duration based on transcript length (rough approximation)
          totalDuration += transcription.text.split(' ').length * 0.5; // ~0.5 seconds per word
        }
        
        console.log(`📱 Sample ${i + 1} transcribed: "${transcription.text}"`);
        
      } catch (transcriptionError) {
        console.warn(`📱 Transcription failed for sample ${i + 1}:`, transcriptionError);
      }
    }
    
    console.log(`📱 Fallback analysis complete:`);
    console.log(`- Files processed: ${samplesToCheck}/${audioFiles.length}`);
    console.log(`- Successful transcriptions: ${transcriptionCount}`);
    console.log(`- Estimated total duration: ${totalDuration}s`);
    
    // Generate feedback based on participation and basic quality
    const feedback = generateFallbackFeedback(transcriptionCount, scenarioTitle);
    feedback.samplesAnalyzed = transcriptionCount;
    feedback.totalMessages = audioFiles.length;
    
    return res.status(200).json({
      success: true,
      feedback
    });

  } catch (error) {
    console.error('📱 Fallback analysis error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process fallback audio analysis'
    });
  }
}