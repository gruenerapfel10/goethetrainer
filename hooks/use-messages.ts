import { useRef, useCallback, useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';

interface UseMessagesProps {
  chatId: string;
  status: string;
}

export function useMessages({ chatId, status }: UseMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasSentMessage, setHasSentMessage] = useState(false);
  
  const { ref: endRef, inView: isAtBottom } = useInView({
    threshold: 0.1,
  });

  const onViewportEnter = useCallback(() => {
    // Handle viewport enter
  }, []);

  const onViewportLeave = useCallback(() => {
    // Handle viewport leave
  }, []);

  useEffect(() => {
    if (status === 'submitted') {
      setHasSentMessage(true);
    }
  }, [status]);

  return {
    containerRef,
    endRef,
    onViewportEnter,
    onViewportLeave,
    hasSentMessage,
  };
}