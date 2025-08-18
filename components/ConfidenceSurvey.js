import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { awardSurveyPoints } from '../utils/pointSystem'; // NEW IMPORT

export default function ConfidenceSurvey({ scenario, surveyType = 'pre', onComplete, onClose, onSkip }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({
    familiarity: null,
    confidence: null
  });

  const isPostSurvey = surveyType === 'post';
  const isManualSurvey = surveyType === 'manual';

  const questions = [
    {
      key: 'familiarity',
      title: isPostSurvey 
        ? `Q1. After completing this scenario, how familiar are you now with vocabulary and expressions related to "${scenario?.title}"?`
        : `Q1. How familiar are you with vocabulary and slang related to this topic (e.g., ${scenario?.title})?`,
      options: [
        { value: 1, label: 'Not familiar at all' },
        { value: 2, label: 'A little familiar' },
        { value: 3, label: 'Somewhat familiar' },
        { value: 4, label: 'Quite familiar' },
        { value: 5, label: 'Very familiar' }
      ]
    },
    {
      key: 'confidence',
      title: isPostSurvey
        ? 'Q2. After completing this scenario, how confident do you feel about having conversations in this situation?'
        : 'Q2. How confident are you in having a small talk or conversation in this situation?',
      options: [
        { value: 1, label: 'Not confident at all' },
        { value: 2, label: 'Slightly confident' },
        { value: 3, label: 'Neutral' },
        { value: 4, label: 'Confident' },
        { value: 5, label: 'Very confident' }
      ]
    }
  ];

  const handleAnswerSelect = (value) => {
    const currentKey = questions[currentQuestion].key;
    setAnswers(prev => ({
      ...prev,
      [currentKey]: value
    }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handleFinish = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const surveyData = {
          user_id: session.user.id,
          scenario_id: scenario.id,
          familiarity: answers.familiarity,
          confidence: answers.confidence,
          survey_type: isManualSurvey ? 'manual' : surveyType,
          created_at: new Date().toISOString()
        };

        await supabase.from('survey_responses').insert(surveyData);

        // NEW: Award points for pre-survey completion (only for pre-survey)
        if (surveyType === 'pre') {
          try {
            const result = await awardSurveyPoints(session.user.id, scenario.id, supabase);
            if (result.success) {
              console.log('📋 Pre-survey completed! Points awarded:', result.points);
            }
          } catch (error) {
            console.error('Failed to award survey points:', error);
          }
        }
      }
      
      onComplete();
    } catch (error) {
      console.error('Error saving survey:', error);
      onComplete(); // Continue anyway
    }
  };

  // Handle skip button click
  const handleSkipClick = () => {
    // If onSkip is provided (from scenarios page), use it
    // Otherwise, fall back to onClose for backward compatibility
    if (onSkip) {
      onSkip();
    } else {
      onClose();
    }
  };

  const currentQ = questions[currentQuestion];
  const currentAnswer = answers[currentQ.key];
  const isLastQuestion = currentQuestion === questions.length - 1;

  const getSurveyTitle = () => {
    if (isManualSurvey) return 'Confidence Survey';
    return isPostSurvey ? 'Post-Scenario' : 'Pre-Scenario';
  };

  const getSurveyDescription = () => {
    if (isManualSurvey) return 'Help us track your learning progress and provide personalized recommendations for your next steps. Take this survey before starting and after completing your learning for the best experience.';
    // NEW: Add point information for pre-survey
    if (surveyType === 'pre') {
      return 'The purpose of this survey is to keep track of your learning progress with this web app. Complete this survey to earn 1 point!';
    }
    return 'Help us understand how this scenario improved your confidence and knowledge!';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800">
            {getSurveyTitle()} ({questions.length} questions)
            {/* NEW: Show point reward for pre-survey */}
            {surveyType === 'pre' && (
              <span className="ml-2 text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full">
                +1 point
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            {getSurveyDescription()}
          </p>
          <div className="mt-2 text-sm font-medium text-blue-600">
            Scenario: {scenario?.title}
          </div>
        </div>

        {/* Question */}
        <div className="mb-6">
          <h3 className="text-base font-medium text-gray-900 mb-4">
            {currentQ.title}
          </h3>

          {/* Answer options */}
          <div className="space-y-2">
            {currentQ.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAnswerSelect(option.value)}
                className={`w-full p-3 text-left border-2 rounded-lg transition-colors ${
                  currentAnswer === option.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col space-y-3">
          {/* Main action button */}
          {isLastQuestion ? (
            <button
              onClick={handleFinish}
              disabled={!currentAnswer}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
            >
              {isManualSurvey ? 'Submit Survey' : (isPostSurvey ? 'Complete Survey' : 'Start Scenario')}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!currentAnswer}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
            >
              Next
            </button>
          )}
          
          {/* Skip survey button */}
          <button
            onClick={handleSkipClick}
            className="w-full bg-gray-200 text-gray-700 py-2 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors text-sm"
          >
            Skip Survey
          </button>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center mt-4">
          <div className="flex space-x-2">
            {questions.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index <= currentQuestion ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}