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

  // NEW: Simple Single-Array Spaced Repetition System
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    totalCards: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    struggledWords: []
  });

  // NEW: Text Selection & Dictionary Lookup
  const [selectedText, setSelectedText] = useState('');
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [showPopup, setShowPopup] = useState(false);
  const [popupDefinition, setPopupDefinition] = useState('');
  const [popupTranslation, setPopupTranslation] = useState('');
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [userLanguage, setUserLanguage] = useState('');

  // NEW: Pronunciation function (copied from word-list.js)
  const speakTerm = (term, event) => {
    if (event) {
      event.stopPropagation();
    }
    
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(term);
      utterance.rate = 0.8;
      utterance.lang = 'en-CA';
      speechSynthesis.speak(utterance);
    }
  };

  // NEW: Initialize simple spaced repetition system
  const initializeSpacedRepetition = (vocabData) => {
    const cardsWithStatus = vocabData.map((term, index) => ({ 
      ...term, 
      originalIndex: index,
      status: 'pending',
      isRetry: false
    }));
    setCards(cardsWithStatus);
    setCurrentIndex(0);
    setSessionStats({
      totalCards: vocabData.length,
      correctAnswers: 0,
      incorrectAnswers: 0,
      struggledWords: []
    });
    setShowAnswer(false);
    setSessionComplete(false);
  };

  // NEW: Handle card responses with simple retry logic
  const handleCardResponse = (knowsCard) => {
    const currentCard = getCurrentCard();
    if (!currentCard) return;

    // Update session stats
    setSessionStats(prev => ({
      ...prev,
      correctAnswers: knowsCard ? prev.correctAnswers + 1 : prev.correctAnswers,
      incorrectAnswers: knowsCard ? prev.incorrectAnswers : prev.incorrectAnswers + 1,
      struggledWords: knowsCard ? prev.struggledWords : [
        ...prev.struggledWords.filter(word => word.term !== currentCard.term),
        { term: currentCard.term, timesWrong: (prev.struggledWords.find(w => w.term === currentCard.term)?.timesWrong || 0) + 1 }
      ]
    }));

    if (knowsCard) {
      // Mark as mastered and advance
      setCards(prev => prev.map((card, index) => 
        index === currentIndex ? { ...card, status: 'mastered' } : card
      ));
      advanceToNextCard();
    } else {
      // Create retry copy and insert 2-3 positions ahead
      const retryCard = { 
        ...currentCard, 
        isRetry: true,
        status: 'pending'
      };
      
      setCards(prev => {
        const updatedCards = [...prev];
        const insertPosition = Math.min(currentIndex + 3, updatedCards.length);
        updatedCards.splice(insertPosition, 0, retryCard);
        return updatedCards;
      });
      
      advanceToNextCard();
    }
  };

  // NEW: Simple advance to next card
  const advanceToNextCard = () => {
    setCurrentIndex(prev => {
      const nextIndex = prev + 1;
      
      // Check if session is complete
      if (nextIndex >= cards.length) {
        // Check if all original cards are mastered
        const originalCards = cards.filter(card => !card.isRetry);
        const allMastered = originalCards.every(card => card.status === 'mastered');
        
        if (allMastered) {
          setSessionComplete(true);
          setShowSessionSummary(true);
          return prev; // Don't advance
        } else {
          // Session complete but not all mastered - this shouldn't happen with our logic
          setSessionComplete(true);
          setShowSessionSummary(true);
          return prev;
        }
      }
      
      return nextIndex;
    });
    
    setShowAnswer(false);
  };

  // NEW: Get current card
  const getCurrentCard = () => {
    return cards[currentIndex] || null;
  };

  // NEW: Text selection and dictionary lookup functions
  const handleTextSelection = (event) => {
    if (!showAnswer) return; // Only allow selection on back side
    
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (text && text.length > 0 && text.length < 100) {
      setSelectedText(text);
      
      // Get selection position
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setPopupPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
      
      setShowPopup(true);
      
      // Fetch definition
      fetchDefinition(text);
    }
  };

  const fetchDefinition = async (word) => {
    setIsLoadingDefinition(true);
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data[0]) {
          const entry = data[0];
          const definition = entry.meanings?.[0]?.definitions?.[0]?.definition || 'No definition found';
          setPopupDefinition(definition);
        } else {
          setPopupDefinition('No definition found');
        }
      } else {
        setPopupDefinition('No definition found');
      }
    } catch (error) {
      console.error('Failed to fetch definition:', error);
      setPopupDefinition('Failed to load definition');
    } finally {
      setIsLoadingDefinition(false);
    }
  };

  const handleTranslate = async () => {
    if (!userLanguage || !selectedText) return;
    
    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selectedText, targetLanguage: userLanguage })
      });
      const data = await response.json();
      setPopupTranslation(data.translatedText || 'Translation failed');
    } catch (error) {
      console.error('Translation failed:', error);
      setPopupTranslation('Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  const closePopup = () => {
    setShowPopup(false);
    setSelectedText('');
    setPopupDefinition('');
    setPopupTranslation('');
    window.getSelection().removeAllRanges();
  };

  // NEW: Auto-pronunciation on card load
  useEffect(() => {
    if (cards.length > 0 && !showAnswer) {
      const currentCard = getCurrentCard();
      if (currentCard) {
        speakTerm(currentCard.term);
      }
    }
  }, [currentIndex, cards.length, showAnswer]);

  // NEW: Fetch user language
  useEffect(() => {
    const fetchUserLanguage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('native_language')
            .eq('user_id', user.id)
            .single();
          setUserLanguage(profile?.native_language || '');
        }
      } catch (error) {
        console.error('Failed to fetch user language:', error);
      }
    };
    fetchUserLanguage();
  }, []);

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
            
            // NEW: Initialize simple spaced repetition system
            if (vocabularyData && vocabularyData.length > 0) {
              initializeSpacedRepetition(vocabularyData);
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
    const nextIndex = (currentIndex + 1) % cards.length;
    setCurrentIndex(nextIndex);
    
    // Check if new word is in library
    if (cards[nextIndex]) {
      await checkIfInLibrary(cards[nextIndex].term);
    }
    
    // Show completion eligibility when user completes full cycle (returns to first card)
    if (nextIndex === 0 && cards.length > 1 && !hasCompletedOnce) {
      setHasCompletedOnce(true);
      console.log('🃏 User has completed full flashcard cycle - completion now available');
    }
  };

  const prevCard = () => {
    setShowAnswer(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
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

  const currentTerm = getCurrentCard();

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
                {currentIndex + 1} / {cards.length}
                {cards.filter(card => card.isRetry).length > 0 && (
                  <span className="text-xs text-orange-600 ml-1">
                    (+{cards.filter(card => card.isRetry).length} retry)
                  </span>
                )}
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
            style={{ 
              width: `${((currentIndex + 1) / cards.length) * 100}%` 
            }}
          ></div>
        </div>
      </div>

      {/* Flashcard Content */}
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="text-center mb-4">
          <span className="text-sm text-gray-500">
            Card {currentIndex + 1} of {cards.length}
            {cards.filter(card => card.isRetry).length > 0 && (
              <span className="text-xs text-orange-600 ml-1">
                (+{cards.filter(card => card.isRetry).length} retry)
              </span>
            )}
          </span>
        </div>

        {/* NEW: Updated Flashcard with Simple Spaced Repetition */}
        <div className="bg-white rounded-2xl shadow-lg p-8 min-h-96 flex flex-col justify-center items-center transition-all duration-300">
          {!showAnswer ? (
            // Front side: Term + Auto-pronunciation + Speaker button
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {getCurrentCard()?.term}
              </h2>
              {getCurrentCard()?.ipa_pronunciation && (
                <p className="text-lg text-gray-600 mb-6">
                  {getCurrentCard().ipa_pronunciation}
                </p>
              )}
              
              {/* Speaker button for replay */}
              <button
                onClick={(e) => speakTerm(getCurrentCard()?.term, e)}
                className="w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors mb-6"
                title="Listen to pronunciation"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.82L4.104 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.104l4.279-3.82a1 1 0 011.617.82zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.984 3.984 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* Show Meaning button */}
              <button
                onClick={() => setShowAnswer(true)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-8 py-3 rounded-xl font-medium transition-colors shadow-lg"
              >
                Show Meaning
              </button>
            </div>
          ) : (
            // Back side: Definition + Example + Cultural Note with text selection
            <div className="text-center space-y-4" onMouseUp={handleTextSelection}>
              {/* Definition */}
              <div data-word-lookup="enabled" style={{ userSelect: 'text' }}>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Definition
                </h3>
                <p className="text-lg text-gray-900 leading-relaxed mb-4">
                  {getCurrentCard()?.definition}
                </p>
              </div>

              {/* Example Sentence */}
              {getCurrentCard()?.example_sentence && (
                <div data-word-lookup="enabled" style={{ userSelect: 'text' }}>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Example
                  </h3>
                  <div className="text-gray-700 bg-gray-50 p-3 rounded-lg italic">
                    {getCurrentCard().example_sentence}
                  </div>
                </div>
              )}

              {/* Cultural Note */}
              {getCurrentCard()?.cultural_note && (
                <div data-word-lookup="enabled" style={{ userSelect: 'text' }}>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Cultural Note
                  </h3>
                  <div className="text-sm text-gray-600 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-lg text-left">
                    {getCurrentCard().cultural_note}
                  </div>
                </div>
              )}
              
              {/* Response buttons */}
              <div className="flex space-x-4 mt-6">
                <button
                  onClick={() => handleCardResponse(true)}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>I Know</span>
                </button>
                <button
                  onClick={() => handleCardResponse(false)}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>I Don't Know</span>
                </button>
              </div>
            </div>
          )}
        </div>


        {/* Add to Library Section - Show when user doesn't know */}
        {/* {!showAnswer && getCurrentCard() && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                Add "{getCurrentCard().term}" to Your Library?
              </h3>
              
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => addToLibrary(
                    getCurrentCard().term, 
                    getCurrentCard().definition, 
                    getCurrentCard().cultural_note
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
                  onClick={() => advanceToNextCard()}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        )} */}

        {/* Navigation */}
        {/* <div className="flex justify-between items-center mt-6">
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
        </div> */}
      </div>

      {/* NEW: Floating Dictionary Popup */}
      {showPopup && (
        <div
          className="fixed z-[99999] bg-white border border-gray-200 rounded-lg shadow-2xl max-w-sm p-4"
          style={{
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`,
            transform: 'translate(-50%, -100%)',
            maxHeight: '350px',
            overflowY: 'auto'
          }}
        >
          <div className="space-y-3">
            {/* Selected text */}
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex-1 mr-2">
                <div className="font-bold text-lg text-gray-900 break-words">"{selectedText}"</div>
              </div>
              <button
                onClick={closePopup}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Definition */}
            <div>
              <div className="text-xs font-medium text-green-700 mb-1 flex items-center">
                <span className="mr-1">📚</span>
                Definition
              </div>
              {isLoadingDefinition ? (
                <div className="text-xs text-gray-500">Loading...</div>
              ) : popupDefinition ? (
                <div className="text-xs text-gray-800 leading-relaxed break-words">
                  {popupDefinition}
                </div>
              ) : (
                <div className="text-xs text-gray-500">Not available</div>
              )}
            </div>

            {/* Translation */}
            {userLanguage && (
              <div className="border-t pt-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-purple-700 flex items-center">
                    <span className="mr-1">🌐</span>
                    Translation
                  </div>
                  <button
                    onClick={handleTranslate}
                    disabled={isTranslating}
                    className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                      popupTranslation 
                        ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    } disabled:opacity-50`}
                  >
                    {isTranslating ? 'Loading...' : popupTranslation ? 'Hide' : 'Show'}
                  </button>
                </div>
                
                {popupTranslation && (
                  <div className="bg-purple-50 p-2 rounded">
                    <div className="text-xs text-purple-800 font-medium break-words">
                      {popupTranslation}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* NEW: Session Summary Modal */}
      {showSessionSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Complete!</h2>
                <p className="text-gray-600">Great job studying your vocabulary</p>
              </div>

              {/* Statistics */}
              <div className="space-y-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Session Statistics</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Total Cards:</span>
                      <span className="ml-2 font-medium">{sessionStats.totalCards}</span>
                    </div>
                    <div>
                      <span className="text-green-700">Correct:</span>
                      <span className="ml-2 font-medium">{sessionStats.correctAnswers}</span>
                    </div>
                    {/* <div>
                      <span className="text-red-700">Incorrect:</span>
                      <span className="ml-2 font-medium">{sessionStats.incorrectAnswers}</span>
                    </div> */}
                    {/* <div>
                      <span className="text-purple-700">Accuracy:</span>
                      <span className="ml-2 font-medium">
                        {sessionStats.totalCards > 0 
                          ? Math.round((sessionStats.correctAnswers / sessionStats.totalCards) * 100)
                          : 0}%
                      </span>
                    </div> */}
                  </div>
                </div>

                {/* Struggled Words */}
                {sessionStats.struggledWords.length > 0 && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-yellow-900 mb-2">
                      You struggled with {sessionStats.struggledWords.length} words:
                    </h3>
                    <div className="space-y-1">
                      {sessionStats.struggledWords.map((word, index) => (
                        <div key={index} className="text-sm text-yellow-800">
                          • "{word.term}" - forgot {word.timesWrong} times
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowSessionSummary(false);
                    setSessionComplete(false);
                    // Restart session
                    initializeSpacedRepetition(vocabulary);
                  }}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-xl font-medium transition-colors"
                >
                  Study Again
                </button>
                <button
                  onClick={() => router.push(`/scenario/${id}/vocabulary-expressions`)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 px-4 rounded-xl font-medium transition-colors"
                >
                  Back to Vocabulary
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}