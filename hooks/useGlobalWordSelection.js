import { useEffect } from 'react';
import { useWordLookup } from '../contexts/WordLookupContext';

export const useGlobalWordSelection = (enabledSelector = () => true) => {
  const { showWordLookup, isEnabled } = useWordLookup();

  useEffect(() => {
    const handleTextSelection = (event) => {
      if (!isEnabled || !enabledSelector()) return;

      let target = event.target;
      // Ensure we have an Element (target can be a Text node in some cases)
      if (target && target.nodeType !== 1) {
        target = target.parentElement;
      }
      
      if (!target || !target.closest('[data-word-lookup="enabled"]')) return;

      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        
        const text = selection.toString().trim();
        
        // 检查文本长度和有效性
        if (text && text.length > 0 && text.length < 100 && /[a-zA-Z]/.test(text)) {
          try {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // 确保获取到有效的位置
            if (rect.width > 0 && rect.height > 0) {
              showWordLookup(text, {
                x: rect.left + rect.width / 2,
                y: rect.top - 10
              });
            }
          } catch (error) {
            console.error('Error getting selection range:', error);
          }
        }
      }, 100);
    };

    // 添加调试日志
    const debugHandler = (event) => {
      console.log('Selection event triggered:', {
        target: event.target,
        selection: window.getSelection()?.toString(),
        hasEnabledAttribute: event.target.closest('[data-word-lookup="enabled"]') !== null
      });
      handleTextSelection(event);
    };
    document.addEventListener('mouseup', debugHandler);
    document.addEventListener('touchend', debugHandler);
    return () => {
      document.removeEventListener('mouseup', debugHandler);
      document.removeEventListener('touchend', debugHandler);
    };
  }, [showWordLookup, isEnabled, enabledSelector]);
};

export default useGlobalWordSelection;


