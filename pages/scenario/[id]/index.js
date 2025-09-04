import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import ContentRatingModal from '../../../components/ContentRatingModal';


export default function ScenarioMainPage() {
  const router = useRouter();
  const { id } = router.query;

  // State declarations
  const [scenario, setScenario] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showContentRating, setShowContentRating] = useState(false);
  const [hasRatedContent, setHasRatedContent] = useState(false);

  // Derived values - moved after state declarations
  const currentPoints = userProgress?.progress || 0;
  const isCompleted = userProgress?.status === 'completed';

  // Functions moved before useEffect
  const checkContentRatingExists = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !scenario) return false;

      const { data } = await supabase
        .from('content_ratings')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('scenario_id', scenario.id)
        .maybeSingle();

      return !!data;
    } catch (error) {
      return false;
    }
  };


  const handleContentRatingSubmit = async (ratingData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !scenario) return;

      await supabase.from('content_ratings').insert({
        user_id: session.user.id,
        scenario_id: scenario.id,
        vocabulary_rating: ratingData.ratings.vocabulary || 0,
        expressions_rating: ratingData.ratings.expressions || 0,
        video_rating: ratingData.ratings.video || 0,
        roleplay_rating: ratingData.ratings.roleplay || 0,
        quiz_rating: ratingData.ratings.quiz || 0,
        feedback: ratingData.feedback,
        created_at: ratingData.timestamp
      });

      setHasRatedContent(true);
      setShowContentRating(false);
    } catch (error) {
      console.error('Error saving content rating:', error);
    }
  };
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Current user session:", session);
      console.log("Current user ID:", session?.user?.id);
    };
    checkUser();
  }, []);
  // Main data fetching effect
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        // 获取场景和用户进度数据
        const { data: scenarioData } = await supabase
          .from('scenarios')
          .select('*')
          .eq('numeric_id', id)
          .single();

        if (!scenarioData) {
          setLoading(false);
          return;
        }

        setScenario(scenarioData);

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: progressData } = await supabase
            .from('user_scenarios_progress')
            .select('progress, status')
            .eq('user_id', session.user.id)
            .eq('scenario_id', scenarioData.id)
            .single();

          setUserProgress(progressData);

          // check if user has rated
          const { data: ratingData } = await supabase
            .from('content_ratings')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('scenario_id', scenarioData.id)
            .maybeSingle();

          if (ratingData) {
            setHasRatedContent(true); // user has rated, set status
          } else {
            // if user has not rated and points >= 8, show rating window
            const currentPoints = progressData?.progress || 0;
            if (currentPoints >= 8) {
              setShowContentRating(true);
            }
          }
        }

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Loading and error states
  if (loading) return <p>Loading...</p>;
  if (!scenario) return <p>Scenario not found</p>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
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

          {/* Progress Display */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-medium text-gray-900">{currentPoints}/10 points</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min((currentPoints / 10) * 100, 100)}%` }}
              />
            </div>
            {isCompleted && (
              <p className="text-sm text-green-600 mt-1 font-medium">🎉 Scenario completed!</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">

        {/* Feedback Survey Section */}
        {currentPoints >= 8 && !hasRatedContent && (
          <div className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg p-3 shadow-sm">
            <button
              onClick={() => setShowContentRating(true)}
              className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-medium py-2 px-3 rounded-lg transition-all duration-200 backdrop-blur-sm border border-white border-opacity-20 text-sm"
            >
              <div className="flex items-center justify-between">
                <span>Plz help us by giving us feedback</span>
              </div>
            </button>
          </div>
        )}

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
            <span className="text-xs bg-red-100 px-2 py-1 rounded-full text-red-700">2 points</span>
          </div>
        </button>

        {/* Vocabulary & Expressions Block */}
        <button
          onClick={() => router.push(`/scenario/${id}/vocabulary-expressions`)}
          className="w-full bg-white rounded-2xl border-2 border-blue-200 p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-gray-900">Vocabulary & Expressions</h3>
              <p className="text-sm text-gray-500">Master essential words, phrases & expressions for confident conversations</p>
            </div>
          </div>
          <div className="mt-3 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Flashcards • Word List • Expressions</span>
            <span className="text-xs bg-blue-100 px-2 py-1 rounded-full text-blue-700">6 points</span>
          </div>
        </button>

        {/* Role Play Block */}
        <button
          onClick={() => router.push(`/scenario/${id}/roleplay`)}
          className="w-full bg-white rounded-2xl border-2 border-purple-200 p-4 hover:border-purple-300 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 1h-3l-4 4z" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-gray-900">Role Play Chat</h3>
              <p className="text-sm text-gray-500">Practice conversation with AI in realistic scenarios</p>
            </div>
          </div>
          <div className="mt-3 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Interactive conversation practice</span>
            <span className="text-xs bg-purple-100 px-2 py-1 rounded-full text-purple-700">2 points</span>
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
            <span className="text-sm font-medium text-gray-700">15 questions • Vocabulary & Expressions</span>
            <span className="text-xs bg-green-100 px-2 py-1 rounded-full text-green-700">1 point</span>
          </div>
        </button>

      </div>

      {/* Content Rating Modal */}
      {showContentRating && scenario && (
        <ContentRatingModal
          contentType="scenario_complete"
          scenarioTitle={scenario.title}
          isVisible={showContentRating}
          onClose={() => setShowContentRating(false)}
          onSubmit={handleContentRatingSubmit}
        />
      )}

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
            <button
              onClick={() => router.push('/review')}
              className="flex flex-col items-center py-2 px-3"
            >
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-xs text-gray-400 mt-1">Review</span>
            </button>
            <button
              onClick={() => router.push('/me')}
              className="flex flex-col items-center py-2 px-3"
            >
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