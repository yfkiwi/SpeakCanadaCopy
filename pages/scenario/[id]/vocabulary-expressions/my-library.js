import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabaseClient';

export default function MyLibraryPage() {
  const router = useRouter();
  const { id } = router.query;
  const [scenario, setScenario] = useState(null);
  const [libraryWords, setLibraryWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredWords, setFilteredWords] = useState([]);
  const [selectedWord, setSelectedWord] = useState(null);

  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      try {
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

        setScenario(scenarioData);

        // Fetch user's library words for this scenario
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const scenarioKey = scenarioData.scenario_key || scenarioData.title;
          const { data: libraryData, error: libraryError } = await supabase
            .from('user_vocabulary_library')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('scenario_key', scenarioKey)
            .order('created_at', { ascending: false });

          if (!libraryError) {
            setLibraryWords(libraryData || []);
            setFilteredWords(libraryData || []);
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

  // Filter words based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredWords(libraryWords);
    } else {
      const filtered = libraryWords.filter(word => 
        word.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (word.definition && word.definition.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredWords(filtered);
    }
  }, [searchTerm, libraryWords]);

  // Remove word from library
  const removeFromLibrary = async (wordId) => {
    try {
      const { error } = await supabase
        .from('user_vocabulary_library')
        .delete()
        .eq('id', wordId);

      if (!error) {
        setLibraryWords(prev => prev.filter(word => word.id !== wordId));
        setFilteredWords(prev => prev.filter(word => word.id !== wordId));
        if (selectedWord && selectedWord.id === wordId) {
          setSelectedWord(null);
        }
      }
    } catch (error) {
      console.error('Error removing word:', error);
    }
  };

  // Speak word function
  const speakWord = (term) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(term);
      utterance.rate = 0.8;
      utterance.lang = 'en-CA';
      speechSynthesis.speak(utterance);
    }
  };

  // Modal functions
  const openWordModal = (word) => {
    setSelectedWord(word);
  };

  const closeWordModal = () => {
    setSelectedWord(null);
  };

  // Get days ago helper
  const getDaysAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day';
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
    return `${Math.floor(diffDays / 365)} years`;
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-emerald-50 to-green-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <p className="text-emerald-700">Loading your library...</p>
      </div>
    </div>
  );

  if (!scenario) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-emerald-50 to-green-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-emerald-700 mb-4">Scenario not found</p>
        <button
          onClick={() => router.push('/scenarios')}
          className="text-emerald-600 hover:text-emerald-700 underline"
        >
          Go back to scenarios
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 100%)' }}>
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-md shadow-sm border-b border-emerald-100/50">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push(`/scenario/${id}/vocabulary-expressions`)}
                className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-emerald-800">My Vocabulary</h1>
                <p className="text-sm text-emerald-600">Personal collection</p>
              </div>
            </div>
            <div className="text-sm font-medium text-emerald-800">
              {filteredWords.length} words
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-md mx-auto px-4 py-4">
        <input
          type="text"
          placeholder="Search your words..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full px-4 py-3 border border-emerald-200 rounded-2xl leading-5 bg-white/60 backdrop-blur-sm placeholder-emerald-600 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white/80 transition-all duration-200 shadow-sm"
        />
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 pb-6">
        {filteredWords.length > 0 ? (
          <div className="space-y-2">
            {filteredWords.map((word) => (
              <div
                key={word.id}
                className="bg-white/60 backdrop-blur-md border border-emerald-100/50 rounded-xl p-3 hover:border-emerald-300 hover:shadow-lg hover:bg-white/80 transition-all duration-200 cursor-pointer transform hover:-translate-y-0.5 hover:scale-[1.02]"
                onClick={() => openWordModal(word)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-emerald-800">
                      {word.term}
                    </h3>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speakWord(word.term);
                    }}
                    className="w-8 h-8 bg-emerald-50 hover:bg-emerald-500 hover:text-white border border-emerald-200 rounded-full flex items-center justify-center transition-all duration-200 text-emerald-600 hover:scale-110"
                    title="Listen to pronunciation"
                  >
                    {/* Geometric audio icon - diamond with dot */}
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L14 8L20 10L14 12L12 18L10 12L4 10L10 8L12 2Z"/>
                      <circle cx="12" cy="10" r="2"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-emerald-100/70 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-emerald-800 mb-2">
              {searchTerm ? 'No words found' : 'Your library is empty'}
            </h3>
            <p className="text-emerald-600 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Start using flashcards to collect words you want to remember'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => router.push(`/scenario/${id}/vocabulary-expressions/flashcard-categories`)}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-2 rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 shadow-md"
              >
                Start Flashcards
              </button>
            )}
          </div>
        )}
      </div>

      {/* Word Detail Modal */}
      {selectedWord && (
        <div className="fixed inset-0 bg-emerald-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl border border-emerald-200 rounded-3xl p-7 max-w-md w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-emerald-800">
                    {selectedWord.term}
                  </h2>
                  <button
                    onClick={() => speakWord(selectedWord.term)}
                    className="w-8 h-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                  >
                    {/* Geometric audio icon - diamond with dot */}
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L14 8L20 10L14 12L12 18L10 12L4 10L10 8L12 2Z"/>
                      <circle cx="12" cy="10" r="2"/>
                    </svg>
                  </button>
                </div>
                {selectedWord.ipa_pronunciation && (
                  <p className="text-emerald-600 font-medium italic">
                    {selectedWord.ipa_pronunciation}
                  </p>
                )}
              </div>
              <button
                onClick={closeWordModal}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full flex items-center justify-center transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">
                  Definition
                </h3>
                <p className="text-emerald-800 leading-relaxed">
                  {selectedWord.definition}
                </p>
              </div>

              {selectedWord.cultural_note && (
                <div>
                  <h3 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">
                    Cultural Note
                  </h3>
                  <div className="bg-gradient-to-r from-amber-50 to-emerald-50 border-l-4 border-emerald-400 p-4 rounded-r-xl text-emerald-800 leading-relaxed shadow-sm">
                    {selectedWord.cultural_note}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-6 mt-6 border-t border-emerald-200">
              <div className="flex items-center gap-3">
                <span className="bg-gradient-to-r from-blue-100 to-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-200">
                  {selectedWord.source === 'system' ? 'System' : 'Custom'}
                </span>
                <span className="text-xs text-emerald-600">
                  Added {getDaysAgo(selectedWord.created_at)} ago
                </span>
              </div>
              <button
                onClick={() => removeFromLibrary(selectedWord.id)}
                className="bg-gradient-to-r from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Placeholder */}
      <div className="h-20"></div>
    </div>
  );
}
