// lib/characterService.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Get random element from array
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Randomly choose busy or slow context
function getRandomTimeContext() {
  return Math.random() < 0.5 ? 'busy' : 'slow';
}

// Get character data and generate dynamic prompt
export async function generateCharacterPrompt(scenarioKey) {
  try {
    // Get character profile
    const { data: character, error: characterError } = await supabase
      .from('character_profiles')
      .select('*')
      .eq('scenario_key', scenarioKey)
      .single();

    if (characterError) {
      console.error('Character not found:', characterError);
      return null;
    }

    // Get personality traits
    const { data: traits, error: traitsError } = await supabase
      .from('personality_traits')
      .select('*')
      .eq('character_id', character.id);

    if (traitsError) {
      console.error('Error fetching traits:', traitsError);
      return null;
    }

    // Get Canadian expressions
    const { data: expressions, error: expressionsError } = await supabase
      .from('canadian_expressions')
      .select('*')
      .eq('character_id', character.id);

    if (expressionsError) {
      console.error('Error fetching expressions:', expressionsError);
      return null;
    }

    // Get response patterns (randomly choose busy or slow)
    const timeContext = getRandomTimeContext();
    const { data: patterns, error: patternsError } = await supabase
      .from('response_patterns')
      .select('*')
      .eq('character_id', character.id)
      .eq('time_context', timeContext);

    if (patternsError) {
      console.error('Error fetching patterns:', patternsError);
      return null;
    }

    // Build personality description
    const personalityMap = {};
    traits.forEach(trait => {
      personalityMap[trait.trait_type] = trait.trait_value;
    });

    // Build expressions map
    const expressionsMap = {};
    expressions.forEach(expr => {
      try {
        expressionsMap[expr.expression_category] = JSON.parse(expr.phrases);
      } catch (error) {
        console.error('JSON parse error for expression:', expr.expression_category, expr.phrases);
        expressionsMap[expr.expression_category] = []; // 默认空数组
      }
    });

    // Build response patterns map
    const patternsMap = {};
    patterns.forEach(pattern => {
      try {
        patternsMap[pattern.situation_type] = {
          templates: JSON.parse(pattern.response_templates),
          avg_sentence_count: pattern.avg_sentence_count,
          includes_questions: pattern.includes_questions
        };
      } catch (error) {
        console.error('JSON parse error for pattern:', pattern.situation_type, pattern.response_templates);
        patternsMap[pattern.situation_type] = {
          templates: [],
          avg_sentence_count: 2,
          includes_questions: false
        };
      }
    });

    // Generate comprehensive system prompt
    const systemPrompt = buildSystemPrompt(character, personalityMap, expressionsMap, patternsMap, timeContext);

    return {
      role: character.character_name,
      systemPrompt,
      timeContext,
      characterData: {
        personality: personalityMap,
        expressions: expressionsMap,
        patterns: patternsMap,
        correctionStyle: character.correction_style
      }
    };

  } catch (error) {
    console.error('Error generating character prompt:', error);
    return null;
  }
}

// Build comprehensive system prompt
function buildSystemPrompt(character, personality, expressions, patterns, timeContext) {
  const contextDescription = timeContext === 'busy' ? 
    'It is currently a busy time, so you respond more quickly and concisely.' :
    'It is currently a slower time, so you can be more conversational and detailed.';

  // Get example expressions for prompt
  const greetingExamples = expressions.greetings ? expressions.greetings.join(', ') : '';
  const transitionExamples = expressions.transitions ? expressions.transitions.join(', ') : '';
  const confirmationExamples = expressions.confirmations ? expressions.confirmations.join(', ') : '';

  return `${character.base_prompt_template}

CURRENT CONTEXT: ${contextDescription}

PERSONALITY TRAITS:
- Formality: ${personality.formality_level || 'casual'}
- Energy: ${personality.energy_level || 'medium'} 
- Chattiness: ${personality.chattiness || 'moderate'}
- Service Pace: ${personality.service_pace || 'normal'}

CANADIAN EXPRESSIONS TO USE:
- Greetings: ${greetingExamples}
- Transitions: ${transitionExamples}
- Confirmations: ${confirmationExamples}

RESPONSE GUIDELINES:
- Keep responses ${timeContext === 'busy' ? '1-2 sentences' : '2-4 sentences'} maximum
- Use natural Canadian expressions from the examples above
- Stay completely in character as a real ${character.character_name}
- If you need to correct English mistakes, use the "${character.correction_style}" style
- For corrections, respond naturally first, then gently clarify. Example: "Oh, you mean a large coffee? Sure thing!"
- NEVER comment on someone's English skills or act like a language tutor
- Just have a natural conversation as if you're really in this workplace

CORRECTION EXAMPLES:
- If they say "I want big coffee" → "Oh, you mean a large coffee? Coming right up!"
- If they say "Where is bathroom?" → "Oh, the washroom? It's just down the hall there."
- If they say unclear something → "Sorry, what was that?" or "Can you repeat that?"

Remember: You are a real ${character.character_name} during ${timeContext === 'busy' ? 'busy' : 'slow'} time. Act natural and authentic!`;
}

// Get character opening message
export async function getCharacterOpening(scenarioKey) {
  try {
    const { data: character, error: characterError } = await supabase
      .from('character_profiles')
      .select('id')
      .eq('scenario_key', scenarioKey)
      .single();

    if (characterError) return "Hi there! How can I help you?";

    const timeContext = getRandomTimeContext();
    const { data: patterns, error: patternsError } = await supabase
      .from('response_patterns')
      .select('*')
      .eq('character_id', character.id)
      .eq('time_context', timeContext)
      .eq('situation_type', 'opening');

    if (patternsError || !patterns.length) {
      return "Hi there! How can I help you?";
    }

    const templates = JSON.parse(patterns[0].response_templates);
    return getRandomElement(templates);

  } catch (error) {
    console.error('Error getting character opening:', error);
    return "Hi there! How can I help you?";
  }
}