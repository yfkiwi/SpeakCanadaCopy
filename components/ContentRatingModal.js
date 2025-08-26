import { useState } from 'react';

const ContentRatingModal = ({ 
  contentType, 
  scenarioTitle, 
  isVisible, 
  onClose, 
  onSubmit 
}) => {
  const [ratings, setRatings] = useState({
    vocabulary: 0,
    expressions: 0,
    video: 0,
    roleplay: 0,
    quiz: 0
  });
  const [hoveredRating, setHoveredRating] = useState({});
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contentItems = [
    {
      key: 'vocabulary',
      label: 'Vocabulary',
      emoji: '📚'
    },
    {
      key: 'expressions',
      label: 'Expressions',
      emoji: '💭'
    },
    {
      key: 'video',
      label: 'Videos',
      emoji: '📺'
    },
    {
      key: 'roleplay',
      label: 'Role-play',
      emoji: '🎭'
    },
    {
      key: 'quiz',
      label: 'Quiz',
      emoji: '📝'
    }
  ];

  const handleRatingChange = (contentKey, rating) => {
    setRatings(prev => ({
      ...prev,
      [contentKey]: rating
    }));
  };

  const handleMouseEnter = (contentKey, rating) => {
    setHoveredRating(prev => ({
      ...prev,
      [contentKey]: rating
    }));
  };

  const handleMouseLeave = (contentKey) => {
    setHoveredRating(prev => ({
      ...prev,
      [contentKey]: 0
    }));
  };

  const handleSubmit = async () => {
    // at least one rating
    const hasRating = Object.values(ratings).some(rating => rating > 0);
    if (!hasRating) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        ratings,
        feedback: feedback.trim(),
        contentType,
        timestamp: new Date().toISOString()
      });
      onClose();
    } catch (error) {
      console.error('Failed to submit rating:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRatings({
      vocabulary: 0,
      expressions: 0,
      video: 0,
      roleplay: 0,
      quiz: 0
    });
    setFeedback('');
    setHoveredRating({});
    onClose();
  };

  const getTotalRatings = () => {
    return Object.values(ratings).filter(rating => rating > 0).length;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        className="bg-white rounded-2xl max-w-md w-full overflow-y-auto relative"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 p-6 pb-4">
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center">
            <div className="text-2xl mb-2">⭐</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Your feedback matters to us
            </h2>
            <p className="text-sm text-gray-600">
              {scenarioTitle}
            </p>
          </div>
        </div>

        {/* Content Ratings */}
        <div className="p-6 pt-4">
          <p className="text-sm text-gray-600 mb-4 text-center">
            Please rate the following content (optional)
          </p>

          <div className="space-y-4">
            {contentItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
                <div className="flex items-center space-x-2">
                  <span className="text-base">{item.emoji}</span>
                  <span className="font-medium text-gray-900 text-sm">
                    {item.label}
                  </span>
                </div>
                
                {/* Star Rating */}
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => handleMouseEnter(item.key, star)}
                      onMouseLeave={() => handleMouseLeave(item.key)}
                      onClick={() => handleRatingChange(item.key, star)}
                      className="p-1 transition-all duration-200 transform hover:scale-105"
                    >
                      <svg 
                        className={`w-4 h-4 transition-colors ${
                          star <= (hoveredRating[item.key] || ratings[item.key]) 
                            ? 'text-yellow-400 fill-current' 
                            : 'text-gray-300'
                        }`} 
                        fill={star <= (hoveredRating[item.key] || ratings[item.key]) ? 'currentColor' : 'none'}
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={1.5} 
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" 
                        />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Optional feedback */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional feedback (optional)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your thoughts and suggestions..."
              className="w-full p-3 border border-gray-200 rounded-lg resize-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              maxLength="300"
            />
            <div className="text-right text-xs text-gray-400 mt-1">
              {feedback.length}/300
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={getTotalRatings() === 0 || isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentRatingModal;