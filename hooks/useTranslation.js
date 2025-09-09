import { useState, useCallback, useRef, useEffect } from 'react';

export const useTranslation = () => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState(null);
  
  const translationCache = useRef(new Map());
  const abortControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const translate = useCallback(async (text, targetLanguage, sourceLanguage = 'en') => {
    if (!text || !text.trim()) {
      setError('Text is required');
      return null;
    }
    
    if (!targetLanguage) {
      setError('Target language is required');
      return null;
    }

    const cleanText = text.trim();
    const cacheKey = `${cleanText.toLowerCase()}_${sourceLanguage}_${targetLanguage}`;
    
    // check cache
    if (translationCache.current.has(cacheKey)) {
      console.log('Using cached translation');
      setError(null);
      return translationCache.current.get(cacheKey);
    }

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsTranslating(true);
    setError(null);
    
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanText,
          targetLanguage,
          sourceLanguage
        }),
        signal: abortControllerRef.current.signal
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
      }

      // cache management - limit cache size
      if (translationCache.current.size >= 50) {
        const firstKey = translationCache.current.keys().next().value;
        translationCache.current.delete(firstKey);
      }
      
      translationCache.current.set(cacheKey, data.translatedText);
      
      return data.translatedText;

    } catch (error) {
      if (error.name === 'AbortError') {
        return null;
      }
      
      console.error('Translation failed:', error);
      setError(error.message || 'Translation failed');
      return null;
    } finally {
      setIsTranslating(false);
      abortControllerRef.current = null;
    }
  }, []);

  const clearCache = useCallback(() => {
    translationCache.current.clear();
  }, []);

  return { 
    translate, 
    isTranslating, 
    error,
    clearCache,
    cacheSize: translationCache.current.size
  };
};