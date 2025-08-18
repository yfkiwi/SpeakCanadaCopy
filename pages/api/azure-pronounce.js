// This file will: [backend API handler for Azure pronunciation scoring]

// Accept audio uploaded from the frontend (WebM format).
// Convert it to WAV using ffmpeg.
// Send it to Azure for scoring.
// Return feedback to the frontend.

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Update below Azure Speech Key and Region into your .env.local file.
const speechKey = process.env.AZURE_SPEECH_KEY;
const serviceRegion = process.env.AZURE_SPEECH_REGION;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { audioData, text, mode } = req.body;
    if (!audioData || (mode === 'assessment' && !text)) {
      return res.status(400).json({ error: 'Audio data and reference text are required' });
    }

    // Convert base64 audio to buffer
    const audioBuffer = Buffer.from(audioData, 'base64');
    // Create temporary files
    const tempDir = '/tmp';
    const inputFile = path.join(tempDir, `input_${Date.now()}.webm`);
    const outputFile = path.join(tempDir, `output_${Date.now()}.wav`);
    fs.writeFileSync(inputFile, audioBuffer);
    // Convert WebM to WAV using ffmpeg
    try {
      await execAsync(`ffmpeg -i ${inputFile} -acodec pcm_s16le -ar 16000 -ac 1 ${outputFile} -y`);
    } catch (error) {
      console.error('FFmpeg conversion error:', error);
      return res.status(500).json({ error: 'Audio conversion failed' });
    }
    // Read the converted WAV file
    const wavBuffer = fs.readFileSync(outputFile);
    // Clean up temporary files
    fs.unlinkSync(inputFile);
    fs.unlinkSync(outputFile);

    let result;
    if (mode === 'assessment') {
      // Call both REST API and SDK in parallel
      const [sttResult, paResult] = await Promise.all([
        transcribeWithAzure(wavBuffer),
        assessPronunciationWithSDK(wavBuffer, text)
      ]);
      // Use recognizedText from REST, scores from SDK
      result = {
        ...paResult,
        recognizedText: sttResult.recognizedText
      };
    } else {
      result = await transcribeWithAzure(wavBuffer);
    }
    res.status(200).json(result);
  } catch (error) {
    console.error('Error processing pronunciation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function assessPronunciationWithSDK(wavBuffer, referenceText) {
  const sdk = require('microsoft-cognitiveservices-speech-sdk');
  return new Promise((resolve, reject) => {
    const pushStream = sdk.AudioInputStream.createPushStream();
    pushStream.write(wavBuffer);
    pushStream.close();

    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
    const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, serviceRegion);
    speechConfig.speechRecognitionLanguage = 'en-US';

    // Set up pronunciation assessment config
    const pronConfig = new sdk.PronunciationAssessmentConfig(
      referenceText,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Phoneme,
      true // Enable miscue
    );

    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    pronConfig.applyTo(recognizer);

    recognizer.recognizeOnceAsync(result => {
      if (result.reason === sdk.ResultReason.RecognizedSpeech) {
        let paResult = sdk.PronunciationAssessmentResult.fromResult(result);
        resolve({
          overallScore: paResult.pronunciationScore,
          accuracyScore: paResult.accuracyScore,
          fluencyScore: paResult.fluencyScore,
          completenessScore: paResult.completenessScore,
          pronunciationScore: paResult.pronunciationScore,
          referenceText: referenceText,
          feedback: generateFeedback(paResult.pronunciationScore),
          details: paResult,
        });
      } else {
        reject(new Error(result.errorDetails || 'Speech not recognized'));
      }
    }, err => {
      reject(err);
    });
  });
}

async function transcribeWithAzure(wavBuffer) {
  // Get an access token
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
  const accessToken = await tokenResponse.text();

  // Call the speech-to-text API
  const sttResponse = await fetch(`https://${serviceRegion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'audio/wav',
      'Accept': 'application/json',
    },
    body: wavBuffer,
  });
  if (!sttResponse.ok) {
    const errorText = await sttResponse.text();
    throw new Error(`Azure STT API error: ${sttResponse.status} - ${errorText}`);
  }
  const result = await sttResponse.json();
  return {
    recognizedText: result.DisplayText || '',
  };
}

function generateFeedback(score) {
  if (score >= 90) {
    return "Excellent pronunciation! Your speech is very clear and accurate. Keep up the great work!";
  } else if (score >= 80) {
    return "Good pronunciation! You're doing well, with minor areas for improvement. Focus on word stress and intonation.";
  } else if (score >= 70) {
    return "Fair pronunciation. Focus on clarity, word stress, and speaking at a moderate pace.";
  } else if (score >= 60) {
    return "Keep practicing! Focus on basic pronunciation patterns and try to speak more clearly.";
  } else {
    return "More practice needed. Focus on basic pronunciation, speak slowly and clearly, and listen to native speakers.";
  }
}







