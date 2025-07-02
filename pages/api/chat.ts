// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { message, scenario, scenarioTitle, scenarioContext, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    // Construct a prompt based on the scenario
    let systemPrompt = `You are a friendly Canadian English conversation partner helping someone practice in a scenario: "${scenarioTitle || 'Conversation Practice'}". 
    
${scenarioContext || ''}

Use natural Canadian expressions when appropriate. Be friendly, helpful, and concise. Your responses should be 1-3 sentences at most to keep the conversation flowing naturally. If the user makes grammar or vocabulary mistakes, occasionally and gently correct them as a helpful language partner would.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        ...history,
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    return res.status(200).json({ 
      success: true, 
      response: completion.choices[0].message.content 
    });
  } catch (error) {
    console.error('OpenAI Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to get response from AI' 
    });
  }
}