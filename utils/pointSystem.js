// Point system for scenario completion
// Each scenario has a maximum of 10 points
// Points are awarded for different activities

export const POINT_SYSTEM = {
  // Survey points (1 point) - NEW
  SURVEY: {
    PRE_SURVEY_COMPLETION: 1, // Complete pre-survey when starting scenario
  },
  
  // Video points (2 points)
  VIDEO: {
    WATCH_COMPLETE: 2, // Watch all videos in scenario
  },
  
  // Vocabulary points (6 points total) - MODIFIED
  VOCABULARY: {
    FLASHCARD_COMPLETION: 2, // Complete all flashcards via completion button
    GLOSSARY_EXPLORATION: 2, // Complete word list via completion button
    EXPRESSIONS_EXPLORATION: 2, // Complete expressions via completion button
  },
  
  // Roleplay points (2 points)
  ROLEPLAY: {
    COMPLETE_CONVERSATION: 2, // Finish a full roleplay session
  },
  
  // Quiz points (1 point) - MODIFIED to accommodate new survey point
  QUIZ: {
    SCENARIO_QUIZ: 1, // Complete the final scenario quiz (reduced from 2 to 1)
  }
};

// Calculate total points for a scenario
export const calculateTotalPoints = (roleplayPoints = 0, vocabularyPoints = 0, videoPoints = 0, surveyPoints = 0, quizPoints = 0) => {
  return Math.min(roleplayPoints + vocabularyPoints + videoPoints + surveyPoints + quizPoints, 10);
};

// Check if scenario is completed (10/10 points)
export const isScenarioCompleted = (totalPoints) => {
  return totalPoints >= 10;
};

// Get progress percentage
export const getProgressPercentage = (totalPoints) => {
  return Math.min((totalPoints / 10) * 100, 100);
};

