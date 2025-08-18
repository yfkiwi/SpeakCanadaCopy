// pages/api/random-slang.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

type SlangResponse = {
  success: boolean;
  slang?: {
    term: string;
    ipa_pronunciation?: string;
    definition: string;
    example_sentence: string;
    cultural_note?: string;
    difficulty_level?: string;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SlangResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('Fetching random slang...');

    // Method 1: Get count first, then use random offset
    const { count, error: countError } = await supabase
      .from('slangs')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Count error:', countError);
      return res.status(500).json({ success: false, error: 'Failed to count slangs' });
    }

    if (!count || count === 0) {
      return res.status(404).json({ success: false, error: 'No slangs found' });
    }

    console.log(`Found ${count} slangs in database`);

    // Generate random offset
    const randomOffset = Math.floor(Math.random() * count);
    console.log(`Using random offset: ${randomOffset}`);

    // Get slang at random position
    const { data: slangs, error } = await supabase
      .from('slangs')
      .select('term, ipa_pronunciation, definition, example_sentence, cultural_note, difficulty_level')
      .range(randomOffset, randomOffset);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch slang' });
    }

    if (!slangs || slangs.length === 0) {
      console.error('No slang found at offset:', randomOffset);
      return res.status(404).json({ success: false, error: 'No slang found at position' });
    }

    const slang = slangs[0];
    console.log('Successfully fetched slang:', slang.term);

    return res.status(200).json({
      success: true,
      slang: {
        term: slang.term,
        ipa_pronunciation: slang.ipa_pronunciation,
        definition: slang.definition,
        example_sentence: slang.example_sentence,
        cultural_note: slang.cultural_note,
        difficulty_level: slang.difficulty_level
      }
    });
  } catch (error) {
    console.error('Random slang API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}