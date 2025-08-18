// components/SlangLoader.tsx
import React, { useState, useEffect } from 'react';

type Slang = {
  term: string;
  ipa_pronunciation?: string;
  definition: string;
  example_sentence: string;
  cultural_note?: string;
  difficulty_level?: string;
};

type SlangLoaderProps = {
  isLoading: boolean;
  onComplete?: () => void;
};

const SlangLoader: React.FC<SlangLoaderProps> = ({ isLoading, onComplete }) => {
  const [currentSlang, setCurrentSlang] = useState<Slang | null>(null);
  const [progress, setProgress] = useState(0);
  const [slangIndex, setSlangIndex] = useState(0);

  const fetchRandomSlang = async () => {
    try {
      const response = await fetch('/api/random-slang');
      const data = await response.json();
      
      if (data.success && data.slang) {
        setCurrentSlang(data.slang);
      }
    } catch (error) {
      console.error('Failed to fetch slang:', error);
    }
  };

  useEffect(() => {
    if (isLoading) {
      // Reset progress
      setProgress(0);
      setSlangIndex(0);
      
      // Fetch initial slang
      fetchRandomSlang();
      
      // Progress bar animation (8 seconds total)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 2.5; // Increment by 2.5% every 200ms
          if (newProgress >= 100) {
            clearInterval(progressInterval);
            if (onComplete) {
              setTimeout(onComplete, 500); // Small delay before calling onComplete
            }
            return 100;
          }
          return newProgress;
        });
      }, 200);

      // Change slang every 3.5 seconds (to show 2-3 slangs during 8s loading)
      const slangInterval = setInterval(() => {
        setSlangIndex(prev => prev + 1);
        fetchRandomSlang();
      }, 3500);

      // Cleanup
      return () => {
        clearInterval(progressInterval);
        clearInterval(slangInterval);
      };
    }
  }, [isLoading, onComplete]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            🎯 Analyzing Your Session...
          </h2>
          <p className="text-gray-600">
            Learning Canadian expressions while you wait!
          </p>
          <p className="text-gray-500 text-sm">
            Maybe there is an interesting slang you don't know
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-500 h-3 rounded-full transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-center text-sm text-gray-500 mt-2">
            {Math.round(progress)}% complete
          </p>
        </div>

        {/* Slang Content */}
        {currentSlang && (
          <div className="text-center space-y-4 min-h-32">
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-center justify-center mb-2">
                <span className="text-2xl mr-2">🇨🇦</span>
                <h3 className="text-lg font-bold text-blue-900">
                  "{currentSlang.term}"
                </h3>
              </div>
              
              {currentSlang.ipa_pronunciation && (
                <p className="text-blue-600 text-sm mb-2">
                  🔊 {currentSlang.ipa_pronunciation}
                </p>
              )}
              
              <p className="text-blue-800 font-medium mb-2">
                💡 {currentSlang.definition}
              </p>
              
              <p className="text-blue-700 italic text-sm mb-2">
                📝 "{currentSlang.example_sentence}"
              </p>
              
              {currentSlang.cultural_note && (
                <p className="text-blue-600 text-xs mb-2">
                  🏛️ {currentSlang.cultural_note}
                </p>
              )}
              
              {currentSlang.difficulty_level && (
                <span className="inline-block mt-2 px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full">
                  {currentSlang.difficulty_level}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Loading Animation */}
        <div className="flex justify-center mt-6">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlangLoader;