// pages/api/enhanced-chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Generate dynamic role and system prompt based on scenario
const generateRoleAndPrompt = (title: string, context: string): { role: string; systemPrompt: string } => {
  const titleLower = title.toLowerCase();
  
  // Tim Hortons / Coffee scenarios
  if (titleLower.includes('tim hortons') || titleLower.includes('coffee')) {
    return {
      role: 'Tim Hortons employee',
      systemPrompt: `You are a friendly Tim Hortons employee working at the counter. 

${context}

IMPORTANT INSTRUCTIONS:
- Respond naturally as a real Tim Hortons worker would in real life
- Know the menu items: Double-Double (coffee with 2 cream, 2 sugar), Timbits (donut holes), Large Regular (large coffee with 1 cream, 1 sugar)
- Be helpful with menu questions and take orders efficiently
- Use typical Canadian Tim Hortons expressions like "What can I get started for you?" or "Would you like that for here or to go?"
- Keep responses concise (1-3 sentences) as in real service interactions
- Stay completely in character as a Tim Hortons employee
- Just have a normal coffee shop interaction`
    };
  }
  
  // Default for other scenarios
  return {
    role: titleLower.includes('restaurant') ? 'restaurant server' :
          titleLower.includes('bank') ? 'bank teller' :
          titleLower.includes('apartment') ? 'landlord' :
          titleLower.includes('transit') ? 'transit helper' :
          'conversation partner',
    systemPrompt: `You are roleplaying as a person in this scenario: "${title}".
    
${context}

IMPORTANT INSTRUCTIONS:
- Respond naturally as a real person in this situation would in real life
- Stay completely in character at all times
- Keep responses concise (1-3 sentences) as in real conversations
- Use natural expressions appropriate for your role
- NEVER comment on the other person's English skills or pronunciation
- Do NOT act like a language tutor
- Just have a normal conversation as if you're really in this scenario
- If you don't understand something, respond as a real person would by asking for clarification naturally`
  };
};

type ChatResponse = {
  success: boolean;
  response?: string;
  audioUrl?: string;
  error?: string;
  transcript?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ChatResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { 
      transcript, 
      scenario, 
      scenarioTitle, 
      scenarioContext, 
      userId, 
      history = []
    } = req.body;

    if (!transcript) {
      return res.status(400).json({ success: false, error: 'Transcript is required' });
    }

    // Generate dynamic role and system prompt based on scenario
    const { role, systemPrompt } = generateRoleAndPrompt(scenarioTitle, scenarioContext);

    // Get GPT response
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
          content: transcript
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content;

    // Background progress update - run async to not block response
    if (userId) {
      (async () => {
        try {
          const { data: currentProgress } = await supabase.from('progress')
            .select('percent, good_attempts')
            .eq('user_id', userId)
            .eq('scenario_id', scenario)
            .single();

          const currentGoodAttempts = currentProgress?.good_attempts || 0;
          const newGoodAttempts = currentGoodAttempts + 1;
          const newPercent = Math.min(newGoodAttempts, 100);

          await supabase.from('progress').upsert({
            user_id: userId,
            scenario_id: scenario,
            percent: newPercent,
            good_attempts: newGoodAttempts
          });
        } catch (error) {
          console.error('Progress update error:', error);
        }
      })();
    }

    return res.status(200).json({
      success: true,
      response: reply,
      transcript: transcript
    });

  } catch (error) {
    console.error('Enhanced chat error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process request'
    });
  }
}