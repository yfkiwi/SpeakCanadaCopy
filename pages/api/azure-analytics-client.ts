// pages/api/azure-analytics-client.ts
import type { NextApiRequest, NextApiResponse } from 'next';

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

// Direct Azure STT analysis (no FFmpeg conversion needed - audio pre-processed)
async function analyzeWithAzure(wavData: string): Promise<{ recognizedText: string; confidence: number; wordConfidences: number[] }> {
  try {
    const accessToken = await getAzureToken();
    const wavBuffer = Buffer.from(wavData, 'base64');

    // Debug audio format
    console.log('🔍 Audio sample info:', {
      size: wavData.length,
      header: wavData.substring(0, 20), // Check WAV file header
      isBase64: /^[A-Za-z0-9+/]*={0,2}$/.test(wavData)
    });

    // Decode base64 to check actual bytes
    console.log('🔍 Decoded audio info:', {
      byteLength: wavBuffer.length,
      firstBytes: Array.from(wavBuffer.slice(0, 16)).map(b => b.toString(16)),
      hasWAVHeader: wavBuffer.slice(0, 4).toString() === 'RIFF',
      wavHeader: wavBuffer.slice(0, 12).toString()
    });

    const sttResponse = await fetch(
      `https://${serviceRegion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'audio/wav',
          'Accept': 'application/json',
        },
        body: wavBuffer,
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
    
    const wordConfidences: number[] = [];
    if (result.NBest && result.NBest.length > 0 && result.NBest[0].Words) {
      result.NBest[0].Words.forEach((word: any) => {
        if (word.Confidence !== undefined) {
          wordConfidences.push(word.Confidence * 100); // Convert to 0-100 scale
        }
      });
    }

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

    console.log(`⭐ Processing ${audioSamples.length} pre-processed audio samples for analysis...`);

    // Process each pre-converted WAV audio sample
    const scores: number[] = [];
    const confidences: number[] = [];
    const recognizedTexts: string[] = [];
    
    // Process samples in parallel to avoid Netlify timeout
    // Limit to 3 samples max to avoid overwhelming Azure API
    const maxSamples = Math.min(3, audioSamples.length);
    const samplesToProcess = audioSamples.slice(0, maxSamples);
    
    console.log(`⭐ Processing ${samplesToProcess.length} selected samples (from ${audioSamples.length} total)...`);
    
    const analysisPromises = samplesToProcess.map(async (sample: { wavData: string; transcript: string }, index: number) => {
      console.log(`⭐ Analyzing sample ${index + 1}/${samplesToProcess.length}...`);
      
      try {
        const azureResult = await analyzeWithAzure(sample.wavData);
        
        return {
          index,
          recognizedText: azureResult.recognizedText,
          confidence: azureResult.confidence,
          wordConfidences: azureResult.wordConfidences,
          originalTranscript: sample.transcript
        };
      } catch (error) {
        console.error(`Sample ${index + 1} analysis failed:`, error);
        return {
          index,
          recognizedText: '',
          confidence: 0,
          wordConfidences: [],
          originalTranscript: sample.transcript
        };
      }
    });

    // Wait for all analyses to complete (or timeout after 20 seconds for Netlify)
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Analysis timeout')), 20000)
    );

    let analysisResults;
    try {
      analysisResults = await Promise.race([
        Promise.allSettled(analysisPromises),
        timeoutPromise
      ]);
    } catch (timeoutError) {
      console.warn('Analysis timed out, using fallback feedback');
      return res.status(200).json({
        success: true,
        overallScore: 50, // Default score
        feedback: generateFeedback(50, scenarioTitle || 'conversation'),
        samplesAnalyzed: 0
      });
    }

    // Process results
    analysisResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.confidence > 0) {
        scores.push(result.value.confidence);
        recognizedTexts.push(result.value.recognizedText);
        
        // Include word-level confidences for more detailed analysis
        if (result.value.wordConfidences.length > 0) {
          confidences.push(...result.value.wordConfidences);
        }
        
        console.log(`✅ Sample ${result.value.index + 1} analyzed - Text: "${result.value.recognizedText}", Confidence: ${result.value.confidence}`);
      } else {
        console.log(`❌ Sample analysis failed or low confidence`);
      }
    });

    console.log(`⭐ Analysis Summary:`);
    console.log(`- Total samples received: ${audioSamples.length}`);
    console.log(`- Samples processed: ${samplesToProcess.length}`);
    console.log(`- Samples with valid confidence: ${scores.length}`);
    console.log(`- Sentence-level scores: [${scores.join(', ')}]`);
    console.log(`- Word-level confidences count: ${confidences.length}`);

    // Calculate overall score
    let overallScore = 0;
    if (scores.length > 0) {
      // Weighted average: sentence-level scores get more weight
      const sentenceAvg = scores.reduce((a, b) => a + b) / scores.length;
      const wordAvg = confidences.length > 0 ? 
        confidences.reduce((a, b) => a + b) / confidences.length : sentenceAvg;
      
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