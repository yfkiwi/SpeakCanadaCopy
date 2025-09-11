// pages/api/stt.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const config = { api: { bodyParser: false } };
import { IncomingForm, Files, Fields, File } from 'formidable';
import { createReadStream } from 'fs';
import fs from 'fs';

// Define response type
type ApiResponse = {
  success: boolean;
  transcript?: string;
  error?: string;
};

// Body parsing disabled above

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Parse the form with the audio file
    const form = new IncomingForm({
      keepExtensions: true,
    });

    // Type assertion for formidable's callback
    const formData: [Fields, Files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve([fields, files]);
      });
    });

    const [fields, files] = formData;

    // Access the audio file - using proper type checking
    const audioFiles = files.audio;
    if (!audioFiles || !Array.isArray(audioFiles) || audioFiles.length === 0) {
      return res.status(400).json({ success: false, error: 'No audio file provided' });
    }

    const audioFile = audioFiles[0] as File;
    
    // Create a readable stream from the uploaded file
    const audioPath = audioFile.filepath;
    const audioStream = createReadStream(audioPath);

    // Transcribe the audio
    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: "whisper-1",
      language: "en",
      prompt: "This is a conversation in Canadian English.",
    });

    // Clean up the temp file
    fs.unlinkSync(audioPath);

    return res.status(200).json({
      success: true,
      transcript: transcription.text
    });
  } catch (error) {
    console.error('STT Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to transcribe audio'
    });
  }
}