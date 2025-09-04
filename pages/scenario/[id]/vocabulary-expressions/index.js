import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabaseClient';

export default function VocabularyExpressionsPage() {
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
              <h1 className="text-lg font-semibold text-gray-900">Vocabulary & Expressions</h1>
              <p className="text-sm text-gray-500">{scenario.title}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        


        {/* Flashcard Categories Block - PURPLE THEME */}
        <button 
          onClick={() => router.push(`/scenario/${id}/vocabulary-expressions/flashcard-categories`)}
          className="w-full bg-white rounded-2xl border-2 border-purple-200 p-4 hover:border-purple-300 hover:shadow-md transition-all duration-200 text-left"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Flashcard Categories</h3>
              <p className="text-sm text-gray-500">Practice flashcards by specific vocabulary categories</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Category-based learning with personal collection</p>
            <div className="bg-purple-100 border border-purple-200 px-4 py-2 rounded-lg text-center">
              <span className="text-sm font-semibold text-purple-700">Complete for 2 points</span>
            </div>
          </div>
        </button>

        {/* Word List Block - BLUE THEME */}
        <button 
          onClick={() => router.push(`/scenario/${id}/vocabulary-expressions/categories`)}
          className="w-full bg-white rounded-2xl border-2 border-blue-200 p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Word List</h3>
              <p className="text-sm text-gray-500">Browse comprehensive vocabulary with definitions and cultural notes</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Searchable word list with detailed explanations</p>
            <div className="bg-blue-100 border border-blue-200 px-4 py-2 rounded-lg text-center">
              <span className="text-sm font-semibold text-blue-700">Complete for 2 points</span>
            </div>
          </div>
        </button>



        {/* Common Expressions Block - PURPLE THEME */}
        <button 
          onClick={() => router.push(`/scenario/${id}/vocabulary-expressions/expressions`)}
          className="w-full bg-white rounded-2xl border-2 border-purple-200 p-4 hover:border-purple-300 hover:shadow-md transition-all duration-200 text-left"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Common Expressions</h3>
              <p className="text-sm text-gray-500">Learn natural phrases and sentences for real conversations</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Essential phrases for daily interactions</p>
            <div className="bg-purple-100 border border-purple-200 px-4 py-2 rounded-lg text-center">
              <span className="text-sm font-semibold text-purple-700">Complete for 2 points</span>
            </div>
          </div>
        </button>

        {/* Instructions Card */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">How to Earn Points</h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                Explore each section above to learn vocabulary and expressions. When you've finished studying, 
                look for the completion bar at the top of each page to earn your points!
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}