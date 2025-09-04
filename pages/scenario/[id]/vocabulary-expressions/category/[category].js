import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../../../lib/supabaseClient';

export default function CategoryVocabularyPage() {
  const router = useRouter();
  const { id, category } = router.query;
  const [scenario, setScenario] = useState(null);
  const [vocabulary, setVocabulary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTerms = vocabulary.filter(term =>
    term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    term.definition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pronunciation function
  const speakTerm = (term, event) => {
    // Prevent the card click event from firing
    if (event) {
      event.stopPropagation();
    }
    
    if ('speechSynthesis' in window) {
      // Stop any currently playing speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(term);
      utterance.rate = 0.8;
      utterance.lang = 'en-CA';
      speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (!id || !category) return;
    
    const fetchData = async () => {
      try {
        console.log('Fetching scenario with numeric_id:', id);
        console.log('Category:', decodeURIComponent(category));
        
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
          const decodedCategory = decodeURIComponent(category);
          
          // Fetch vocabulary for this category
          const vocabularyScenario = scenarioData.scenario_key || scenarioData.title;
          const { data: vocabularyData, error: vocabularyError } = await supabase
            .from('vocabulary_combined')
            .select('*')
            .eq('scenario', vocabularyScenario)
            .eq('category', decodedCategory)
            .order('term');

          if (vocabularyError) {
            console.error('Error fetching vocabulary:', vocabularyError);
            return;
          }

          console.log('Vocabulary for category:', vocabularyData);
          setVocabulary(vocabularyData || []);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, category]);

  const openTermModal = (term) => {
    setSelectedTerm(term);
  };

  const closeTermModal = () => {
    setSelectedTerm(null);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading vocabulary...</p>
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

  const decodedCategory = decodeURIComponent(category);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Same style as word-list */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => router.push(`/scenario/${id}/vocabulary-expressions/categories`)}
                className="text-gray-600 hover:text-gray-800"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{decodedCategory}</h1>
                <p className="text-sm text-gray-500">{scenario.title}</p>
              </div>
            </div>
            <div className="text-sm font-medium text-gray-900">
              {vocabulary.length} words
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar - Same as word-list */}
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search vocabulary words..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Vocabulary List - Same style as word-list */}
      <div className="max-w-md mx-auto px-4 pb-6">
        <div className="space-y-3">
          {filteredTerms.map((term) => (
            <button
              key={term.id}
              onClick={() => openTermModal(term)}
              className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{term.term}</h3>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{term.definition}</p>
                  {term.ipa_pronunciation && (
                    <p className="text-xs text-gray-500 mt-1">{term.ipa_pronunciation}</p>
                  )}
                </div>
                
                {/* Pronunciation Button and Arrow - Same as word-list */}
                <div className="flex items-center space-x-2 ml-3">
                  <button
                    onClick={(e) => speakTerm(term.term, e)}
                    className="w-8 h-8 flex items-center justify-center text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-200 flex-shrink-0"
                    title="Listen to pronunciation"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.82L4.104 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.104l4.279-3.82a1 1 0 011.617.82zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.984 3.984 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        {filteredTerms.length === 0 && !loading && vocabulary.length > 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No vocabulary words found matching your search.</p>
          </div>
        )}

        {vocabulary.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No vocabulary found for this category</p>
          </div>
        )}
      </div>

      {/* Modal for Term Details - Same as word-list */}
      {selectedTerm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">{selectedTerm.term}</h2>
                {selectedTerm.ipa_pronunciation && (
                  <p className="text-sm text-gray-500">{selectedTerm.ipa_pronunciation}</p>
                )}
              </div>
              <button
                onClick={closeTermModal}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 ml-4"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Definition */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Definition</h3>
                <p className="text-gray-700 leading-relaxed">{selectedTerm.definition}</p>
              </div>

              {/* Example Sentence */}
              {selectedTerm.example_sentence && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Example Sentence</h3>
                  <div className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    <span className="italic">{selectedTerm.example_sentence}</span>
                  </div>
                </div>
              )}

              {/* Cultural Note */}
              {selectedTerm.cultural_note && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Cultural Note</h3>
                  <div className="text-gray-700 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-lg">
                    <p className="text-sm">{selectedTerm.cultural_note}</p>
                  </div>
                </div>
              )}

              {/* Pronunciation Button */}
              <button 
                onClick={() => speakTerm(selectedTerm.term)}
                className="w-full bg-blue-500 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a1 1 0 01-1-1V9a1 1 0 011-1h1a1 1 0 011 1v.001L15.536 6.464" />
                </svg>
                <span>Listen to Pronunciation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}