// Award points for survey completion - NEW FUNCTION
export const awardSurveyPoints = async (userId, scenarioId, supabase) => {
  try {
    // Get current progress
    const { data: currentProgress, error: progressError } = await supabase
      .from('user_scenarios_progress')
      .select('progress, status')
      .eq('user_id', userId)
      .eq('scenario_id', scenarioId)
      .single();

    // Handle case where no progress record exists yet
    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error fetching progress:', progressError);
      return { success: false, error: progressError.message };
    }

    let currentPoints = currentProgress?.progress || 0;
    let newPoints = Math.min(currentPoints + POINT_SYSTEM.SURVEY.PRE_SURVEY_COMPLETION, 10);
    let status = currentProgress?.status || 'ongoing';

    // Update status if completed
    if (newPoints >= 10 && status !== 'completed') {
      status = 'completed';
    }

    let error;
    
    if (currentProgress) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('user_scenarios_progress')
        .update({
          progress: newPoints,
          status: status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('user_id', userId)
        .eq('scenario_id', scenarioId);
      error = updateError;
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('user_scenarios_progress')
        .insert({
          user_id: userId,
          scenario_id: scenarioId,
          progress: newPoints,
          status: status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        });
      error = insertError;
    }

    if (error) {
      console.error('Error updating survey points:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      points: newPoints,
      status: status,
      isCompleted: status === 'completed'
    };
  } catch (error) {
    console.error('Error awarding survey points:', error);
    return { success: false, error: error.message };
  }
};

// Award points for roleplay activities (unchanged)
export const awardRoleplayPoints = async (userId, scenarioId, activity, supabase) => {
  try {
    // Get current progress
    const { data: currentProgress, error: progressError } = await supabase
      .from('user_scenarios_progress')
      .select('progress, status')
      .eq('user_id', userId)
      .eq('scenario_id', scenarioId)
      .single();

    // Handle case where no progress record exists yet
    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error fetching progress:', progressError);
      return { success: false, error: progressError.message };
    }

    let currentPoints = currentProgress?.progress || 0;
    let newPoints = currentPoints;
    let status = currentProgress?.status || 'ongoing';

    // Award points based on activity
    switch (activity) {
      case 'complete_conversation':
        newPoints = Math.min(currentPoints + POINT_SYSTEM.ROLEPLAY.COMPLETE_CONVERSATION, 10);
        break;
      default:
        return { success: false, error: 'Invalid activity' };
    }

    // Update status if completed
    if (newPoints >= 10 && status !== 'completed') {
      status = 'completed';
    }

    let error;
    
    if (currentProgress) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('user_scenarios_progress')
        .update({
          progress: newPoints,
          status: status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('user_id', userId)
        .eq('scenario_id', scenarioId);
      error = updateError;
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('user_scenarios_progress')
        .insert({
          user_id: userId,
          scenario_id: scenarioId,
          progress: newPoints,
          status: status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        });
      error = insertError;
    }

    if (error) {
      console.error('Error updating points:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      points: newPoints,
      status: status,
      isCompleted: status === 'completed'
    };
  } catch (error) {
    console.error('Error awarding points:', error);
    return { success: false, error: error.message };
  }
};

// Award points for vocabulary activities - MODIFIED to be manual only
export const awardVocabularyPoints = async (userId, scenarioId, activity, supabase) => {
  try {
    const { data: currentProgress, error: progressError } = await supabase
      .from('user_scenarios_progress')
      .select('progress, status')
      .eq('user_id', userId)
      .eq('scenario_id', scenarioId)
      .single();

    // Handle case where no progress record exists yet
    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error fetching progress:', progressError);
      return { success: false, error: progressError.message };
    }

    let currentPoints = currentProgress?.progress || 0;
    let newPoints = currentPoints;
    let status = currentProgress?.status || 'ongoing';

    switch (activity) {
      case 'flashcard_completion':
        newPoints = Math.min(currentPoints + POINT_SYSTEM.VOCABULARY.FLASHCARD_COMPLETION, 10);
        break;
      case 'glossary_exploration':
        newPoints = Math.min(currentPoints + POINT_SYSTEM.VOCABULARY.GLOSSARY_EXPLORATION, 10);
        break;
      case 'expressions_exploration':
        newPoints = Math.min(currentPoints + POINT_SYSTEM.VOCABULARY.EXPRESSIONS_EXPLORATION, 10);
        break;
      default:
        return { success: false, error: 'Invalid activity' };
    }

    if (newPoints >= 10 && status !== 'completed') {
      status = 'completed';
    }

    let error;
    
    if (currentProgress) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('user_scenarios_progress')
        .update({
          progress: newPoints,
          status: status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('user_id', userId)
        .eq('scenario_id', scenarioId);
      error = updateError;
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('user_scenarios_progress')
        .insert({
          user_id: userId,
          scenario_id: scenarioId,
          progress: newPoints,
          status: status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        });
      error = insertError;
    }

    if (error) {
      console.error('Error updating vocabulary points:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      points: newPoints,
      status: status,
      isCompleted: status === 'completed'
    };
  } catch (error) {
    console.error('Error awarding vocabulary points:', error);
    return { success: false, error: error.message };
  }
};

// Award points for video activities (unchanged)
export const awardVideoPoints = async (userId, scenarioId, supabase) => {
  try {
    const { data: currentProgress, error: progressError } = await supabase
      .from('user_scenarios_progress')
      .select('progress, status')
      .eq('user_id', userId)
      .eq('scenario_id', scenarioId)
      .single();

    // Handle case where no progress record exists yet
    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error fetching progress:', progressError);
      return { success: false, error: progressError.message };
    }

    let currentPoints = currentProgress?.progress || 0;
    let newPoints = Math.min(currentPoints + POINT_SYSTEM.VIDEO.WATCH_COMPLETE, 10);
    let status = currentProgress?.status || 'ongoing';

    if (newPoints >= 10 && status !== 'completed') {
      status = 'completed';
    }

    let error;
    
    if (currentProgress) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('user_scenarios_progress')
        .update({
          progress: newPoints,
          status: status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('user_id', userId)
        .eq('scenario_id', scenarioId);
      error = updateError;
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('user_scenarios_progress')
        .insert({
          user_id: userId,
          scenario_id: scenarioId,
          progress: newPoints,
          status: status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        });
      error = insertError;
    }

    if (error) {
      console.error('Error updating video points:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      points: newPoints,
      status: status,
      isCompleted: status === 'completed'
    };
  } catch (error) {
    console.error('Error awarding video points:', error);
    return { success: false, error: error.message };
  }
};

// Award points for quiz activities - MODIFIED (reduced from 2 to 1 point)
export const awardQuizPoints = async (userId, scenarioId, supabase) => {
  try {
    const { data: currentProgress, error: progressError } = await supabase
      .from('user_scenarios_progress')
      .select('progress, status')
      .eq('user_id', userId)
      .eq('scenario_id', scenarioId)
      .single();

    // Handle case where no progress record exists yet
    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error fetching progress:', progressError);
      return { success: false, error: progressError.message };
    }

    let currentPoints = currentProgress?.progress || 0;
    let newPoints = Math.min(currentPoints + POINT_SYSTEM.QUIZ.SCENARIO_QUIZ, 10);
    let status = currentProgress?.status || 'ongoing';

    if (newPoints >= 10 && status !== 'completed') {
      status = 'completed';
    }

    let error;
    
    if (currentProgress) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('user_scenarios_progress')
        .update({
          progress: newPoints,
          status: status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('user_id', userId)
        .eq('scenario_id', scenarioId);
      error = updateError;
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('user_scenarios_progress')
        .insert({
          user_id: userId,
          scenario_id: scenarioId,
          progress: newPoints,
          status: status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        });
      error = insertError;
    }

    if (error) {
      console.error('Error updating quiz points:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      points: newPoints,
      status: status,
      isCompleted: status === 'completed'
    };
  } catch (error) {
    console.error('Error awarding quiz points:', error);
    return { success: false, error: error.message };
  }
};