import { useEffect, useRef, useCallback } from 'react';
import { useDebounceCallback } from 'usehooks-ts';

export interface BaseEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  status: 'idle' | 'streaming';
  debounceMs?: number;
}

export function useEditorState(props: BaseEditorProps) {
  const { content, onContentChange, debounceMs = 2000 } = props;
  const lastContentRef = useRef(content);
  const onChangeRef = useRef(onContentChange);
  
  useEffect(() => {
    onChangeRef.current = onContentChange;
  }, [onContentChange]);
  
  const debouncedChange = useDebounceCallback(
    useCallback((newContent: string) => {
      onChangeRef.current(newContent);
    }, []),
    debounceMs
  );
  
  const handleChange = useCallback((newContent: string) => {
    lastContentRef.current = newContent;
    debouncedChange(newContent);
  }, [debouncedChange]);
  
  return {
    lastContent: lastContentRef.current,
    handleChange,
    cancelDebounce: debouncedChange.cancel,
  };
}
