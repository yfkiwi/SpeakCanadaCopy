import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabaseClient';

export default function VocabularyPage() {
  const router = useRouter();
  const { id } = router.query;
  const [scenario, setScenario] = useState(null);

  useEffect(() => {
    if (!id) return;
    
    const fetchScenario = async () => {
      const { data: scenarioData } = await supabase
        .from('scenarios')
        .select('*')
        .eq('numeric_id', id)
        .single();
      setScenario(scenarioData);
    };

    fetchScenario();
  }, [id]);

  if (!scenario) return <p>Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => router.push(`/scenario/${id}`)}
                className="text-gray-600 hover:text-gray-800"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Vocabulary</h1>
                <p className="text-sm text-gray-500">{scenario.title}</p>
              </div>
            </div>
            {/* Time display */}
            <div className="text-sm font-medium text-gray-900">
              9:41
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        
        {/* Start Flashcards Block */}
        <button 
          onClick={() => router.push(`/scenario/${id}/vocabulary/flashcards`)}
          className="w-full bg-white rounded-2xl border-2 border-teal-200 p-4 hover:border-teal-300 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center relative">
              {/* Flashcard icon - stack of cards */}
              <div className="w-8 h-6 bg-gray-300 rounded-sm absolute"></div>
              <div className="w-8 h-6 bg-teal-400 rounded-sm absolute translate-x-1 -translate-y-1"></div>
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-gray-900">Start Flashcards</h3>
              <p className="text-sm text-gray-500">Learn the vocabulary and slang about ordering food and drinks by flashcards</p>
            </div>
          </div>
          <div className="mt-3 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Learn words show on the flashcard</span>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">A1 - A2</span>
          </div>
        </button>

        {/* Explore Glossary Block */}
        <button 
          //onClick={() => router.push(`/scenario/${id}/vocabulary/glossary`)}
          onClick={() => router.push(`/scenario/${id}/vocabulary/categories`)}
          className="w-full bg-white rounded-2xl border-2 border-blue-200 p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              {/* Glossary/List icon */}
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-gray-900">Explore Glossary</h3>
              <p className="text-sm text-gray-500">Learn the vocabulary and slang about ordering food and drinks in a list</p>
            </div>
          </div>
          <div className="mt-3 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Choose the one to learn more about</span>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">A1 - A2</span>
          </div>
        </button>

        {/* Quiz Block */}
        <button 
          onClick={() => router.push(`/scenario/${id}/vocabulary/quiz`)}
          className="w-full bg-white rounded-2xl border-2 border-orange-200 p-4 hover:border-orange-300 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              {/* Quiz icon with question mark */}
              <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-sm">?</span>
              </div>
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-gray-900">Quiz</h3>
              <p className="text-sm text-gray-500">A quick check on your learning result</p>
            </div>
          </div>
          <div className="mt-3 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Check on your Progress</span>
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