// Point system for scenario completion
// Each scenario has a maximum of 10 points
// Points are awarded for different activities

export const POINT_SYSTEM = {
  // Survey points (1 point)
  SURVEY: {
    PRE_SURVEY_COMPLETION: 1, // Complete pre-survey when starting scenario
  },
  
  // Video points (2 points)
  VIDEO: {
    WATCH_COMPLETE: 2, // Watch all videos in scenario
  },
  
  // Vocabulary points (6 points total)
  VOCABULARY: {
    FLASHCARD_COMPLETION: 2, // Complete all flashcards via completion button
    GLOSSARY_EXPLORATION: 2, // Complete word list via completion button
    EXPRESSIONS_EXPLORATION: 2, // Complete expressions via completion button
  },
  
  // Roleplay points (1 point) - REDUCED
  ROLEPLAY: {
    COMPLETE_CONVERSATION: 1, // Finish a full roleplay session
  },
  
  // Quiz points (1 point)
  QUIZ: {
    SCENARIO_QUIZ: 1, // Complete the final scenario quiz
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

// Helper function to get activity points
const getActivityPoints = (activity) => {
  if (activity.startsWith('flashcard_')) return POINT_SYSTEM.VOCABULARY.FLASHCARD_COMPLETION;
  if (activity.startsWith('glossary_')) return POINT_SYSTEM.VOCABULARY.GLOSSARY_EXPLORATION;
  if (activity.startsWith('expressions_')) return POINT_SYSTEM.VOCABULARY.EXPRESSIONS_EXPLORATION;
  if (activity.startsWith('category_')) return POINT_SYSTEM.VOCABULARY.GLOSSARY_EXPLORATION;
  if (activity.startsWith('roleplay_')) return POINT_SYSTEM.ROLEPLAY.COMPLETE_CONVERSATION;
  if (activity.startsWith('video_')) return POINT_SYSTEM.VIDEO.WATCH_COMPLETE;
  if (activity.startsWith('survey_')) return POINT_SYSTEM.SURVEY.PRE_SURVEY_COMPLETION;
  if (activity.startsWith('quiz_')) return POINT_SYSTEM.QUIZ.SCENARIO_QUIZ;
  return 0;
};

// Award points for survey completion
export const awardSurveyPoints = async (userId, scenarioId, supabase) => {
  try {
    // Get current progress with completed_activities
    const { data: currentProgress, error: progressError } = await supabase
      .from('user_scenarios_progress')
      .select('progress, status, completed_activities')
      .eq('user_id', userId)
      .eq('scenario_id', scenarioId)
      .single();

    // Handle case where no progress record exists yet
    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error fetching progress:', progressError);
      return { success: false, error: progressError.message };
    }

    // Check if survey is already completed
    const currentActivities = currentProgress?.completed_activities || {};
    if (currentActivities['survey_pre_survey']) {
      return { 
        success: false, 
        error: 'Survey already completed',
        points: currentProgress?.progress || 0,
        isAlreadyCompleted: true
      };
    }

    let currentPoints = currentProgress?.progress || 0;
    let newPoints = Math.min(currentPoints + POINT_SYSTEM.SURVEY.PRE_SURVEY_COMPLETION, 10);
    let status = currentProgress?.status || 'ongoing';

    // Update status if completed
    if (newPoints >= 10 && status !== 'completed') {
      status = 'completed';
    }

    // Update completed_activities
    const updatedActivities = {
      ...currentActivities,
      'survey_pre_survey': true
    };

    // Use upsert to avoid data loss
    const { error } = await supabase
      .from('user_scenarios_progress')
      .upsert({
        user_id: userId,
        scenario_id: scenarioId,
        progress: newPoints,
        status: status,
        completed_activities: updatedActivities,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,scenario_id'
      });

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

// Award points for vocabulary activities - UPDATED with new data structure
export const awardVocabularyPoints = async (userId, scenarioId, activity, supabase) => {
  try {
    // Get current progress with completed_activities
    const { data: currentProgress, error: progressError } = await supabase
      .from('user_scenarios_progress')
      .select('progress, status, completed_activities')
      .eq('user_id', userId)
      .eq('scenario_id', scenarioId)
      .single();

    // Handle case where no progress record exists yet
    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error fetching progress:', progressError);
      return { success: false, error: progressError.message };
    }

    // Check if activity is already completed
    const currentActivities = currentProgress?.completed_activities || {};
    if (currentActivities[activity]) {
      return { 
        success: false, 
        error: 'Activity already completed',
        points: currentProgress?.progress || 0,
        isAlreadyCompleted: true
      };
    }

    let currentPoints = currentProgress?.progress || 0;
    let newPoints = currentPoints;
    let status = currentProgress?.status || 'ongoing';

    // Calculate new points based on activity
    const activityPoints = getActivityPoints(activity);
    if (activityPoints === 0) {
      return { success: false, error: 'Invalid activity' };
    }

    newPoints = Math.min(currentPoints + activityPoints, 10);

    // Update status if completed
    if (newPoints >= 10 && status !== 'completed') {
      status = 'completed';
    }

    // Update completed_activities
    const updatedActivities = {
      ...currentActivities,
      [activity]: true
    };

    // Use upsert to avoid data loss
    const { error } = await supabase
      .from('user_scenarios_progress')
      .upsert({
        user_id: userId,
        scenario_id: scenarioId,
        progress: newPoints,
        status: status,
        completed_activities: updatedActivities,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,scenario_id'
      });

    if (error) {
      console.error('Error updating vocabulary points:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      points: newPoints,
      status: status,
      isCompleted: status === 'completed',
      activityCompleted: activity
    };
  } catch (error) {
    console.error('Error awarding vocabulary points:', error);
    return { success: false, error: error.message };
  }
};

// Award points for video activities
export const awardVideoPoints = async (userId, scenarioId, supabase) => {
  try {
    // Get current progress with completed_activities
    const { data: currentProgress, error: progressError } = await supabase
      .from('user_scenarios_progress')
      .select('progress, status, completed_activities')
      .eq('user_id', userId)
      .eq('scenario_id', scenarioId)
      .single();

    // Handle case where no progress record exists yet
    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error fetching progress:', progressError);
      return { success: false, error: progressError.message };
    }

    // Check if video is already completed
    const currentActivities = currentProgress?.completed_activities || {};
    if (currentActivities['video_watch_complete']) {
      return { 
        success: false, 
        error: 'Video already completed',
        points: currentProgress?.progress || 0,
        isAlreadyCompleted: true
      };
    }

    let currentPoints = currentProgress?.progress || 0;
    let newPoints = Math.min(currentPoints + POINT_SYSTEM.VIDEO.WATCH_COMPLETE, 10);
    let status = currentProgress?.status || 'ongoing';

    // Update status if completed
    if (newPoints >= 10 && status !== 'completed') {
      status = 'completed';
    }

    // Update completed_activities
    const updatedActivities = {
      ...currentActivities,
      'video_watch_complete': true
    };

    // Use upsert to avoid data loss
    const { error } = await supabase
      .from('user_scenarios_progress')
      .upsert({
        user_id: userId,
        scenario_id: scenarioId,
        progress: newPoints,
        status: status,
        completed_activities: updatedActivities,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,scenario_id'
      });

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

// Award points for roleplay activities
export const awardRoleplayPoints = async (userId, scenarioId, supabase) => {
  try {
    // Get current progress with completed_activities
    const { data: currentProgress, error: progressError } = await supabase
      .from('user_scenarios_progress')
      .select('progress, status, completed_activities')
      .eq('user_id', userId)
      .eq('scenario_id', scenarioId)
      .single();

    // Handle case where no progress record exists yet
    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error fetching progress:', progressError);
      return { success: false, error: progressError.message };
    }

    // Check if roleplay is already completed
    const currentActivities = currentProgress?.completed_activities || {};
    if (currentActivities['roleplay_complete_conversation']) {
      return { 
        success: false, 
        error: 'Roleplay already completed',
        points: currentProgress?.progress || 0,
        isAlreadyCompleted: true
      };
    }

    let currentPoints = currentProgress?.progress || 0;
    let newPoints = Math.min(currentPoints + POINT_SYSTEM.ROLEPLAY.COMPLETE_CONVERSATION, 10);
    let status = currentProgress?.status || 'ongoing';

    // Update status if completed
    if (newPoints >= 10 && status !== 'completed') {
      status = 'completed';
    }

    // Update completed_activities
    const updatedActivities = {
      ...currentActivities,
      'roleplay_complete_conversation': true
    };

    // Use upsert to avoid data loss
    const { error } = await supabase
      .from('user_scenarios_progress')
      .upsert({
        user_id: userId,
        scenario_id: scenarioId,
        progress: newPoints,
        status: status,
        completed_activities: updatedActivities,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,scenario_id'
      });

    if (error) {
      console.error('Error updating roleplay points:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      points: newPoints,
      status: status,
      isCompleted: status === 'completed'
    };
  } catch (error) {
    console.error('Error awarding roleplay points:', error);
    return { success: false, error: error.message };
  }
};

// Award points for quiz activities
export const awardQuizPoints = async (userId, scenarioId, supabase) => {
  try {
    // Get current progress with completed_activities
    const { data: currentProgress, error: progressError } = await supabase
      .from('user_scenarios_progress')
      .select('progress, status, completed_activities')
      .eq('user_id', userId)
      .eq('scenario_id', scenarioId)
      .single();

    // Handle case where no progress record exists yet
    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error fetching progress:', progressError);
      return { success: false, error: progressError.message };
    }

    // Check if quiz is already completed
    const currentActivities = currentProgress?.completed_activities || {};
    if (currentActivities['quiz_scenario_quiz']) {
      return { 
        success: false, 
        error: 'Quiz already completed',
        points: currentProgress?.progress || 0,
        isAlreadyCompleted: true
      };
    }

    let currentPoints = currentProgress?.progress || 0;
    let newPoints = Math.min(currentPoints + POINT_SYSTEM.QUIZ.SCENARIO_QUIZ, 10);
    let status = currentProgress?.status || 'ongoing';

    // Update status if completed
    if (newPoints >= 10 && status !== 'completed') {
      status = 'completed';
    }

    // Update completed_activities
    const updatedActivities = {
      ...currentActivities,
      'quiz_scenario_quiz': true
    };

    // Use upsert to avoid data loss
    const { error } = await supabase
      .from('user_scenarios_progress')
      .upsert({
        user_id: userId,
        scenario_id: scenarioId,
        progress: newPoints,
        status: status,
        completed_activities: updatedActivities,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,scenario_id'
      });

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

// Get user progress with completed activities
export const getUserProgress = async (userId, scenarioId, supabase) => {
  try {
    const { data: progress, error } = await supabase
      .from('user_scenarios_progress')
      .select('progress, status, completed_activities, completed_vocabulary')
      .eq('user_id', userId)
      .eq('scenario_id', scenarioId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user progress:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      progress: progress?.progress || 0,
      status: progress?.status || 'not_started',
      completedActivities: progress?.completed_activities || {},
      completedVocabulary: progress?.completed_vocabulary || {},
      isCompleted: progress?.status === 'completed'
    };
  } catch (error) {
    console.error('Error getting user progress:', error);
    return { success: false, error: error.message };
  }
};

// Check if specific activity is completed
export const isActivityCompleted = async (userId, scenarioId, activity, supabase) => {
  try {
    const { data: progress, error } = await supabase
      .from('user_scenarios_progress')
      .select('completed_activities')
      .eq('user_id', userId)
      .eq('scenario_id', scenarioId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking activity completion:', error);
      return false;
    }

    const completedActivities = progress?.completed_activities || {};
    return completedActivities[activity] || false;
  } catch (error) {
    console.error('Error checking activity completion:', error);
    return false;
  }
};