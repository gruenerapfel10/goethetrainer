// hooks/useOperationStatus.ts
import { useState, useEffect, useCallback, useRef } from 'react';

interface SystemOperation {
  id: number;
  operationType: string | null;
  currentStatus: string;
  startedAt: string | null;
  updatedAt: string;
  endedAt: string | null;
  progressDetails?: {
    message?: string;
    percent?: number;
    currentFile?: string;
    [key: string]: any;
  } | null;
  lastBedrockJobId?: string | null;
  errorMessage?: string | null;
}

interface UseOperationStatusOptions {
  statusPollInterval?: number;
  maxPollAttempts?: number;
  onOperationComplete?: (operation: SystemOperation) => void;
  onOperationFailed?: (operation: SystemOperation) => void;
  onProgressUpdate?: (operation: SystemOperation) => void;
}

export function useOperationStatus(options: UseOperationStatusOptions = {}) {
  const {
    statusPollInterval = 2000,
    maxPollAttempts = 180,
    onOperationComplete,
    onOperationFailed,
    onProgressUpdate
  } = options;

  const [operation, setOperation] = useState<SystemOperation | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollAttemptCountRef = useRef(0);
  const mountedRef = useRef(true);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
    pollAttemptCountRef.current = 0;
  }, []);

  // Check if operation is active
  const isOperationActive = useCallback((op: SystemOperation | null): boolean => {
    return op ? !['COMPLETED', 'FAILED', 'IDLE'].includes(op.currentStatus) : false;
  }, []);

  // Poll operation status
  const pollStatus = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      const response = await fetch('/api/operations/status', {
        cache: 'no-cache'
      });

      if (!response.ok) {
        throw new Error(`Status poll failed: ${response.status}`);
      }

      const data: SystemOperation = await response.json();

      if (!mountedRef.current) return;

      const previousOperation = operation;
      const wasActive = isOperationActive(previousOperation);
      const isStillActive = isOperationActive(data);

      setOperation(data);
      setError(null);

      // Call progress callback
      if (isStillActive && onProgressUpdate) {
        onProgressUpdate(data);
      }

      if (isStillActive) {
        pollAttemptCountRef.current++;

        // Safety check for infinite polling
        if (pollAttemptCountRef.current > maxPollAttempts) {
          console.warn('Max polling attempts reached, stopping polling');
          cleanup();
          setError('Operation timed out. Please refresh the page.');
          return;
        }
      } else {
        // Operation completed or failed
        pollAttemptCountRef.current = 0;

        // Handle state transitions
        if (wasActive && !isStillActive) {
          if (data.currentStatus === 'COMPLETED' && onOperationComplete) {
            onOperationComplete(data);
          } else if (data.currentStatus === 'FAILED' && onOperationFailed) {
            onOperationFailed(data);
          }
        }

        // Stop polling for terminal states
        cleanup();
      }

    } catch (err) {
      if (!mountedRef.current) return;

      console.error('Status polling error:', err);
      pollAttemptCountRef.current++;

      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);

      // Stop polling after too many failures
      if (pollAttemptCountRef.current > 10) {
        cleanup();
        setError('Lost connection to server. Please refresh the page.');
      }
    }
  }, [operation, isOperationActive, maxPollAttempts, onOperationComplete, onOperationFailed, onProgressUpdate, cleanup]);

  // Start polling
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return; // Already polling

    setIsPolling(true);
    setError(null);
    pollAttemptCountRef.current = 0;

    // Initial poll
    pollStatus();

    // Set up interval
    pollingIntervalRef.current = setInterval(pollStatus, statusPollInterval);
  }, [pollStatus, statusPollInterval]);

  // Stop polling
  const stopPolling = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Initialize with current status
  const initialize = useCallback(async () => {
    try {
      const response = await fetch('/api/operations/status');

      if (response.ok) {
        const initialOperation: SystemOperation = await response.json();

        if (!mountedRef.current) return;

        setOperation(initialOperation);
        setError(null);

        // Start polling if operation is active
        if (isOperationActive(initialOperation)) {
          startPolling();
        }

        return initialOperation;
      } else {
        throw new Error(`Failed to fetch initial status: ${response.status}`);
      }
    } catch (err) {
      if (!mountedRef.current) return;

      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('Failed to initialize operation status:', err);
    }
  }, [isOperationActive, startPolling]);

  // Set operation (for when starting new operations)
  const setOperationStatus = useCallback((newOperation: SystemOperation) => {
    setOperation(newOperation);
    setError(null);

    if (isOperationActive(newOperation)) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [isOperationActive, startPolling, stopPolling]);

  // Effect for cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Computed values
  const isSystemBusy = isOperationActive(operation);
  const progress = operation?.progressDetails?.percent ??
    (['COMPLETED', 'FAILED'].includes(operation?.currentStatus || '') ? 100 : 0);

  return {
    operation,
    isPolling,
    isSystemBusy,
    progress,
    error,
    initialize,
    startPolling,
    stopPolling,
    setOperationStatus,
    cleanup
  };
}