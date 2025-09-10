import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ReviewPage() {
  const router = useRouter();
  const [libraryWords, setLibraryWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupedWords, setGroupedWords] = useState({});
  const [selectedWord, setSelectedWord] = useState(null);

  useEffect(() => {
    const fetchLibraryWords = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: libraryData, error: libraryError } = await supabase
            .from('user_vocabulary_library')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

          if (!libraryError) {
            setLibraryWords(libraryData || []);
          }
        }
      } catch (error) {
        console.error('Error fetching library words:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLibraryWords();
  }, []);

  // Group words by scenario and filter by search term
  useEffect(() => {
    const filtered = libraryWords.filter(word => 
      word.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (word.definition && word.definition.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const grouped = filtered.reduce((acc, word) => {
      const scenario = word.scenario_key || 'Other';
      if (!acc[scenario]) {
        acc[scenario] = [];
      }
      acc[scenario].push(word);
      return acc;
    }, {});

    setGroupedWords(grouped);
  }, [libraryWords, searchTerm]);

  // Remove word from library
  const removeFromLibrary = async (wordId) => {
    try {
      const { error } = await supabase
        .from('user_vocabulary_library')
        .delete()
        .eq('id', wordId);

      if (!error) {
        setLibraryWords(prev => prev.filter(word => word.id !== wordId));
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
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading your saved words...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-center">
          <h1 className="text-lg font-semibold text-gray-900">Review</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto w-full flex-1 px-4 py-6">
        {/* Header with word count */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Your Saved Words</h2>
          <p className="text-sm text-gray-600">{libraryWords.length} words collected</p>
        </div>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search your saved words..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base mb-5 bg-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
        />

        {/* Content */}
        {Object.keys(groupedWords).length > 0 ? (
          <div className="space-y-6 pb-20">
            {Object.entries(groupedWords).map(([scenario, words]) => (
              <div key={scenario} className="space-y-3">
                {/* Scenario Header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <h3 className="text-base font-semibold text-gray-800">{scenario}</h3>
                </div>
                
                {/* Words in this scenario */}
                <div className="space-y-2">
                  {words.map((word) => (
                    <div
                      key={word.id}
                      className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all duration-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5"
                      onClick={() => openWordModal(word)}
                    >
                      <div className="flex-1">
                        <h4 className="text-base font-medium text-gray-800">
                          {word.term}
                        </h4>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speakWord(word.term);
                        }}
                        className="w-9 h-9 bg-blue-50 hover:bg-blue-500 hover:text-white border border-blue-200 rounded-full flex items-center justify-center transition-all duration-200 text-blue-600 hover:scale-110 ml-3"
                        title="Listen to pronunciation"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" strokeLinejoin="round" />
                          <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 pb-20">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              {searchTerm ? 'No words found' : 'Your library is empty'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Start using flashcards to collect words you want to remember'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => router.push('/scenarios')}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md"
              >
                Start Learning
              </button>
            )}
          </div>
        )}
      </div>

      {/* Word Detail Modal */}
      {selectedWord && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-5 z-[9999]"
          onClick={closeWordModal}
        >
          <div 
            className="bg-white border border-gray-200 rounded-2xl p-6 max-w-sm w-full max-h-[85vh] overflow-y-auto transform transition-all duration-300 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-5">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {selectedWord.term}
                  </h2>
                  <button
                    onClick={() => speakWord(selectedWord.term)}
                    className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                    title="Listen to pronunciation"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                {selectedWord.ipa_pronunciation && (
                  <p className="text-blue-600 font-medium italic font-mono text-base">
                    {selectedWord.ipa_pronunciation}
                  </p>
                )}
              </div>
              <button
                onClick={closeWordModal}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-5">
              <div data-word-lookup="enabled" style={{ userSelect: 'text' }}>
                <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
                  Definition
                </h3>
                <p className="text-gray-800 leading-relaxed text-base">
                  {selectedWord.definition}
                </p>
              </div>

              {selectedWord.cultural_note && (
                <div data-word-lookup="enabled" style={{ userSelect: 'text' }}>
                  <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
                    Cultural Note
                  </h3>
                  <div className="bg-amber-50 border-l-4 border-blue-400 p-4 rounded-lg text-gray-800 leading-relaxed shadow-sm text-sm">
                    {selectedWord.cultural_note}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center pt-5 mt-6 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold border border-blue-200">
                  {selectedWord.source === 'system' ? 'System' : 'Custom'}
                </span>
                <span className="text-xs text-gray-600">
                  Added {getDaysAgo(selectedWord.created_at)} ago
                </span>
              </div>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this word from your vocabulary?')) {
                    removeFromLibrary(selectedWord.id);
                  }
                }}
                className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keep existing Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-md mx-auto px-4">
          <div className="flex justify-around py-2">
            <button 
              onClick={() => router.push('/')} 
              className={`flex flex-col items-center py-2 px-3 ${router.pathname === '/' ? 'text-orange-500 font-medium' : 'text-gray-400'}`}
            >
              <svg className={`w-6 h-6 ${router.pathname === '/' ? 'text-orange-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className={`text-xs mt-1 ${router.pathname === '/' ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>Home</span>
            </button>
            <button 
              onClick={() => router.push('/scenarios')}
              className={`flex flex-col items-center py-2 px-3 ${router.pathname === '/scenarios' ? 'text-orange-500 font-medium' : 'text-gray-400'}`}
            >
              <svg className={`w-6 h-6 ${router.pathname === '/scenarios' ? 'text-orange-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className={`text-xs mt-1 ${router.pathname === '/scenarios' ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>Scenario</span>
            </button>
            <button 
              onClick={() => router.push('/review')}
              className={`flex flex-col items-center py-2 px-3 ${router.pathname === '/review' ? 'text-orange-500 font-medium' : 'text-gray-400'}`}
            >
              <svg className={`w-6 h-6 ${router.pathname === '/review' ? 'text-orange-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className={`text-xs mt-1 ${router.pathname === '/review' ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>Review</span>
            </button>
            <button 
              onClick={() => router.push('/me')}
              className={`flex flex-col items-center py-2 px-3 ${router.pathname === '/me' ? 'text-orange-500 font-medium' : 'text-gray-400'}`}
            >
              <svg className={`w-6 h-6 ${router.pathname === '/me' ? 'text-orange-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className={`text-xs mt-1 ${router.pathname === '/me' ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>Me</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}