import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { awardVocabularyPoints } from '../../../../utils/pointSystem';

export default function FlashcardCategoriesPage() {
  const router = useRouter();
  const { id } = router.query;
  const [scenario, setScenario] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Track completion state
  const [pointsAwarded, setPointsAwarded] = useState(false);
  const [checkingCompletion, setCheckingCompletion] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        console.log('Fetching scenario with numeric_id:', id);

        // Fetch scenario data
        const { data: scenarioData, error: scenarioError } = await supabase
          .from('scenarios')
          .select('*')
          .eq('numeric_id', id)
          .single();

        if (scenarioError) {
          console.error('Error fetching scenario:', scenarioError);
          return;
        }

        console.log('Found scenario:', scenarioData);
        setScenario(scenarioData);

        if (scenarioData) {
          // Fetch categories with metadata from vocabulary_categories table
          const { data: categoriesMetadata, error: categoriesError } = await supabase
            .from('vocabulary_categories')
            .select('*')
            .eq('scenario_id', scenarioData.id)
            .order('display_order');

          if (categoriesError) {
            console.error('Error fetching categories metadata:', categoriesError);
            return;
          }

          if (!categoriesMetadata || categoriesMetadata.length === 0) {
            console.log('No categories metadata found');
            setCategories([]);
            return;
          }

          // Get vocabulary counts per category
          const vocabularyScenario = scenarioData.scenario_key || scenarioData.title;
          const { data: vocabularyData, error: vocabularyError } = await supabase
            .from('vocabulary_combined')
            .select('category')
            .eq('scenario', vocabularyScenario)
            .not('category', 'is', null);

          if (vocabularyError) {
            console.error('Error fetching vocabulary:', vocabularyError);
            return;
          }

          // Count words per category
          const categoryCount = {};
          if (vocabularyData) {
            vocabularyData.forEach(item => {
              if (item.category) {
                categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
              }
            });
          }

          // Combine metadata with counts
          const categoriesWithCounts = categoriesMetadata.map(meta => ({
            id: meta.id,
            name: meta.category_name,
            count: categoryCount[meta.category_name] || 0,
            icon: meta.icon,
            colorClass: meta.color_class,
            displayOrder: meta.display_order
          })).filter(cat => cat.count > 0); // Only show categories with words

          console.log('Categories with counts:', categoriesWithCounts);
          setCategories(categoriesWithCounts);

          // Check if user has already completed flashcard completion
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              const { data: progress, error: progressError } = await supabase
                .from('user_scenarios_progress')
                .select('completed_activities')
                .eq('user_id', session.user.id)
                .eq('scenario_id', scenarioData.id)
                .single();

              if (!progressError && progress) {
                const completedActivities = progress.completed_activities || {};
                if (completedActivities['flashcard_completion']) {
                  setPointsAwarded(true);
                }
              }
            }
          } catch (error) {
            console.error('Error checking completion status:', error);
          }
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
        setCheckingCompletion(false);
      }
    };

    fetchData();
  }, [id]);

  // Handle completion button click
  const handleCompleteFlashcards = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && scenario && !pointsAwarded) {
        const result = await awardVocabularyPoints(session.user.id, scenario.id, 'flashcard_completion', supabase);
        if (result.success) {
          console.log('🃏 Flashcards completed! Points awarded:', result.points);
          setPointsAwarded(true);

          // Show success message
          alert(`Awesome! You've earned 2 points for completing flashcards. Total points: ${result.points}/10`);
        } else if (result.isAlreadyCompleted) {
          // Activity already completed
          setPointsAwarded(true);
          alert('You have already completed this activity!');
        } else {
          // Show error message
          alert(`Error: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Failed to award flashcard points:', error);
      alert('Failed to complete flashcards. Please try again.');
    }
  };

  if (loading || checkingCompletion) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading flashcard categories...</p>
      </div>
    </div>
  );

  if (!scenario) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 mb-4">Scenario not found</p>
        <button
          onClick={() => router.push('/scenarios')}
          className="text-blue-500 hover:text-blue-600 underline"
        >
          Go back to scenarios
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push(`/scenario/${id}/vocabulary-expressions`)}
                className="text-gray-600 hover:text-gray-800"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Flashcard Categories</h1>
                <p className="text-sm text-gray-500">{scenario.title}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* NEW: Mark as Complete Button */}
              {!pointsAwarded && categories.length > 0 && (
                <button
                  onClick={handleCompleteFlashcards}
                  className="bg-blue-400 hover:bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 flex items-center space-x-2 shadow-sm"
                  title="Mark as complete and earn 2 points"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Complete</span>
                </button>
              )}

              {/* Show category count when completed or no completion button needed */}
              {(pointsAwarded || categories.length === 0) && (
                <div className="text-sm font-medium text-gray-900">
                  {categories.length} categories
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="max-w-md mx-auto px-4 py-6">
        {categories.length > 0 ? (
          <div className="space-y-3">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => router.push(`/scenario/${id}/vocabulary-expressions/flashcards?category=${encodeURIComponent(category.name)}`)}
                className="w-full bg-white rounded-2xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${category.colorClass}`}>
                      <span className="text-2xl">{category.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{category.name}</h3>
                      <p className="text-sm text-gray-500">{category.count} words</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No categories available</h3>
            <p className="text-gray-500 mb-4">Categories will appear here once vocabulary is organized</p>
          </div>
        )}

        {/* View All Vocabulary Option */}
        <div className="mt-6 pt-4 border-t border-gray-200 space-y-3">
          <button
            onClick={() => router.push(`/scenario/${id}/vocabulary-expressions/word-list`)}
            className="w-full bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">View All Vocabulary</h3>
                  <p className="text-sm text-gray-500">Browse complete vocabulary list</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* My Library Option */}
          <button
            onClick={() => router.push(`/scenario/${id}/vocabulary-expressions/my-library`)}
            className="w-full bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 hover:border-orange-300 hover:shadow-md transition-all duration-200 text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">My Library</h3>
                  <p className="text-sm text-gray-500">View your collected words</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Navigation Placeholder - Maintains consistency with other pages */}
      <div className="h-20"></div>
    </div>
  );
}
