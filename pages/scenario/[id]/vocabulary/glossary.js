import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabaseClient';

export default function VocabularyGlossaryPage() {
  const router = useRouter();
  const { id } = router.query;
  const [scenario, setScenario] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [vocabularyTerms, setVocabularyTerms] = useState([]);
  const [loading, setLoading] = useState(true);

  const filteredTerms = vocabularyTerms.filter(term =>
    term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    term.definition.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            setVocabularyTerms(vocabularyData || []);
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
                <h1 className="text-lg font-semibold text-gray-900">Vocabulary Glossary</h1>
                <p className="text-sm text-gray-500">{scenario.title}</p>
              </div>
            </div>
            <div className="text-sm font-medium text-gray-900">
              {vocabularyTerms.length} terms
            </div>
          </div>
        </div>
      </div>

      {/* Debug info - shows only if no vocabulary found */}
      {vocabularyTerms.length === 0 && !loading && (
        <div className="max-w-md mx-auto px-4 py-2">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
            <p className="text-yellow-700 font-medium">Debug Info:</p>
            <p className="text-yellow-600 text-xs mt-1">
              Scenario: {scenario.title}<br/>
              Scenario Key: {scenario.scenario_key || 'Not set'}<br/>
              Numeric ID: {scenario.numeric_id}
            </p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search vocabulary terms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Vocabulary List */}
      <div className="max-w-md mx-auto px-4 pb-6">
        <div className="space-y-3">
          {filteredTerms.map((term) => (
            <button
              key={term.id}
              onClick={() => openTermModal(term)}
              className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{term.term}</h3>
                    {term.difficulty_level && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {term.difficulty_level}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{term.definition}</p>
                  {term.ipa_pronunciation && (
                    <p className="text-xs text-gray-500 mt-1">{term.ipa_pronunciation}</p>
                  )}
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {filteredTerms.length === 0 && !loading && vocabularyTerms.length > 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No vocabulary terms found matching your search.</p>
          </div>
        )}

        {vocabularyTerms.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No vocabulary found for this scenario</p>
          </div>
        )}
      </div>

      {/* Modal for Term Details */}
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
              {/* Difficulty Level Badge */}
              {selectedTerm.difficulty_level && (
                <div className="mb-4">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-medium">
                    Level: {selectedTerm.difficulty_level}
                  </span>
                </div>
              )}

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
                    <span className="italic">"{selectedTerm.example_sentence}"</span>
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
                onClick={() => {
                  if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(selectedTerm.term);
                    utterance.rate = 0.8;
                    utterance.lang = 'en-CA';
                    speechSynthesis.speak(utterance);
                  }
                }}
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