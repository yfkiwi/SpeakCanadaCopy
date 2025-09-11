// pages/api/azure-analytics.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = 'nodejs';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

// ⭐⭐⭐⭐⭐ Environment detection
const isVercel = process.env.VERCEL === '1';
const isDevelopment = process.env.NODE_ENV === 'development';

// ⭐⭐⭐⭐⭐ FFmpeg path detection (safe for development)
let ffmpegPath = 'ffmpeg'; // Default - works for your Windows setup

if (isVercel) {
  // Only try to load the package if we're actually on Vercel
  try {
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    ffmpegPath = ffmpegInstaller.path;
    console.log(`⭐ Using Vercel FFmpeg: ${ffmpegPath}`);
  } catch (error) {
    console.warn('⭐ FFmpeg installer not found, falling back to system FFmpeg');
    // Will still use 'ffmpeg' - should work on most systems
  }
} else {
  console.log(`⭐ Development mode - using system FFmpeg: ${ffmpegPath}`);
}

// ⭐⭐⭐⭐⭐ Cross-platform conversion function
async function convertWebMToWav(audioData: string): Promise<Buffer> {
  const audioBuffer = Buffer.from(audioData, 'base64');
  
  const tempDir = os.tmpdir();
  console.log(`⭐ Environment: ${isVercel ? 'Vercel' : 'Local'}, Platform: ${os.platform()}, Temp: ${tempDir}`);
  
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  const inputFile = path.join(tempDir, `input_${timestamp}_${randomId}.webm`);
  const outputFile = path.join(tempDir, `output_${timestamp}_${randomId}.wav`);
  
  console.log(`⭐ Input file path: ${inputFile}`);
  console.log(`⭐ Output file path: ${outputFile}`);
  
  try {
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      console.log(`⭐ Creating temp directory: ${tempDir}`);
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Write WebM file
    fs.writeFileSync(inputFile, audioBuffer);
    console.log(`⭐ Input file created: ${inputFile} (${audioBuffer.length} bytes)`);
    
    // Verify file creation
    if (!fs.existsSync(inputFile)) {
      throw new Error(`Failed to create input file: ${inputFile}`);
    }
    
    const inputStats = fs.statSync(inputFile);
    console.log(`⭐ Input file verified: ${inputStats.size} bytes`);
    
    // ⭐⭐⭐⭐⭐ Use detected FFmpeg path with proper quoting
    const ffmpegCommand = `"${ffmpegPath}" -i "${inputFile}" -acodec pcm_s16le -ar 16000 -ac 1 -y "${outputFile}"`;
    console.log(`⭐ Running FFmpeg: ${ffmpegCommand}`);
    
    // ⭐⭐⭐⭐⭐ Add timeout for production safety
    const timeoutMs = isVercel ? 25000 : 60000; // 25s for Vercel, 60s for dev
    
    const { stdout, stderr } = await Promise.race([
      execAsync(ffmpegCommand),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`FFmpeg timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
    
    if (stdout) console.log(`⭐ FFmpeg stdout: ${stdout}`);
    if (stderr) console.log(`⭐ FFmpeg stderr: ${stderr}`);
    
    console.log(`⭐ FFmpeg conversion completed: ${outputFile}`);
    
    // Verify output file
    if (!fs.existsSync(outputFile)) {
      throw new Error(`FFmpeg failed to create output file: ${outputFile}`);
    }
    
    const wavBuffer = fs.readFileSync(outputFile);
    console.log(`⭐ WAV file read successfully: ${wavBuffer.length} bytes`);
    
    // Cleanup
    fs.unlinkSync(inputFile);
    fs.unlinkSync(outputFile);
    console.log(`⭐ Temporary files cleaned up`);
    
    return wavBuffer;
  } catch (error) {
    console.error('⭐ FFmpeg conversion error:', error);
    
    // Enhanced error details
    if (error instanceof Error) {
      console.error('⭐ Error details:', {
        message: error.message,
        code: (error as any).code,
        errno: (error as any).errno,
        syscall: (error as any).syscall,
        path: (error as any).path
      });
    }
    
    // Cleanup on error
    try {
      if (fs.existsSync(inputFile)) {
        fs.unlinkSync(inputFile);
        console.log(`⭐ Cleaned up input file: ${inputFile}`);
      }
      if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
        console.log(`⭐ Cleaned up output file: ${outputFile}`);
      }
    } catch (cleanupError) {
      console.error('⭐ Cleanup error:', cleanupError);
    }
    
    throw new Error(`Audio conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ⭐⭐⭐⭐⭐ Environment-aware FFmpeg test
async function testFFmpeg(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`"${ffmpegPath}" -version`);
    console.log(`⭐ FFmpeg test successful: ${stdout.split('\n')[0]}`);
    return true;
  } catch (error) {
    console.error('⭐ FFmpeg test failed:', error);
    return false;
  }
}

// Rest of your Azure functions remain exactly the same...
// (getAzureToken, analyzeWithAzure, generateFeedback, handler)port path from 'path';

// Azure Speech config
const speechKey = process.env.AZURE_SPEECH_KEY || '';
const serviceRegion = process.env.AZURE_SPEECH_REGION || 'canadaeast';

type AnalyticsResponse = {
  success: boolean;
  overallScore?: number;
  feedback?: {
    title: string;
    message: string;
    suggestion: string;
  };
  samplesAnalyzed?: number;
  error?: string;
}

// Token cache to avoid repeated token requests
let azureTokenCache = {
  token: '',
  expires: 0
};

// Get Azure token with caching
async function getAzureToken(): Promise<string> {
  const now = Date.now();
  
  if (azureTokenCache.token && azureTokenCache.expires > now + 300000) {
    return azureTokenCache.token;
  }
  
  const tokenResponse = await fetch(`https://${serviceRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': speechKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  
  if (!tokenResponse.ok) {
    throw new Error('Failed to get access token');
  }
  
  const token = await tokenResponse.text();
  azureTokenCache = {
    token,
    expires: now + 540000
  };
  
  return token;
}



// ⭐⭐⭐⭐⭐ MODIFIED: Azure STT with FFmpeg conversion
async function analyzeWithAzure(audioData: string): Promise<{ recognizedText: string; confidence: number; wordConfidences: number[] }> {
  try {
    // Convert WebM to WAV first
    console.log(`⭐ Starting audio conversion for ${audioData.length} chars of base64 data...`);
    const wavBuffer = await convertWebMToWav(audioData);
    console.log(`⭐ Audio successfully converted to WAV: ${wavBuffer.length} bytes`);
    
    const accessToken = await getAzureToken();

    const sttResponse = await fetch(
      `https://${serviceRegion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'audio/wav',
          'Accept': 'application/json',
        },
        body: wavBuffer, // ⭐⭐⭐⭐⭐ Now using converted WAV buffer
      }
    );

    if (!sttResponse.ok) {
      const errorText = await sttResponse.text();
      console.error(`Azure STT API error: ${sttResponse.status} - ${errorText}`);
      throw new Error(`Azure STT API error: ${sttResponse.status}`);
    }

    const result = await sttResponse.json();
    console.log('⭐ Azure STT Response:', JSON.stringify(result, null, 2));
    
    // Convert confidence from 0-1 to 0-100 scale
    const confidence = result.NBest && result.NBest.length > 0 ? 
      (result.NBest[0].Confidence || 0) * 100 : 0;
    const recognizedText = result.DisplayText || '';
    
    console.log(`⭐ Recognized Text: "${recognizedText}"`);
    console.log(`⭐ Confidence Score: ${confidence}`);
    
    const wordConfidences: number[] = [];
    if (result.NBest && result.NBest.length > 0 && result.NBest[0].Words) {
      result.NBest[0].Words.forEach((word: any) => {
        if (word.Confidence !== undefined) {
          wordConfidences.push(word.Confidence * 100); // Convert to 0-100 scale
        }
      });
    }

    console.log(`⭐ Word Confidences: [${wordConfidences.join(', ')}]`);

    return {
      recognizedText,
      confidence,
      wordConfidences
    };
  } catch (error) {
    console.error('⭐ Azure STT error details:', error);
    return { 
      recognizedText: '', 
      confidence: 0,
      wordConfidences: []
    };
  }
}

