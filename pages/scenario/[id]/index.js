import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import ConfidenceSurvey from '@/components/ConfidenceSurvey';

export default function ScenarioPage() {
  const router = useRouter();
  const { id } = router.query;
  const [scenario, setScenario] = useState(null);
  const [progress, setProgress] = useState(0);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyCompleted, setSurveyCompleted] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      // Fetch scenario using numeric_id
      const { data: scenarioData } = await supabase
        .from('scenarios')
        .select('*')
        .eq('numeric_id', id)
        .single();
      setScenario(scenarioData);

      if (!scenarioData) return; // Exit if no scenario found

      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // No user logged in - show survey anyway (won't save to database)
        console.log('No user session - showing survey anyway');
        setShowSurvey(true);
        return;
      }

      // Fetch progress using the UUID id
      const { data: progressData } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('scenario_id', scenarioData.id) // Use UUID here
        .single();
      if (progressData) setProgress(progressData.percent);

      // Check if survey was already completed for this scenario using UUID
      const { data: surveyData } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('scenario_id', scenarioData.id) // Use UUID here
        .single();

      // Debug: Log the survey data
      console.log('Survey data:', surveyData);
      console.log('User ID:', session.user.id);
      console.log('Scenario ID:', scenarioData.id);

      if (!surveyData) {
        // Survey not completed, show it
        console.log('No survey found - showing survey');
        setShowSurvey(true);
      } else {
        // Survey already completed
        console.log('Survey already completed - skipping survey');
        setSurveyCompleted(true);
      }
    };

    fetchData();
  }, [id]);

  const handleIncrement = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('No session - cannot save progress');
      return;
    }
    
    const newPercent = Math.min(progress + 10, 100);
    setProgress(newPercent);
    await supabase.from('progress').upsert({
      user_id: session.user.id,
      scenario_id: scenario.id, // Use UUID for foreign key
      percent: newPercent,
    });
  };

  const handleSurveyComplete = () => {
    setShowSurvey(false);
    setSurveyCompleted(true);
  };

  const handleSurveyClose = () => {
    // User closed survey without completing - redirect back
    router.push('/scenarios');
  };

  if (!scenario) return <p>Loading...</p>;

  // Show survey if it hasn't been completed yet
  if (showSurvey) {
    return (
      <ConfidenceSurvey
        scenario={scenario}
        onComplete={handleSurveyComplete}
        onClose={handleSurveyClose}
      />
    );
  }

  // Show scenario content only after survey is completed
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => router.push('/scenarios')}
              className="text-gray-600 hover:text-gray-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Scenario: {scenario.title}</h1>
              <p className="text-sm text-gray-500">choose from the following 5 blocks to learn...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        
        {/* Chatbot Block */}
        <button 
          onClick={() => router.push(`/scenario/${id}/chatbot`)}
          className="w-full bg-white rounded-2xl border-2 border-purple-200 p-4 hover:border-purple-300 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">Chatbot</h3>
                <p className="text-sm text-gray-500">Quick Q&A, and start a practice chat with the Role-play bot</p>
              </div>
            </div>
            <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Discover & Practice</span>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">A1 - A2</span>
          </div>
        </button>

        {/* Videos Block */}
        <button 
          onClick={() => router.push(`/scenario/${id}/videos`)}
          className="w-full bg-white rounded-2xl border-2 border-yellow-200 p-4 hover:border-yellow-300 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-3-9a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">Videos</h3>
                <p className="text-sm text-gray-500">Watch instructional videos to learn about casual conversations under this scenario</p>
              </div>
            </div>
            <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Learn from Video Resources</span>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">A1 - A2</span>
          </div>
        </button>

        {/* Vocabulary Block */}
        <button 
          onClick={() => router.push(`/scenario/${id}/vocabulary`)}
          className="w-full bg-white rounded-2xl border-2 border-green-200 p-4 hover:border-green-300 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">Vocabulary</h3>
                <p className="text-sm text-gray-500">Learn vocabulary and slang for this scenario</p>
              </div>
            </div>
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Learn about Common Vocabulary</span>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">A1 - A2</span>
          </div>
        </button>

        {/* Sentences Block */}
        <button 
          onClick={() => router.push(`/scenario/${id}/sentences`)}
          className="w-full bg-white rounded-2xl border-2 border-red-200 p-4 hover:border-red-300 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">Sentences</h3>
                <p className="text-sm text-gray-500">Learn about sentences commonly used in this scenario</p>
              </div>
            </div>
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Common Sentences for this Scenario</span>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">A1 - A2</span>
          </div>
        </button>

        {/* Quiz Block */}
        <button 
          onClick={() => router.push(`/scenario/${id}/quiz`)}
          className="w-full bg-white rounded-2xl border-2 border-amber-200 p-4 hover:border-amber-300 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">Quiz</h3>
                <p className="text-sm text-gray-500">Do a quiz to see how well you understand the content</p>
              </div>
            </div>
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Test your Knowledge</span>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">A1 - A2</span>
          </div>
        </button>

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-md mx-auto px-4">
          <div className="flex justify-around py-2">
            <button 
              onClick={() => router.push('/')}
              className="flex flex-col items-center py-2 px-3"
            >
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-xs text-gray-400 mt-1">Home</span>
            </button>
            <button className="flex flex-col items-center py-2 px-3">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-xs text-orange-500 mt-1 font-medium">Scenario</span>
            </button>
            <button className="flex flex-col items-center py-2 px-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-xs text-gray-400 mt-1">Review</span>
            </button>
            <button className="flex flex-col items-center py-2 px-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xs text-gray-400 mt-1">Me</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}