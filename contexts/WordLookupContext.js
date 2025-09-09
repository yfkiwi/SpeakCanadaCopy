import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { supabase } from '../lib/supabaseClient';

const WordLookupContext = createContext();

export const useWordLookup = () => {
  const context = useContext(WordLookupContext);
  if (!context) {
    throw new Error('useWordLookup must be used within a WordLookupProvider');
  }
  return context;
};

export const WordLookupProvider = ({ children }) => {
  const [selectedText, setSelectedText] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [definition, setDefinition] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [examples, setExamples] = useState([]);
  const [translation, setTranslation] = useState('');
  const [showTranslation, setShowTranslation] = useState(false);
  const [userLanguage, setUserLanguage] = useState('');
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  
  const { translate, isTranslating } = useTranslation();
  const tooltipRef = useRef(null);

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

  const fetchDefinition = async (word) => {
    try {
      setIsLoadingDefinition(true);
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data[0]) {
          const entry = data[0];
          if (entry.phonetics && entry.phonetics[0]) {
            setPhonetic(entry.phonetics[0].text || '');
          }
          if (entry.meanings && entry.meanings[0]) {
            const meaning = entry.meanings[0];
            const def = meaning.definitions[0];
            setDefinition(def.definition);
            const exampleList = [];
            if (def.example) exampleList.push(def.example);
            meaning.definitions.slice(1, 3).forEach(d => { if (d.example) exampleList.push(d.example); });
            setExamples(exampleList);
          }
        }
      } else {
        setDefinition('No definition found');
      }
    } catch (error) {
      console.error('Failed to fetch definition:', error);
      setDefinition('Failed to load definition');
    } finally {
      setIsLoadingDefinition(false);
    }
  };

  const handleTranslateRequest = async () => {
    if (!showTranslation && userLanguage && selectedText) {
      const translationResult = await translate(selectedText, userLanguage);
      if (translationResult) {
        setTranslation(translationResult);
        setShowTranslation(true);
      }
    } else {
      setShowTranslation(!showTranslation);
    }
  };

  const showWordLookup = async (text, position) => {
    if (!isEnabled) return;
    setSelectedText(text);
    setTooltipPosition(position);
    setShowTooltip(true);
    setDefinition('');
    setPhonetic('');
    setExamples([]);
    setTranslation('');
    setShowTranslation(false);
    const isWord = text.split(' ').length === 1 && /^[a-zA-Z]+$/.test(text);
    if (isWord) {
      await fetchDefinition(text);
    } else {
      setDefinition('Select "Show Translation" to translate this phrase');
    }
  };

  const hideWordLookup = () => {
    setShowTooltip(false);
    setSelectedText('');
    setDefinition('');
    setPhonetic('');
    setExamples([]);
    setTranslation('');
    setShowTranslation(false);
    if (window.getSelection) {
      try { window.getSelection().removeAllRanges(); } catch {}
    }
  };

  const playPronunciation = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(selectedText);
      utterance.rate = 0.8;
      utterance.lang = 'en-US';
      speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    const handleGlobalClick = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        hideWordLookup();
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  const value = {
    selectedText,
    showTooltip,
    tooltipPosition,
    definition,
    phonetic,
    examples,
    translation,
    showTranslation,
    userLanguage,
    isLoadingDefinition,
    isTranslating,
    isEnabled,
    showWordLookup,
    hideWordLookup,
    handleTranslateRequest,
    playPronunciation,
    setIsEnabled,
    tooltipRef,
  };

  return (
    <WordLookupContext.Provider value={value}>
      {children}
      <WordLookupTooltip />
    </WordLookupContext.Provider>
  );
};

