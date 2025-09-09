import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const LANGUAGES = [
  { code: 'zh', name: 'Chinese (中文)', flag: '🇨🇳' },
  { code: 'ko', name: 'Korean (한국어)', flag: '🇰🇷' },
  { code: 'ja', name: 'Japanese (日本語)', flag: '🇯🇵' },
  { code: 'hi', name: 'Hindi (हिन्दी)', flag: '🇮🇳' },
  { code: 'ar', name: 'Arabic (العربية)', flag: '🇸🇦' },
  { code: 'fr', name: 'French (Français)', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish (Español)', flag: '🇪🇸' },
  { code: 'pt', name: 'Portuguese (Português)', flag: '🇵🇹' },
  { code: 'de', name: 'German (Deutsch)', flag: '🇩🇪' },
  { code: 'ru', name: 'Russian (Русский)', flag: '🇷🇺' },
];

export default function LanguageSetup() {
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
    };
    getUser();
  }, [router]);

  const handleSave = async () => {
    if (!selectedLanguage || !user) return;
    
    setLoading(true);
    
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        native_language: selectedLanguage,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error saving language:', error);
    } else {
      router.push('/scenarios');
    }
    
    setLoading(false);
  };

  const handleSkip = () => {
    router.push('/scenarios');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-900">9:41</div>
            <h1 className="text-lg font-semibold text-gray-900">Setup</h1>
            <button onClick={handleSkip} className="text-gray-500 text-sm">
              Skip
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-md mx-auto w-full px-4 py-6 sm:py-8">
        {/* Character illustration area */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 flex items-center justify-center">
            {/* Character illustration similar to your Figma design */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-400 rounded-full flex items-center justify-center">
              <span className="text-2xl sm:text-3xl">👋</span>
            </div>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Your Native Language</h2>
          <p className="text-gray-600 text-sm px-2">
            This helps us provide better translations for your learning journey
          </p>
        </div>

        {/* Language Selection */}
        <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
          {LANGUAGES.map((language) => (
            <button
              key={language.code}
              onClick={() => setSelectedLanguage(language.code)}
              className={`w-full flex items-center p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 ${
                selectedLanguage === language.code
                  ? 'border-blue-500 bg-blue-50 scale-102'
                  : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <span className="text-xl sm:text-2xl mr-3 sm:mr-4">{language.flag}</span>
              <span className="text-left font-medium text-gray-900 flex-1 text-sm sm:text-base">
                {language.name}
              </span>
              {selectedLanguage === language.code && (
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Continue Button */}
      <div className="max-w-md mx-auto w-full px-4 pb-6 sm:pb-8">
        <button
          onClick={handleSave}
          disabled={!selectedLanguage || loading}
          className="w-full bg-blue-500 text-white py-3 sm:py-4 px-4 rounded-xl font-semibold text-base sm:text-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
