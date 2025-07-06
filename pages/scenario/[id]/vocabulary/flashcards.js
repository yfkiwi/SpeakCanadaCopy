import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabaseClient';

export default function FlashcardsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [scenario, setScenario] = useState(null);
  const [currentCard, setCurrentCard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [vocabulary, setVocabulary] = useState([]);
  const [loading, setLoading] = useState(true);

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

          const { data: vocabularyData, error: vocabularyError } = await supabase
            .from('vocabulary_combined')
            .select('*')
            .eq('scenario', vocabularyScenario)
            .order('order_number');

          if (vocabularyError) {
            console.error('Error fetching vocabulary:', vocabularyError);
          } else {
            console.log(`Found ${vocabularyData?.length || 0} vocabulary terms`);
            setVocabulary(vocabularyData || []);
          }
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const nextCard = () => {
    setShowAnswer(false);
    setCurrentCard((prev) => (prev + 1) % vocabulary.length);
  };

  const prevCard = () => {
    setShowAnswer(false);
    setCurrentCard((prev) => (prev - 1 + vocabulary.length) % vocabulary.length);
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

  if (loading) return (
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
          onClick={() => router.push(`/scenario/${id}/vocabulary`)}
          className="text-blue-500 hover:text-blue-600 underline"
        >
          Go back to vocabulary
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
                onClick={() => router.push(`/scenario/${id}/vocabulary`)}
                className="text-gray-600 hover:text-gray-800"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Flashcards</h1>
                <p className="text-sm text-gray-500">{scenario.title}</p>
              </div>
            </div>
            <div className="text-sm font-medium text-gray-900">
              {currentCard + 1} / {vocabulary.length}
            </div>
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
          {currentTerm?.difficulty_level && (
            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              {currentTerm.difficulty_level}
            </span>
          )}
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
                    "{currentTerm.example_sentence}"
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

        {/* Keyboard shortcuts info */}
        <div className="mt-6 text-center text-xs text-gray-400">
          <p>Keyboard shortcuts: ← Previous | → Next | Space Flip card</p>
        </div>
      </div>
    </div>
  );
}