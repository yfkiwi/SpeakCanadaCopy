import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { awardVocabularyPoints } from '../../../../utils/pointSystem';

export default function CategoriesPage() {
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

          // Check if user has already completed categories exploration
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
                if (completedActivities['category_exploration']) {
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
  const handleCompleteCategories = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && scenario && !pointsAwarded) {
        const result = await awardVocabularyPoints(session.user.id, scenario.id, 'category_exploration', supabase);
        if (result.success) {
          console.log('📋 Categories completed! Points awarded:', result.points);
          setPointsAwarded(true);

          // Show success message
          alert(`Great job! You've earned 2 points for exploring vocabulary categories. Total points: ${result.points}/10`);
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
      console.error('Failed to award categories points:', error);
      alert('Failed to complete categories. Please try again.');
    }
  };

  if (loading || checkingCompletion) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading categories...</p>
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
                <h1 className="text-lg font-semibold text-gray-900">Vocabulary Categories</h1>
                <p className="text-sm text-gray-500">{scenario.title}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* NEW: Mark as Complete Button */}
              {categories.length > 0 && (
                pointsAwarded ? (
                  // Completed UI
                  <div className="flex items-center space-x-2 text-green-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                    </svg>
                    <span className="text-sm font-medium">Completed</span>
                  </div>
                ) : (
                  // Uncompleted button
                  <button onClick={handleCompleteCategories} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
                    Complete
                  </button>
                )
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
                onClick={() => router.push(`/scenario/${id}/vocabulary-expressions/category/${encodeURIComponent(category.name)}`)}
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
        <div className="mt-6 pt-4 border-t border-gray-200">
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
        </div>
      </div>

      {/* Bottom Navigation Placeholder - Maintains consistency with other pages */}
      <div className="h-20"></div>
    </div>
  );
}