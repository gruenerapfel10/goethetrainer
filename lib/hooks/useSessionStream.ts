import { useEffect, useCallback } from 'react';
import type { Question } from '@/lib/sessions/questions/question-types';

interface UseSessionStreamOptions {
  sessionId: string;
  onQuestionsUpdate: (questions: Question[]) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export function useSessionStream({
  sessionId,
  onQuestionsUpdate,
  onComplete,
  onError,
}: UseSessionStreamOptions) {
  const connect = useCallback(() => {
    try {
      const eventSource = new EventSource(`/api/sessions/${sessionId}/stream`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.done) {
            eventSource.close();
            onComplete?.();
            return;
          }

          if (data.questions && data.questions.length > 0) {
            onQuestionsUpdate(data.questions);
          }
        } catch (err) {
          console.error('Error parsing SSE message:', err);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        eventSource.close();
        onError?.(new Error('SSE connection failed'));
      };

      return () => {
        eventSource.close();
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
      return () => {};
    }
  }, [sessionId, onQuestionsUpdate, onComplete, onError]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);
}