const WordLookupTooltip = () => {
  const {
    selectedText,
    showTooltip,
    tooltipPosition,
    definition,
    phonetic,
    examples,
    translation,
    showTranslation,
    userLanguage,
    isLoadingDefinition,
    isTranslating,
    hideWordLookup,
    handleTranslateRequest,
    playPronunciation,
    tooltipRef,
  } = useWordLookup();

  if (!showTooltip) return null;

  // 严格的位置计算，防止超出边界
  const getSafePosition = () => {
    const margin = 16;
    
    // 1. 计算真实可用空间
    const availableWidth = window.innerWidth - (margin * 2);
    const maxTooltipWidth = Math.min(300, availableWidth);
    
    // 2. 根据屏幕尺寸确定弹窗宽度
    const tooltipWidth = window.innerWidth < 480 
      ? Math.min(280, maxTooltipWidth) 
      : Math.min(300, maxTooltipWidth);
    
    // 3. 确保弹窗宽度不超过可用空间
    const finalWidth = Math.min(tooltipWidth, availableWidth);
    const tooltipHeight = 280;
    
    let { x, y } = tooltipPosition;
    
    // 4. 计算严格的边界限制
    const halfWidth = finalWidth / 2;
    const leftBoundary = margin + halfWidth;
    const rightBoundary = window.innerWidth - margin - halfWidth;
    
    // 5. 使用 Math.max 和 Math.min 强制约束位置
    x = Math.max(leftBoundary, Math.min(rightBoundary, x));
    
    // 6. 垂直位置检查
    if (y - tooltipHeight < margin) {
      y = tooltipPosition.y + 30;
    }
    
    // 7. 最终安全验证
    const finalX = Math.max(
      margin + halfWidth, 
      Math.min(window.innerWidth - margin - halfWidth, x)
    );
    
    return { 
      x: finalX, 
      y, 
      width: finalWidth 
    };
  };

  const safePosition = getSafePosition();

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[99999] bg-white border border-gray-200 rounded-lg shadow-2xl"
      style={{
        left: `${safePosition.x}px`,
        top: `${safePosition.y}px`,
        width: `${safePosition.width}px`,
        transform: safePosition.y === tooltipPosition.y + 30 
          ? 'translate(-50%, 0)'
          : 'translate(-50%, -100%)',
        maxHeight: '280px',
        overflowY: 'auto',
        position: 'fixed',
        zIndex: 99999,
        // 8. 添加CSS安全网
        minWidth: '200px',
        maxWidth: `${Math.min(300, window.innerWidth - 32)}px`
      }}
    >
      <div className="p-3 space-y-2"> {/* 减小内边距和间距 */}
        {/* 头部区域 - 优化布局 */}
        <div className="flex items-start justify-between border-b pb-2">
          <div className="flex-1 mr-2 min-w-0"> {/* 添加 min-w-0 防止文字溢出 */}
            <div className="font-semibold text-base text-gray-900 break-words leading-tight">
              "{selectedText}"
            </div>
            {phonetic && (
              <div className="text-xs text-gray-600 mt-1">{phonetic}</div>
            )}
          </div>
          <div className="flex items-center space-x-1 flex-shrink-0">
            {/* 发音按钮 */}
            <button
              onClick={playPronunciation}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full"
              title="Play pronunciation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a1 1 0 01-1-1V9a1 1 0 011-1h1a1 1 0 011 1v.001L15.536 6.464" />
              </svg>
            </button>
            {/* 关闭按钮 */}
            <button
              onClick={hideWordLookup}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 英文定义区域 */}
        <div>
          <div className="text-xs font-medium text-green-700 mb-1 flex items-center">
            <span className="mr-1">📚</span>
            Definition
          </div>
          {isLoadingDefinition ? (
            <div className="text-xs text-gray-500">Loading...</div>
          ) : definition ? (
            <div className="text-xs text-gray-800 leading-relaxed break-words">
              {definition}
            </div>
          ) : (
            <div className="text-xs text-gray-500">Not available</div>
          )}
        </div>

        {/* 例句区域 - 只在有例句时显示 */}
        {examples.length > 0 && (
          <div>
            <div className="text-xs font-medium text-blue-700 mb-1 flex items-center">
              <span className="mr-1">💡</span>
              Examples
            </div>
            <div className="space-y-1">
              {examples.slice(0, 1).map((example, index) => ( // 只显示一个例句
                <div key={index} className="text-xs text-gray-700 italic bg-gray-50 p-2 rounded break-words">
                  "{example}"
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 翻译区域 */}
        {userLanguage && (
          <div className="border-t pt-2">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-purple-700 flex items-center">
                <span className="mr-1">🌐</span>
                Translation
              </div>
              <button
                onClick={handleTranslateRequest}
                disabled={isTranslating}
                className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                  showTranslation 
                    ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                } disabled:opacity-50`}
              >
                {isTranslating ? 'Loading...' : showTranslation ? 'Hide' : 'Show'}
              </button>
            </div>
            
            {showTranslation && (
              <div className="bg-purple-50 p-2 rounded">
                {translation ? (
                  <div className="text-xs text-purple-800 font-medium break-words">
                    {translation}
                  </div>
                ) : (
                  <div className="text-xs text-red-500">Translation failed</div>
                )}
              </div>
            )}
            
            {!showTranslation && (
              <div className="text-xs text-gray-500 italic">
                Try understanding with the definition first!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WordLookupContext;


