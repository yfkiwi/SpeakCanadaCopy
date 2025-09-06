import { supabase } from '../lib/supabaseClient'; // 你的supabase客户端

export async function saveVocabularyToLibrary(vocabularyData) {
  // 获取当前用户
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('User not logged in');
  }

  const { data, error } = await supabase
    .from('user_vocabulary_library')
    .insert([{
      user_id: session.user.id,
      term: vocabularyData.term,
      definition: vocabularyData.definition,
      cultural_note: vocabularyData.cultural_note,
      source: 'custom',
      scenario_key: null
    }]);

  if (error) {
    console.error('Error saving vocabulary:', error);
    throw error;
  }

  return data;
}

export async function checkVocabularyExists(term) {
  // 获取当前用户
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('User not logged in');
  }

  const { data, error } = await supabase
    .from('user_vocabulary_library')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('term', term.toLowerCase())
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking vocabulary:', error);
    throw error;
  }

  return !!data;
}