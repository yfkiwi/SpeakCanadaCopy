// pages/api/stt-serverless.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

type ApiResponse = {
  success: boolean;
  transcript?: string;
  error?: string;
};

// Configure for larger file uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

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
    // Check if we have the required API key
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'OpenAI API key not configured' 
      });
    }

    // For serverless environments, we need to handle file uploads differently
    // This would typically require the frontend to send the audio as base64 or use a different approach
    
    // For now, let's return a message indicating the endpoint is working
    // but needs proper file upload implementation
    return res.status(200).json({
      success: false,
      error: 'File upload not implemented for serverless environment. Consider using client-side speech recognition or a different file upload approach.'
    });

  } catch (error) {
    console.error('STT Serverless Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process request'
    });
  }
}