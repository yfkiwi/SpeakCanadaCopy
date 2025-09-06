// components/FloatingVocabButton.js
import React, { useState, useEffect, createContext, useContext } from 'react';
import { saveVocabularyToLibrary, checkVocabularyExists } from '../utils/supabase-vocab';

// 全局悬浮球状态管理
const FloatingVocabContext = createContext();

// 悬浮球状态提供者
export function FloatingVocabProvider({ children }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [hasSelection, setHasSelection] = useState(false);

  // 监听文本选择
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      setSelectedText(text);
      setHasSelection(text.length > 0);
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  const value = {
    isModalOpen,
    setIsModalOpen,
    selectedText,
    hasSelection
  };

  return (
    <FloatingVocabContext.Provider value={value}>
      {children}
      <FloatingVocabButton />
    </FloatingVocabContext.Provider>
  );
}

// 悬浮球组件
function FloatingVocabButton() {
  const { isModalOpen, setIsModalOpen, selectedText, hasSelection } = useContext(FloatingVocabContext);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleClick = () => {
    setIsModalOpen(true);
  };

  if (!isClient) return null;

  return (
    <>
      {/* 悬浮球 */}
      <button
        onClick={handleClick}
        className={`
          fixed z-50 w-14 h-14 rounded-full shadow-lg transition-all duration-300
          flex items-center justify-center text-white
          ${hasSelection 
            ? 'bg-blue-600 scale-110 shadow-xl' 
            : 'bg-blue-500 hover:bg-blue-600 hover:scale-105'
          }
        `}
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)',
          right: '20px'
        }}
        title="Add word to vocabulary"
      >
        {hasSelection ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        )}
      </button>

      {/* 添加词汇Modal */}
      {isModalOpen && (
        <AddVocabModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)}
          initialTerm={selectedText}
        />
      )}
    </>
  );
}

// 添加词汇Modal组件
function AddVocabModal({ isOpen, onClose, initialTerm }) {
  const [formData, setFormData] = useState({
    term: initialTerm || '',
    definition: '',
    cultural_note: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 重置表单当initialTerm变化时
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      term: initialTerm || ''
    }));
  }, [initialTerm]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleSubmit = async () => {
    // 基本验证
    if (!formData.term.trim()) {
      setError('Word is required');
      return;
    }
    if (!formData.definition.trim()) {
      setError('Definition is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 检查是否已存在
      const exists = await checkVocabularyExists(formData.term);
      if (exists) {
        setError('This word already exists in your vocabulary');
        setIsLoading(false);
        return;
      }

      // 保存到数据库
      await saveVocabularyToLibrary({
        term: formData.term.trim(),
        definition: formData.definition.trim(),
        cultural_note: formData.cultural_note.trim() || null,
        source: 'custom',
        scenario_key: null // 用户自定义词汇不关联特定场景
      });

      // 成功后重置表单并关闭Modal
      setFormData({ term: '', definition: '', cultural_note: '' });
      onClose();
      alert('Word added to your vocabulary!');
      
    } catch (err) {
      setError('Failed to save word. Please try again.');
      console.error('Error saving vocabulary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add to My Vocabulary</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Word Field */}
          <div>
            <label htmlFor="term" className="block text-sm font-medium text-gray-700 mb-2">
              Word *
            </label>
            <input
              id="term"
              type="text"
              value={formData.term}
              onChange={(e) => handleInputChange('term', e.target.value)}
              placeholder="Enter the word"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              autoFocus
            />
          </div>

          {/* Definition Field */}
          <div>
            <label htmlFor="definition" className="block text-sm font-medium text-gray-700 mb-2">
              Definition *
            </label>
            <textarea
              id="definition"
              value={formData.definition}
              onChange={(e) => handleInputChange('definition', e.target.value)}
              placeholder="Enter the definition"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none"
            />
          </div>

          {/* Cultural Note Field */}
          <div>
            <label htmlFor="cultural_note" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              id="cultural_note"
              value={formData.cultural_note}
              onChange={(e) => handleInputChange('cultural_note', e.target.value)}
              placeholder="Add personal notes, context, or cultural information"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !formData.term.trim() || !formData.definition.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding...
                </>
              ) : (
                'Add Word'
              )}
            </button>
          </div>

          {/* Keyboard shortcuts info */}
          <div className="text-xs text-gray-500 text-center pt-2">
            Press Esc to close • Cmd/Ctrl + Enter to save
          </div>
        </div>
      </div>
    </div>
  );
}