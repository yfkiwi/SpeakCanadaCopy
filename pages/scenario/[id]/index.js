import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export default function ScenarioMainPage() {
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
                onClick={() => router.push('/scenarios')}
                className="text-gray-600 hover:text-gray-800"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{scenario.title}</h1>
                <p className="text-sm text-gray-500">Choose your learning mode</p>
              </div>
            </div>
            <div className="text-sm font-medium text-gray-900">9:41</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        
        {/* Role Play Block */}
        <button 
          onClick={() => router.push(`/scenario/${id}/roleplay`)}
          className="w-full bg-white rounded-2xl border-2 border-purple-200 p-4 hover:border-purple-300 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-gray-900">Role Play Chat</h3>
              <p className="text-sm text-gray-500">Practice conversation with AI in realistic scenarios</p>
            </div>
          </div>
          <div className="mt-3 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Interactive conversation practice</span>
            <span className="text-xs bg-purple-100 px-2 py-1 rounded-full text-purple-700">AI Chat</span>
          </div>
        </button>

        {/* Video Learning Block */}
        <button 
          onClick={() => router.push(`/scenario/${id}/video`)}
          className="w-full bg-white rounded-2xl border-2 border-red-200 p-4 hover:border-red-300 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-gray-900">Watch Video</h3>
              <p className="text-sm text-gray-500">Learn from real-life examples and cultural context</p>
            </div>
          </div>
          <div className="mt-3 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Video lessons with interactive subtitles</span>
            <span className="text-xs bg-red-100 px-2 py-1 rounded-full text-red-700">Video</span>
          </div>
        </button>

        {/* Vocabulary Block */}
        <button 
          onClick={() => router.push(`/scenario/${id}/vocabulary`)}
          className="w-full bg-white rounded-2xl border-2 border-blue-200 p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-gray-900">Vocabulary</h3>
              <p className="text-sm text-gray-500">Learn key words and phrases with flashcards, glossary & quiz</p>
            </div>
          </div>
          <div className="mt-3 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Flashcards • Glossary • Quiz</span>
            <span className="text-xs bg-blue-100 px-2 py-1 rounded-full text-blue-700">A1-A2</span>
          </div>
        </button>

        {/* Overall Quiz Block */}
        <button 
          onClick={() => router.push(`/scenario/${id}/quiz`)}
          className="w-full bg-white rounded-2xl border-2 border-green-200 p-4 hover:border-green-300 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-sm">?</span>
              </div>
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-gray-900">Scenario Quiz</h3>
              <p className="text-sm text-gray-500">Test your overall understanding of this scenario</p>
            </div>
          </div>
          <div className="mt-3 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Complete scenario assessment</span>
            <span className="text-xs bg-green-100 px-2 py-1 rounded-full text-green-700">Test</span>
          </div>
        </button>

      </div>
    </div>
  );
}