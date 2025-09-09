import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import React from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { awardVocabularyPoints } from '../../../../utils/pointSystem';

// Person Icon Component - shows individual person silhouette
const PersonIcon = ({ size = 12, color = '#6B7280' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" fill={color}/>
    <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" fill={color}/>
  </svg>
);

export default function CommonExpressionsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [scenario, setScenario] = useState(null);
  const [expressions, setExpressions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [selectedExpression, setSelectedExpression] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Completion state
  const [pointsAwarded, setPointsAwarded] = useState(false);
  const [checkingCompletion, setCheckingCompletion] = useState(true);

  // Filter expressions based on category and search
  const filteredExpressions = expressions.filter(expr => {
    const matchesCategory = selectedCategory === 'all' || expr.category === selectedCategory;
    const searchText = expr.when_to_use || expr.situation || '';
    const matchesSearch = expr.expression.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        searchText.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Function to get category details
  const getCategoryDetails = (categoryName) => {
    return categories.find(cat => cat.category_name === categoryName) || {
      category_icon: '💬',
      category_color: '#6B7280'
    };
  };

  // Function to open modal with expression details
  const openModal = (expression) => {
    setSelectedExpression(expression);
    setIsModalOpen(true);
  };

  // Function to close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedExpression(null);
  };

  // Helper function to get formality level display
  const getFormalityDisplay = (level) => {
    const levels = {
      1: { text: 'Very Casual', icon: '😊' },
      2: { text: 'Casual', icon: '🙂' },
      3: { text: 'Neutral', icon: '😐' },
      4: { text: 'Formal', icon: '🙂' },
      5: { text: 'Very Formal', icon: '🎩' }
    };
    return levels[level] || levels[3];
  };

  // Helper function for usage description
  const getUsageDescription = (frequency) => {
    const descriptions = {
      5: "Used very frequently - you'll hear this almost every day!",
      4: "Commonly used - you'll hear this regularly.",
      3: "Moderately common - useful to know.",
      2: "Less common - useful for specific situations.",
      1: "Rarely used - good to know but not essential."
    };
    return descriptions[frequency] || descriptions[3];
  };

  // Helper function for audio playback
  const playAudio = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.lang = 'en-CA';
      speechSynthesis.speak(utterance);
    }
  };

  // Handle completion button click
  const handleCompleteExpressions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && scenario && !pointsAwarded) {
        const result = await awardVocabularyPoints(session.user.id, scenario.id, 'expressions_exploration', supabase);
        if (result.success) {
          console.log('💬 Expressions completed! Points awarded:', result.points);
          setPointsAwarded(true);
          
          // Show success message
          alert(`Excellent! You've earned 2 points for completing expressions. Total points: ${result.points}/10`);
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
      console.error('Failed to award expressions points:', error);
      alert('Failed to complete expressions. Please try again.');
    }
  };

  // Modal component (keeping existing modal code)
  const ExpressionModal = ({ expression, isOpen, onClose }) => {
    if (!isOpen || !expression) return null;

    const categoryDetails = getCategoryDetails(expression.category);
    const formalityInfo = getFormalityDisplay(expression.formality_level);

    // Parse arrays from database (if they're stored as JSON strings)
    const parseArray = (str) => {
      if (!str) return [];
      try {
        return typeof str === 'string' ? JSON.parse(str) : str;
      } catch {
        return str.split(',').map(s => s.trim()).filter(Boolean);
      }
    };

    const commonResponses = parseArray(expression.common_responses);
    const followUpExpressions = parseArray(expression.follow_up_expressions);
    const alternativeExpressions = parseArray(expression.alternative_expressions);

    // Prevent background scrolling when modal is open
    React.useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
      
      // Cleanup on unmount
      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [isOpen]);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col">
          {/* Modal Header - Fixed */}
          <div className="bg-white border-b border-gray-200 p-4 rounded-t-2xl flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{categoryDetails.category_icon}</span>
                <div>
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      {Array.from({length: 5}, (_, i) => {
                        const frequency = parseInt(expression.usage_frequency) || 0;
                        const isFilled = i < frequency;
                        return (
                          <div 
                            key={i}
                            className={`w-2 h-2 rounded-full border-2 ${
                              isFilled
                                ? 'bg-orange-500 border-orange-500' 
                                : 'border-orange-300'
                            }`}
                            style={{
                              backgroundColor: isFilled ? '#f97316' : 'transparent',
                              borderColor: '#fdba74'
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Modal Content - Scrollable with visible scrollbar */}
          <div 
            className="overflow-y-scroll p-4 space-y-6"
            style={{
              height: '75vh',
              scrollbarWidth: 'thin',
              scrollbarColor: '#CBD5E0 #F7FAFC'
            }}
          >
            {/* Expression Title */}
            <div data-word-lookup="enabled" style={{ userSelect: 'text' }}>
              <h2 className="text-xl font-bold text-gray-900 mb-2 break-words">
                "{expression.expression}"
              </h2>
              <p className="text-gray-600 mb-3 break-words">
                {expression.when_to_use}
              </p>
              {expression.tone_description && (
                <p className="text-sm text-purple-600 bg-purple-50 p-2 rounded-lg break-words">
                  <span className="font-medium">Tone:</span> {expression.tone_description}
                </p>
              )}
            </div>

            {/* Level & Category Tags */}
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center">
                <span className="mr-1">{formalityInfo.icon}</span>
                {formalityInfo.text}
              </span>
              <span 
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{ 
                  backgroundColor: categoryDetails.category_color + '20',
                  color: categoryDetails.category_color
                }}
              >
                #{expression.category?.replace('_', ' ')}
              </span>
            </div>

            {/* What You Might Hear Back */}
            {commonResponses.length > 0 && (
              <div data-word-lookup="enabled" style={{ userSelect: 'text' }}>
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-purple-600">👥</span>
                  <h3 className="font-semibold text-gray-900">What You Might Hear Back</h3>
                </div>
                <div className="space-y-2">
                  {commonResponses.slice(0, 3).map((response, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-gray-700 italic break-words">"{response}"</p>
                      <button 
                        onClick={() => playAudio(response)}
                        className="text-blue-500 hover:text-blue-600 text-sm mt-1"
                      >
                        🔊
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cultural Note */}
            {expression.cultural_note && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg" data-word-lookup="enabled" style={{ userSelect: 'text' }}>
                <div className="flex items-start space-x-2">
                  <span className="text-yellow-600">🇨🇦</span>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Cultural Insight</h4>
                    <p className="text-gray-700 text-sm break-words">
                      {expression.cultural_note}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Alternative Expressions */}
            {alternativeExpressions.length > 0 && (
              <div data-word-lookup="enabled" style={{ userSelect: 'text' }}>
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-blue-600">🔄</span>
                  <h3 className="font-semibold text-gray-900">Other Ways to Say It</h3>
                </div>
                <div className="space-y-2">
                  {alternativeExpressions.slice(0, 3).map((alternative, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <span className="text-gray-700 break-words flex-1 mr-2">"{alternative}"</span>
                      <button 
                        onClick={() => playAudio(alternative)}
                        className="text-blue-500 hover:text-blue-600 flex-shrink-0"
                      >
                        🔊
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up Expressions */}
            {followUpExpressions.length > 0 && (
              <div data-word-lookup="enabled" style={{ userSelect: 'text' }}>
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-green-600">💬</span>
                  <h3 className="font-semibold text-gray-900">What to Say Next</h3>
                </div>
                <div className="space-y-2">
                  {followUpExpressions.slice(0, 3).map((followUp, index) => (
                    <div key={index} className="bg-green-50 p-3 rounded-lg">
                      <p className="text-gray-700 break-words">"{followUp}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Usage Frequency */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-orange-600">📊</span>
                <h3 className="font-semibold text-gray-900">How Common Is This?</h3>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-medium text-gray-900">Usage Frequency:</span>
                  <div className="flex space-x-1">
                    {Array.from({length: 5}, (_, i) => {
                      const frequency = parseInt(expression.usage_frequency) || 0;
                      const isFilled = i < frequency;
                      return (
                        <PersonIcon 
                          key={i}
                          size={16}
                          color={isFilled ? '#f97316' : '#d1d5db'}
                        />
                      );
                    })}
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  {getUsageDescription(expression.usage_frequency)}
                </p>
              </div>
            </div>

            {/* Body Language Tips */}
            {expression.body_language_tips && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg" data-word-lookup="enabled" style={{ userSelect: 'text' }}>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-600">🤝</span>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Body Language Tips</h4>
                    <p className="text-gray-700 text-sm break-words">
                      {expression.body_language_tips}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Pronunciation Tips */}
            {expression.ipa_pronunciation && (
              <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-r-lg" data-word-lookup="enabled" style={{ userSelect: 'text' }}>
                <div className="flex items-start space-x-2">
                  <span className="text-purple-600">🗣️</span>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Pronunciation</h4>
                    <p className="text-gray-700 text-sm font-mono">
                      {expression.ipa_pronunciation}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Practice Section */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-green-600">🎯</span>
                <h3 className="font-semibold text-gray-900">Practice This Expression</h3>
              </div>
              <div className="space-y-3">
                <button 
                  onClick={() => playAudio(expression.expression)}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <span>🔊</span>
                  <span>📍</span>
                  <span>Listen & Repeat</span>
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => router.push(`/scenario/${id}/roleplay`)}
                    className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>💬</span>
                    <span className="text-sm">Role Play</span>
                  </button>
                  <button 
                    onClick={() => alert('Added to your practice list!')}
                    className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>💾</span>
                    <span className="text-sm">Save</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Tags Footer */}
            {expression.tags && typeof expression.tags === 'string' && expression.tags.trim() && (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">Tags:</p>
                <div className="flex flex-wrap gap-2">
                  {expression.tags.split(',').map((tag, index) => (
                    <span key={index} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                      #{tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const { data: scenarioData, error: scenarioError } = await supabase
          .from('scenarios')
          .select('*')
          .eq('numeric_id', parseInt(id))
          .single();

        if (scenarioError || !scenarioData) {
          setError('Scenario not found');
          setLoading(false);
          return;
        }

        setScenario(scenarioData);

        // Fetch expressions
        const { data: expressionsData, error: expressionsError } = await supabase
          .from('common_expressions')
          .select('*')
          .eq('scenario', scenarioData.title)
          .order('order_sequence');

        if (!expressionsError && expressionsData) {
          setExpressions(expressionsData);
        }

        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('expression_categories')
          .select('*')
          .eq('scenario', scenarioData.title)
          .order('display_order');

        if (!categoriesError && categoriesData) {
          setCategories(categoriesData);
        }

        // Check if user has already completed expressions exploration
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
              if (completedActivities['expressions_exploration']) {
                setPointsAwarded(true);
              }
            }
          }
        } catch (error) {
          console.error('Error checking completion status:', error);
        }

      } catch (error) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
        setCheckingCompletion(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading || checkingCompletion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading expressions...</p>
        </div>
      </div>
    );
  }

  if (error || !scenario) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Scenario not found'}</p>
          <button 
            onClick={() => router.push('/scenarios')}
            className="text-blue-500 hover:text-blue-600 underline"
          >
            Go back to scenarios
          </button>
        </div>
      </div>
    );
  }

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
                <h1 className="text-lg font-semibold text-gray-900">Common Expressions</h1>
                <p className="text-sm text-gray-500">{scenario.title}</p>
              </div>
            </div>
            
            {/* Complete Button */}
            {!pointsAwarded && expressions.length > 0 && (
              <button
                onClick={handleCompleteExpressions}
                className="bg-purple-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 flex items-center space-x-2 shadow-sm"
                title="Mark as complete and earn 2 points"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Complete</span>
              </button>
            )}
            
            {/* Show phrase count when completed or no completion button needed */}
            {(pointsAwarded || expressions.length === 0) && (
              <div className="text-sm font-medium text-gray-900">
                {filteredExpressions.length} phrases
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search expressions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Categories Filter */}
      {categories.length > 0 && (
        <div className="max-w-md mx-auto px-4 pb-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Filter by Category</h3>
          <div className="grid grid-cols-2 gap-2">
            {/* All Categories Button */}
            <button
              onClick={() => setSelectedCategory('all')}
              className={`p-3 rounded-lg border-2 transition-all text-center ${
                selectedCategory === 'all'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-lg mb-1">📋</div>
              <div className="text-sm font-medium text-gray-900">All</div>
              <div className="text-xs text-gray-500">{expressions.length} total</div>
            </button>

            {/* Individual Category Buttons */}
            {categories.map(category => {
              const categoryExpressions = expressions.filter(expr => expr.category === category.category_name);
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.category_name)}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    selectedCategory === category.category_name
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-lg mb-1">{category.category_icon}</div>
                  <div className="text-sm font-medium text-gray-900 capitalize">
                    {category.category_name.replace('_', ' ')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {categoryExpressions.length} phrases
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="max-w-md mx-auto px-4 pb-4">
        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
          <div className="flex items-center">
            <span className="text-blue-600 mr-2">💡</span>
            <p className="text-sm text-blue-700">
              {selectedCategory === 'all' 
                ? `Showing all ${filteredExpressions.length} expressions`
                : `Showing ${filteredExpressions.length} expressions in #${selectedCategory.replace('_', ' ')}`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Expression List */}
      <div className="max-w-md mx-auto px-4 pb-6">
        {filteredExpressions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-gray-500 mb-2">No expressions found</p>
            <p className="text-sm text-gray-400">
              {searchTerm ? 'Try adjusting your search terms' : 'No expressions in this category'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExpressions.map((expression, index) => {
              const categoryDetails = getCategoryDetails(expression.category);
              return (
                <button
                  key={expression.id || index}
                  onClick={() => openModal(expression)}
                  className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:shadow-md transition-all duration-200 text-left"
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl flex-shrink-0">{categoryDetails.category_icon}</span>
                    {/* 只在表达式文本部分启用选词 */}
                    <div className="flex-1 min-w-0" data-word-lookup="enabled" style={{ userSelect: 'text' }}>
                      <h3 className="font-semibold text-gray-900 text-base mb-2 break-words">
                        "{expression.expression}"
                      </h3>
                      <p className="text-sm text-gray-600 mb-3 break-words overflow-wrap-anywhere">
                        <span className="font-medium">When to use:</span> {expression.when_to_use || expression.situation}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span 
                            className="text-xs px-2 py-1 rounded-full font-medium break-all"
                            style={{ 
                              backgroundColor: categoryDetails.category_color + '20',
                              color: categoryDetails.category_color
                            }}
                          >
                            #{expression.category?.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <span className="text-xs text-gray-500">How common:</span>
                          <div className="flex space-x-1" title="Usage frequency">
                            {Array.from({length: 5}, (_, i) => {
                              const frequency = parseInt(expression.usage_frequency) || 0;
                              const isFilled = i < frequency;
                              return (
                                <PersonIcon 
                                  key={i}
                                  size={12}
                                  color={isFilled ? '#f97316' : '#d1d5db'}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Reset Filters Button */}
      {(selectedCategory !== 'all' || searchTerm) && (
        <div className="fixed bottom-6 right-6">
          <button 
            onClick={() => {
              setSelectedCategory('all');
              setSearchTerm('');
            }}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-sm">Clear Filters</span>
          </button>
        </div>
      )}

      {/* Expression Modal */}
      <ExpressionModal 
        expression={selectedExpression}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
}