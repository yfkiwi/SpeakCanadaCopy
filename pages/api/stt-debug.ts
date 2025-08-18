// pages/api/stt-debug.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

// Define response type
type ApiResponse = {
  success: boolean;
  transcript?: string;
  error?: string;
  debug?: any;
};

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Debug information
    const debugInfo: any = {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      environment: process.env.NODE_ENV,
      method: req.method,
      headers: Object.keys(req.headers),
      bodyType: typeof req.body,
      contentType: req.headers['content-type'],
    };

    // Test OpenAI connection
    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      
      // Simple test - just check if we can create a client
      debugInfo.openaiClientCreated = true;
    }

    return res.status(200).json({
      success: true,
      transcript: "Debug endpoint working - OpenAI key configured",
      debug: debugInfo
    });
  } catch (error) {
    console.error('STT Debug Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorStack: error instanceof Error ? error.stack : 'No stack trace'
      }
    });
  }
}