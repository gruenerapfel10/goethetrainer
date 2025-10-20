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
    if (!sessionId) {
      console.log('⚠️ useSessionStream: No sessionId provided');
      return () => {};
    }

    console.log(`🟢 useSessionStream: Connecting to /api/sessions/${sessionId}/stream`);

    try {
      const eventSource = new EventSource(`/api/sessions/${sessionId}/stream`);

      eventSource.onopen = () => {
        console.log(`✅ useSessionStream: SSE connection OPENED for ${sessionId}`);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log(`📥 useSessionStream: RECEIVED data:`, data);

          if (data.done) {
            console.log(`🏁 useSessionStream: Stream COMPLETED`);
            eventSource.close();
            onComplete?.();
            return;
          }

          if (data.questions && data.questions.length > 0) {
            console.log(`📥 useSessionStream: Processing ${data.questions.length} questions`);
            onQuestionsUpdate(data.questions);
          }
        } catch (err) {
          console.error('❌ useSessionStream: Error parsing SSE message:', err);
        }
      };

      eventSource.onerror = (error) => {
        console.error(`❌ useSessionStream: SSE connection error:`, error);
        eventSource.close();
        onError?.(new Error('SSE connection failed'));
      };

      return () => {
        console.log(`🔴 useSessionStream: Closing connection for ${sessionId}`);
        eventSource.close();
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('❌ useSessionStream: Exception:', error);
      onError?.(error);
      return () => {};
    }
  }, [sessionId, onQuestionsUpdate, onComplete, onError]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);
}
