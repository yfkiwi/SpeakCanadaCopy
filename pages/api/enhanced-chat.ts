// pages/api/enhanced-chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

export const runtime = 'nodejs';
import { createClient } from '@supabase/supabase-js';
import { generateCharacterPrompt } from '../../lib/characterService.mjs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Map scenario titles to character keys
const mapScenarioToCharacterKey = (scenarioTitle: string): string => {
  const titleLower = scenarioTitle.toLowerCase();
  
  // Tim Hortons scenarios
  if (titleLower.includes('tim hortons') || titleLower.includes('coffee shop') || titleLower.includes('order coffee')) {
    return 'tim_hortons';
  }
  
  // Restaurant scenarios - determine type
  if (titleLower.includes('restaurant') || titleLower.includes('dining')) {
    if (titleLower.includes('fast') || titleLower.includes('quick') || 
        titleLower.includes('mcdonald') || titleLower.includes('subway')) {
      return 'restaurant_fast';
    } else if (titleLower.includes('fine') || titleLower.includes('upscale') || 
               titleLower.includes('formal')) {
      return 'restaurant_fine';
    } else {
      return 'restaurant_casual'; // Default to casual
    }
  }
  
  // Gym scenarios
  if (titleLower.includes('gym') || titleLower.includes('fitness')) {
    if (titleLower.includes('trainer') || titleLower.includes('personal') || 
        titleLower.includes('workout')) {
      return 'gym_trainer';
    } else {
      return 'gym_front_desk'; // Default to front desk
    }
  }
  
  // Campus scenarios
  if (titleLower.includes('campus') || titleLower.includes('university') || 
      titleLower.includes('college') || titleLower.includes('professor') || 
      titleLower.includes('office hours') || titleLower.includes('academic') ||
      titleLower.includes('talk to campus staff')) {
    return 'campus';
  }
  
  // Directions scenarios
  if (titleLower.includes('direction') || titleLower.includes('navigate') || 
      titleLower.includes('find') || titleLower.includes('location') ||
      titleLower.includes('way to') || titleLower.includes('campus directions') ||
      titleLower.includes('public transportation')) {
    return 'directions';
  }
  
  // Shopping scenarios
  if (titleLower.includes('shop') || titleLower.includes('store') || 
      titleLower.includes('mall') || titleLower.includes('buy') ||
      titleLower.includes('purchase') || titleLower.includes('go shopping')) {
    return 'shopping';
  }

  // Doctor/Medical scenarios
  if (titleLower.includes('doctor') || titleLower.includes('medical') ||
      titleLower.includes('clinic') || titleLower.includes('visit doctor')) {
    return 'campus'; // Use campus staff for now, could create medical character later
  }

  // Library scenarios
  if (titleLower.includes('library')) {
    return 'campus';
  }
  
  // Default fallback
  return 'directions'; // Use directions as general helpful person
};

type ChatResponse = {
  success: boolean;
  response?: string;
  audioUrl?: string;
  error?: string;
  transcript?: string;
  characterInfo?: any;
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

    // Map scenario title to character key
    const characterKey = mapScenarioToCharacterKey(scenarioTitle);
    
    // Generate character prompt from database
    const characterData = await generateCharacterPrompt(characterKey);
    
    if (!characterData) {
      // Fallback to simple prompt if character not found
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a helpful Canadian person in this scenario: "${scenarioTitle}". Be friendly, natural, and use Canadian expressions. Keep responses to 1-3 sentences. If you need to correct English mistakes, do it naturally like: "Oh, you mean a large coffee? Sure thing!"`
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

      return res.status(200).json({
        success: true,
        response: completion.choices[0].message.content,
        transcript: transcript
      });
    }

    // Get GPT response using character-specific prompt
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: characterData.systemPrompt
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
      transcript: transcript,
      characterInfo: {
        characterName: characterData.role,
        timeContext: characterData.timeContext,
        correctionStyle: characterData.characterData.correctionStyle,
        characterKey: characterKey
      }
    });

  } catch (error) {
    console.error('Enhanced chat error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process request'
    });
  }
}