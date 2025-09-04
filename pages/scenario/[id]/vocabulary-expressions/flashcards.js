import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { awardVocabularyPoints } from '../../../../utils/pointSystem';

export default function FlashcardsPage() {
  const router = useRouter();
  const { id, category } = router.query;
  const [scenario, setScenario] = useState(null);
  const [currentCard, setCurrentCard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [vocabulary, setVocabulary] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Completion state
  const [pointsAwarded, setPointsAwarded] = useState(false);
  const [hasCompletedOnce, setHasCompletedOnce] = useState(false);
  const [checkingCompletion, setCheckingCompletion] = useState(true);
  
  // Collection state
  const [isInLibrary, setIsInLibrary] = useState(false);
  const [addingToLibrary, setAddingToLibrary] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      try {
        console.log('Fetching scenario with numeric_id:', id);
        
        // Fetch scenario data including the new scenario_key
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
          // Use scenario_key to fetch vocabulary (fallback to title if scenario_key is null)
          const vocabularyScenario = scenarioData.scenario_key || scenarioData.title;
          console.log('Looking for vocabulary with scenario:', vocabularyScenario);

          // Build query based on category filter
          let query = supabase
            .from('vocabulary_combined')
            .select('*')
            .eq('scenario', vocabularyScenario);

          // If category is specified, filter by it
          if (category) {
            query = query.eq('category', decodeURIComponent(category));
            console.log('Filtering by category:', decodeURIComponent(category));
          }

          const { data: vocabularyData, error: vocabularyError } = await query.order('order_number');

          if (vocabularyError) {
            console.error('Error fetching vocabulary:', vocabularyError);
          } else {
            console.log(`Found ${vocabularyData?.length || 0} vocabulary terms`);
            setVocabulary(vocabularyData || []);
            
            // Check if first word is in library
            if (vocabularyData && vocabularyData.length > 0) {
              await checkIfInLibrary(vocabularyData[0].term);
            }
          }

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

  // Check if current word is in user's library
  const checkIfInLibrary = async (term) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data, error } = await supabase
          .from('user_vocabulary_library')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('term', term)
          .single();

        if (!error && data) {
          setIsInLibrary(true);
        } else {
          setIsInLibrary(false);
        }
      }
    } catch (error) {
      console.error('Error checking library status:', error);
      setIsInLibrary(false);
    }
  };

  // Add word to user's library
  const addToLibrary = async (term, definition, culturalNote) => {
    try {
      setAddingToLibrary(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { error } = await supabase
          .from('user_vocabulary_library')
          .insert({
            user_id: session.user.id,
            term: term,
            definition: definition,
            cultural_note: culturalNote,
            source: 'system',
            scenario_key: scenario?.scenario_key || scenario?.title
          });

        if (!error) {
          setIsInLibrary(true);
          console.log('✅ Added to library:', term);
        } else {
          console.error('Error adding to library:', error);
        }
      }
    } catch (error) {
      console.error('Error adding to library:', error);
    } finally {
      setAddingToLibrary(false);
    }
  };

  const nextCard = async () => {
    setShowAnswer(false);
    const nextIndex = (currentCard + 1) % vocabulary.length;
    setCurrentCard(nextIndex);
    
    // Check if new word is in library
    if (vocabulary[nextIndex]) {
      await checkIfInLibrary(vocabulary[nextIndex].term);
    }
    
    // Show completion eligibility when user completes full cycle (returns to first card)
    if (nextIndex === 0 && vocabulary.length > 1 && !hasCompletedOnce) {
      setHasCompletedOnce(true);
      console.log('🃏 User has completed full flashcard cycle - completion now available');
    }
  };

  const prevCard = () => {
    setShowAnswer(false);
    setCurrentCard((prev) => (prev - 1 + vocabulary.length) % vocabulary.length);
  };

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

  const handleKeyPress = (e) => {
    if (e.key === 'ArrowRight') nextCard();
    if (e.key === 'ArrowLeft') prevCard();
    if (e.key === ' ') {
      e.preventDefault();
      setShowAnswer(!showAnswer);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showAnswer]);

  const currentTerm = vocabulary[currentCard];

  if (loading || checkingCompletion) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading flashcards...</p>
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

  if (vocabulary.length === 0) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <p className="text-gray-500 mb-4">No vocabulary found for this scenario</p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-700 font-medium">Debug Info:</p>
          <p className="text-xs text-yellow-600 mt-1">
            Scenario: {scenario.title}<br/>
            Scenario Key: {scenario.scenario_key || 'Not set'}<br/>
            Numeric ID: {scenario.numeric_id}
          </p>
        </div>
        <button 
          onClick={() => router.push(`/scenario/${id}/vocabulary-expressions`)}
          className="text-blue-500 hover:text-blue-600 underline"
        >
          Go back to Vocabulary & Expressions
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
                <h1 className="text-lg font-semibold text-gray-900">Flashcards</h1>
                <p className="text-sm text-gray-500">
                  {scenario.title}
                  {category && (
                    <span className="block text-xs text-blue-600">
                      Category: {decodeURIComponent(category)}
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            {/* Complete Button - Show when cycle completed and not yet awarded */}
            {hasCompletedOnce && !pointsAwarded && (
              <button
                onClick={handleCompleteFlashcards}
                className="bg-green-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 flex items-center space-x-2 shadow-sm"
                title="Mark as complete and earn 2 points"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Complete</span>
              </button>
            )}
            
            {/* Show card progress when not showing complete button */}
            {(!hasCompletedOnce || pointsAwarded) && (
              <div className="text-sm font-medium text-gray-900">
                {currentCard + 1} / {vocabulary.length}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-md mx-auto px-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentCard + 1) / vocabulary.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Flashcard Content */}
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="text-center mb-4">
          <span className="text-sm text-gray-500">
            Card {currentCard + 1} of {vocabulary.length}
          </span>
        </div>

        {/* Flashcard */}
        <div 
          className="bg-white rounded-2xl shadow-lg p-8 min-h-96 flex flex-col justify-center items-center cursor-pointer transition-all duration-300 hover:shadow-xl"
          onClick={() => setShowAnswer(!showAnswer)}
        >
          {!showAnswer ? (
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {currentTerm?.term}
              </h2>
              {currentTerm?.ipa_pronunciation && (
                <p className="text-lg text-gray-600 mb-4">
                  {currentTerm.ipa_pronunciation}
                </p>
              )}
              <p className="text-gray-500">Tap to see definition</p>
              <div className="mt-4 text-xs text-gray-400">
                Press spacebar or tap card to flip
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              {/* Definition */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Definition
                </h3>
                <p className="text-lg text-gray-900 leading-relaxed mb-4">
                  {currentTerm?.definition}
                </p>
              </div>

              {/* Example Sentence */}
              {currentTerm?.example_sentence && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Example
                  </h3>
                  <div className="text-gray-700 bg-gray-50 p-3 rounded-lg italic">
                    {currentTerm.example_sentence}
                  </div>
                </div>
              )}

              {/* Cultural Note */}
              {currentTerm?.cultural_note && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Cultural Note
                  </h3>
                  <div className="text-sm text-gray-600 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-lg text-left">
                    {currentTerm.cultural_note}
                  </div>
                </div>
              )}

              <div className="mt-4 text-xs text-gray-400">
                Press spacebar or tap card to flip back
              </div>
            </div>
          )}
        </div>

        {/* Know/Don't Know Buttons - Only show when answer is visible */}
        {showAnswer && (
          <div className="flex justify-center space-x-4 mt-6">
            <button
              onClick={() => {
                // User knows this word, go to next
                nextCard();
              }}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              ✅ I Know This Word
            </button>
            <button
              onClick={() => {
                // User doesn't know, show add to library option
                setShowAnswer(false);
              }}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
            >
              ❌ I Don't Know
            </button>
          </div>
        )}

        {/* Add to Library Section - Show when user doesn't know */}
        {!showAnswer && currentTerm && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                Add "{currentTerm.term}" to Your Library?
              </h3>
              
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => addToLibrary(
                    currentTerm.term, 
                    currentTerm.definition, 
                    currentTerm.cultural_note
                  )}
                  disabled={addingToLibrary || isInLibrary}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isInLibrary 
                      ? 'bg-green-100 text-green-700 cursor-not-allowed'
                      : 'bg-yellow-500 text-white hover:bg-yellow-600'
                  }`}
                >
                  {isInLibrary ? '✅ Already in Library' : '📚 Add to Library'}
                </button>
                
                <button
                  onClick={() => nextCard()}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={prevCard}
            disabled={vocabulary.length <= 1}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Previous</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAnswer(!showAnswer)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              {showAnswer ? 'Show Term' : 'Show Answer'}
            </button>

            <button 
              onClick={() => {
                if ('speechSynthesis' in window && currentTerm) {
                  const utterance = new SpeechSynthesisUtterance(currentTerm.term);
                  utterance.rate = 0.8;
                  utterance.lang = 'en-CA';
                  speechSynthesis.speak(utterance);
                }
              }}
              className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              title="Listen to pronunciation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a1 1 0 01-1-1V9a1 1 0 011-1h1a1 1 0 011 1v.001L15.536 6.464" />
              </svg>
            </button>
          </div>

          <button
            onClick={nextCard}
            disabled={vocabulary.length <= 1}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Next</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}