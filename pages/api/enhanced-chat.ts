// pages/api/enhanced-chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configure OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Azure Speech config
const speechKey = process.env.AZURE_SPEECH_KEY || '';
const serviceRegion = process.env.AZURE_SPEECH_REGION || 'canadaeast';

type ChatResponse = {
  success: boolean;
  response?: string;
  audioUrl?: string;
  error?: string;
  needsClarification?: boolean;
  transcript?: string;
  confidence?: number;
}

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

// Optimized Azure STT focused on detecting mumbled speech
async function transcribeWithAzureConfidence(wavBuffer: Buffer): Promise<{ recognizedText: string; confidence: number; wordConfidences: number[] }> {
  try {
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

    // Call the speech-to-text API with detailed format
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
      throw new Error('Azure STT API error');
    }

    const result = await sttResponse.json();
    
    // Get overall confidence score
    const confidence = result.NBest && result.NBest.length > 0 ? result.NBest[0].Confidence || 0 : 0;
    const recognizedText = result.DisplayText || '';
    
    // Extract individual word confidences if available
    const wordConfidences: number[] = [];
    if (result.NBest && result.NBest.length > 0 && result.NBest[0].Words) {
      result.NBest[0].Words.forEach((word: any) => {
        if (word.Confidence !== undefined) {
          wordConfidences.push(word.Confidence);
        }
      });
    }

    return {
      recognizedText,
      confidence,
      wordConfidences
    };
  } catch (error) {
    console.error('Azure STT error:', error);
    return { 
      recognizedText: '', 
      confidence: 0,
      wordConfidences: []
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ChatResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { 
      audioData, 
      scenario, 
      scenarioTitle, 
      scenarioContext, 
      userId, 
      history = []
    } = req.body;

    if (!audioData) {
      return res.status(400).json({ success: false, error: 'Audio data is required' });
    }

    // FFmpeg setup
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';

    // 1. Convert base64 audio to buffer and save to temp file
    const audioBuffer = Buffer.from(audioData, 'base64');
    
    // Use Node.js built-in temp directory
    const os = require('os');
    const tempDir = os.tmpdir();
    const inputFile = path.join(tempDir, `input_${Date.now()}.webm`);
    const outputFile = path.join(tempDir, `output_${Date.now()}.wav`);
    fs.writeFileSync(inputFile, audioBuffer);
    
    // 2. Convert WebM to WAV using ffmpeg with optimized settings
    try {
      // -q:a 0 = high quality, -ar 16000 = 16kHz sample rate (good for speech)
      const command = `"${ffmpegPath}" -i "${inputFile}" -acodec pcm_s16le -ar 16000 -ac 1 -q:a 0 "${outputFile}" -y`;
      await execAsync(command);
    } catch (error) {
      console.error('FFmpeg conversion error:', error);
      if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
      return res.status(500).json({ success: false, error: 'Audio conversion failed' });
    }
    
    // 3. Read the converted WAV file
    const wavBuffer = fs.readFileSync(outputFile);
    
    // Clean up temporary files
    fs.unlinkSync(inputFile);
    fs.unlinkSync(outputFile);

    // 4. Transcribe with Azure STT and get confidence scores
    const azureResult = await transcribeWithAzureConfidence(wavBuffer);
    const transcript = azureResult.recognizedText;
    const confidence = azureResult.confidence;
    const wordConfidences = azureResult.wordConfidences;
    
    console.log('Azure transcript:', transcript);
    console.log('Azure confidence:', confidence);
    console.log('Word confidences:', wordConfidences);

    // 5. Advanced speech quality assessment
    // This focuses on detecting mumbled speech and unclear sentences
    let isGoodSpeech = true;
    
    // Check for very low overall confidence
    if (confidence < 0.5) {
      isGoodSpeech = false;
      console.log('Low overall confidence:', confidence);
    }
    
    // Check for empty or too short transcript
    if (!transcript || transcript.trim().length < 2) {
      isGoodSpeech = false;
      console.log('Empty or too short transcript');
    }
    
    // Check for mumbled words (words with very low confidence)
    if (wordConfidences.length > 0) {
      // Count low-confidence words
      const lowConfWords = wordConfidences.filter(conf => conf < 0.4).length;
      const wordCount = wordConfidences.length;
      
      // If more than 30% of words are low confidence, consider it mumbled
      if (wordCount > 2 && (lowConfWords / wordCount) > 0.3) {
        isGoodSpeech = false;
        console.log('Too many low confidence words:', lowConfWords, 'out of', wordCount);
      }
    }

    // 6. Handle response based on speech quality
    if (!isGoodSpeech) {
      // Get appropriate role for scenario
      const { role } = generateRoleAndPrompt(scenarioTitle, scenarioContext);
      
      // Specific clarification phrases based on the role/scenario
      const getClarificationForRole = (role: string): string[] => {
        switch(role.toLowerCase()) {
          case 'tim hortons employee':
            return [
              "Sorry, I didn't catch that. Could you repeat your order please?",
              "Pardon me, it's a bit noisy in here. What would you like to order?",
              "I'm sorry, could you say that again?"
            ];
          case 'doctor':
            return [
              "I didn't quite catch that. Could you repeat what you're experiencing?",
              "Sorry, could you tell me about your symptoms again?",
              "Could you repeat that? I want to make sure I understand correctly."
            ];
          case 'interviewer':
            return [
              "I apologize, could you repeat your answer to that question?",
              "Sorry, would you mind repeating that last part?",
              "I didn't quite catch that. Could you share that again?"
            ];
          default:
            return [
              "Sorry, I didn't catch that. Could you repeat please?",
              "Pardon me, could you say that again?",
              "I'm sorry, I didn't quite hear you. Mind repeating that?",
              "Could you please repeat that?",
              "Sorry, what was that again?"
            ];
        }
      };
      
      // Get clarification phrases for this role
      const clarificationPhrases = getClarificationForRole(role);
      
      // Pick a random clarification phrase
      const clarificationText = clarificationPhrases[Math.floor(Math.random() * clarificationPhrases.length)];
      
      // Generate TTS for clarification
      const speechResponse = await openai.audio.speech.create({
        model: "tts-1",
        voice: "nova",
        input: clarificationText,
        speed: 1.0,
      });
      
      const speechBuffer = Buffer.from(await speechResponse.arrayBuffer());
      
      // Save audio to Supabase storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from('audio-responses')
        .upload(`clarification-${Date.now()}.mp3`, speechBuffer, {
          contentType: 'audio/mpeg',
          upsert: false,
        });
        
      let audioUrl = '';
      if (!storageError && storageData) {
        const { data: urlData } = await supabase.storage
          .from('audio-responses')
          .getPublicUrl(storageData.path);
          
        audioUrl = urlData.publicUrl;
      }
      
      return res.status(200).json({
        success: true,
        response: clarificationText,
        audioUrl: audioUrl,
        needsClarification: true,
        transcript: transcript,
        confidence: confidence
      });
    }
    
    // 7. For good speech, continue with normal conversation flow
    const { role, systemPrompt } = generateRoleAndPrompt(scenarioTitle, scenarioContext);

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
    
    // 8. Generate TTS for the response
    const speechResponse = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: reply,
      speed: 1.0,
    });
    
    const speechBuffer = Buffer.from(await speechResponse.arrayBuffer());
    
    // 9. Save audio to Supabase storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('audio-responses')
      .upload(`response-${Date.now()}.mp3`, speechBuffer, {
        contentType: 'audio/mpeg',
        upsert: false,
      });
      
    let audioUrl = '';
    if (!storageError && storageData) {
      const { data: urlData } = await supabase.storage
        .from('audio-responses')
        .getPublicUrl(storageData.path);
          
      audioUrl = urlData.publicUrl;
    }
    
    // 10. Background progress update
    if (userId && confidence >= 0.7) {
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
      audioUrl: audioUrl,
      needsClarification: false,
      transcript: transcript,
      confidence: confidence
    });
  } catch (error) {
    console.error('Enhanced chat error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process request'
    });
  }
}