// Generate feedback based on overall score and scenario
function generateFeedback(score: number, scenarioTitle: string): { title: string; message: string; suggestion: string } {
  const scenario = scenarioTitle.toLowerCase();
  let scenarioContext = 'conversation';
  
  if (scenario.includes('tim hortons') || scenario.includes('coffee')) {
    scenarioContext = 'coffee ordering';
  } else if (scenario.includes('restaurant')) {
    scenarioContext = 'restaurant conversation';
  } else if (scenario.includes('bank')) {
    scenarioContext = 'banking interaction';
  } else if (scenario.includes('doctor') || scenario.includes('medical')) {
    scenarioContext = 'medical consultation';
  }
  
  if (score >= 70) {
    return {
      title: "🎉 Excellent Work!",
      message: `Outstanding! Your pronunciation and fluency in ${scenarioContext} are excellent. You're ready for real-world situations like this!`,
      suggestion: "You're doing great! Try exploring more challenging scenarios to continue building your confidence."
    };
  }
  
  if (score >= 40) {
    return {
      title: "💪 You're Almost There!",
      message: `Good progress! Your ${scenarioContext} skills are developing well. With a bit more practice, you'll be very confident.`,
      suggestion: "Keep practicing! Focus on speaking clearly and try a few more sessions in this scenario."
    };
  }
  
  return {
    title: "📚 Keep Learning!",
    message: `Great start! ${scenarioContext} takes practice, and you're on the right path.`,
    suggestion: "Try studying our vocabulary flashcards and pronunciation guides, then come back to practice more conversations!"
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<AnalyticsResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { audioSamples, scenarioTitle, userId } = req.body;

    if (!audioSamples || !Array.isArray(audioSamples) || audioSamples.length === 0) {
      return res.status(400).json({ success: false, error: 'Audio samples are required' });
    }

    console.log(`⭐ Processing ${audioSamples.length} audio samples for analysis...`);

    // Process each audio sample
    const scores: number[] = [];
    const confidences: number[] = [];
    const recognizedTexts: string[] = [];
    
    for (let i = 0; i < audioSamples.length; i++) {
      const audioData = audioSamples[i];
      console.log(`⭐ Analyzing sample ${i + 1}/${audioSamples.length}...`);
      
      const azureResult = await analyzeWithAzure(audioData);
      
      // Store recognized text for debugging
      recognizedTexts.push(azureResult.recognizedText);
      
      console.log(`⭐ Sample ${i + 1} - Text: "${azureResult.recognizedText}", Confidence: ${azureResult.confidence}`);
      
      if (azureResult.confidence > 0) {
        console.log(`✅ Sample ${i + 1} added to analysis (confidence: ${azureResult.confidence})`);
        scores.push(azureResult.confidence);
        // Also include word-level confidences for more detailed analysis
        if (azureResult.wordConfidences.length > 0) {
          confidences.push(...azureResult.wordConfidences);
        }
      } else {
        console.log(`❌ Sample ${i + 1} skipped (confidence: ${azureResult.confidence}, text: "${azureResult.recognizedText}")`);
      }
    }

    console.log(`⭐ Analysis Summary:`);
    console.log(`- Total samples processed: ${audioSamples.length}`);
    console.log(`- Samples with valid confidence: ${scores.length}`);
    console.log(`- Sentence-level scores: [${scores.join(', ')}]`);
    console.log(`- Word-level confidences count: ${confidences.length}`);
    console.log(`- Recognized texts: ${recognizedTexts.map(text => `"${text}"`).join(', ')}`);

    // Calculate overall score
    let overallScore = 0;
    if (scores.length > 0) {
      // Weighted average: sentence-level scores get more weight
      const sentenceAvg = scores.reduce((a, b) => a + b) / scores.length;
      const wordAvg = confidences.length > 0 ? 
        confidences.reduce((a, b) => a + b) / confidences.length : sentenceAvg;
      
      console.log(`⭐ Score Calculation:`);
      console.log(`- Sentence average: ${sentenceAvg.toFixed(2)}`);
      console.log(`- Word average: ${wordAvg.toFixed(2)}`);
      
      // 70% sentence-level, 30% word-level
      overallScore = Math.round(sentenceAvg * 0.7 + wordAvg * 0.3);
      
      console.log(`- Final score: ${sentenceAvg.toFixed(2)} * 0.7 + ${wordAvg.toFixed(2)} * 0.3 = ${overallScore}`);
    } else {
      console.log(`❌ Overall score is 0 because no samples had valid confidence scores`);
    }

    console.log(`⭐ Analysis complete. Overall score: ${overallScore}/100`);

    // Generate feedback based on score
    const feedback = generateFeedback(overallScore, scenarioTitle || 'conversation');

    return res.status(200).json({
      success: true,
      overallScore,
      feedback,
      samplesAnalyzed: scores.length
    });

  } catch (error) {
    console.error('⭐ Azure analytics error:', error);
    console.error('⭐ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return res.status(500).json({
      success: false,
      error: 'Failed to process speech analysis'
    });
  }
}