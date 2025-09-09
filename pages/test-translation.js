import { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';

export default function TestTranslation() {
  const [inputText, setInputText] = useState('Hello, how are you today?');
  const [targetLanguage, setTargetLanguage] = useState('zh');
  const [result, setResult] = useState('');
  
  const { translate, isTranslating, error } = useTranslation();

  const handleTest = async () => {
    const translation = await translate(inputText, targetLanguage);
    setResult(translation || 'Translation failed');
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg mt-10">
      <h2 className="text-xl font-bold mb-4">Translation Test</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Text:</label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
          rows={3}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Target Language:</label>
        <select
          value={targetLanguage}
          onChange={(e) => setTargetLanguage(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
        >
          <option value="zh">Chinese</option>
          <option value="ko">Korean</option>
          <option value="ja">Japanese</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
        </select>
      </div>

      <button
        onClick={handleTest}
        disabled={isTranslating}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {isTranslating ? 'Translating...' : 'Test Translation'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          Error: {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <strong>Translation:</strong> {result}
        </div>
      )}
    </div>
  );
}


