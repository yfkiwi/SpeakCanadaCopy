import { supabase } from '../lib/supabaseClient'; // 你的supabase客户端

export async function saveVocabularyToLibrary(vocabularyData) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    const dataToSave = {
      user_id: session.user.id,
      ...vocabularyData,
      created_at: new Date().toISOString()
    };

    // Fix 406 error by ensuring proper data format
    const { data, error } = await supabase
      .from('user_vocabulary_library')
      .insert([dataToSave])  // Wrap in array for consistency
      .select();  // Return the inserted data

    if (error) {
      throw error;
    }

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error saving vocabulary:', error);
    throw error;
  }
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
    .limit(1);

  if (error) {
    console.error('Error checking vocabulary:', error);
    throw error;
  }

  return data && data.length > 0;
}