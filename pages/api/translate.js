// pages/api/translate.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    console.log('API Key:', process.env.GOOGLE_TRANSLATE_API_KEY ? 'Found' : 'Not found');
    try {
      const { text, targetLanguage, sourceLanguage = 'en' } = req.body;
  
      if (!text || !targetLanguage) {
        return res.status(400).json({ 
          error: 'Missing required parameters',
          message: 'text and targetLanguage are required'
        });
      }
  
      if (!process.env.GOOGLE_TRANSLATE_API_KEY) {
        return res.status(500).json({ 
          error: 'Configuration error',
          message: 'Translation service not configured'
        });
      }
  
      // if the source language and target language are the same, return the original text directly
      if (sourceLanguage === targetLanguage) {
        return res.status(200).json({
          originalText: text,
          translatedText: text,
          sourceLanguage,
          targetLanguage,
          cached: true
        });
      }
  
      console.log(`[Translation request] "${text.substring(0, 50)}..." ${sourceLanguage} -> ${targetLanguage}`);
  
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: text.trim(),
            source: sourceLanguage,
            target: targetLanguage,
            format: 'text'
          }),
          signal: AbortSignal.timeout(10000) // 10 seconds timeout
        }
      );
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Google Translate API error: ${response.status}`, errorText);
        
        if (response.status === 403) {
          return res.status(500).json({ 
            error: 'API quota exceeded',
            message: 'Translation service temporarily unavailable'
          });
        }
        
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }
  
      const data = await response.json();
  
      if (data.error) {
        console.error('Google Translate API error:', data.error);
        return res.status(500).json({ 
          error: 'Translation service error',
          message: data.error.message || 'Unknown API error'
        });
      }
  
      if (!data.data || !data.data.translations || !data.data.translations[0]) {
        console.error('Unexpected API response format:', data);
        return res.status(500).json({ 
          error: 'Invalid API response',
          message: 'Translation service returned unexpected data'
        });
      }
  
      const translatedText = data.data.translations[0].translatedText;
      
      console.log(`[翻译成功] "${translatedText.substring(0, 50)}..."`);
  
      return res.status(200).json({
        originalText: text,
        translatedText,
        sourceLanguage,
        targetLanguage,
        cached: false
      });
  
    } catch (error) {
      console.error('Translation error:', error);
      
      if (error.name === 'AbortError') {
        return res.status(408).json({ 
          error: 'Request timeout',
          message: 'Translation request timed out'
        });
      }
      
      return res.status(500).json({ 
        error: 'Internal server error',
        message: 'Translation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }