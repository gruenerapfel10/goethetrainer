// components/admin/knowledge-base-file-list.tsx
'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  Upload,
  Loader2,
  RefreshCw,
  FileIcon,
  Trash2,
  CloudCog,
  Search,
  Check,
  AlertCircle,
  Info,
  X,
  ChevronLeft,
  ChevronRight,
  History,
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Progress} from '@/components/ui/progress';
import {Input} from '@/components/ui/input';
import {useDropzone} from 'react-dropzone';
import {toast} from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import FileTable from './file-table';
import {useTranslations} from 'next-intl';

interface FileInfo {
  key: string;
  documentId: string;
  size: number;
  lastModified: string;
  sharePointUrl?: string | null;
  status?: string;
  isIngested?: boolean;
  fileName?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
}

interface ApiFileListResponse {
  files: FileInfo[];
  pagination: PaginationInfo;
  error?: string;
}

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

interface ValidationResult {
  acceptedBatchFiles: File[]; // Files from the input batch that are valid and fit
  errorMessageForUI?: string; // A single error message for a major batch issue (e.g., none fit), to be set in uploadValidationError state
  skippedFileWarnings: string[]; // Warnings for individual files that were skipped (for toasts)
}

type SortField = 'key' | 'size' | 'lastModified' | 'status';
type SortDirection = 'asc' | 'desc';

const MAX_FILE_SIZE_CLIENT = 100 * 1024 * 1024; // 5MB
const MAX_TOTAL_SIZE_CLIENT = 100 * 1024 * 1024; // 25MB
const MAX_FILES_CLIENT = 100;
const ALLOWED_FILE_TYPES = [
  'text/plain',
  'text/markdown',
  'text/html',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf'
  // Removed: 'image/jpeg', 'image/png' - AWS Bedrock KB doesn't support image content extraction
];

// Polling configuration
const STATUS_POLL_INTERVAL = 5000; // 2 seconds - faster for better responsiveness
const FILE_POLL_INTERVAL = 5000; // 4 seconds - moderate for file list updates
const CLEAR_TERMINAL_STATUS_DELAY = 5000; // 5 seconds
const MAX_POLL_ATTEMPTS = 10000; // 6 minutes max polling (180 * 2s = 360s)

export default function KnowledgeBaseFileList() {
  // Core state
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [fileList, setFileList] = useState<FileInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [systemOperationStatus, setSystemOperationStatus] = useState<SystemOperation | null>(null);
  const [operationProgress, setOperationProgress] = useState<number>(0);
  const [lastSuccessfulSyncTime, setLastSuccessfulSyncTime] = useState<string | null>(null);

  // UI state
  const [isInitializing, setIsInitializing] = useState(true);
  const [isFetchingFiles, setIsFetchingFiles] = useState(false);
  const [isPollingActive, setIsPollingActive] = useState(false);
  const [uploadValidationError, setUploadValidationError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Table state
  const [sortField, setSortField] = useState<SortField>('lastModified');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedFileKeys, setSelectedFileKeys] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pageLimit] = useState<number>(10);

  // Refs for cleanup and state management
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollAttemptCountRef = useRef(0);
  const lastOperationIdRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const t = useTranslations();

  // Cleanup function
  const cleanup = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (fileRefreshIntervalRef.current) {
      clearInterval(fileRefreshIntervalRef.current);
      fileRefreshIntervalRef.current = null;
    }
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Determine if system is busy
  const isSystemBusy = useMemo(() => {
    return systemOperationStatus &&
      !['COMPLETED', 'FAILED', 'IDLE'].includes(systemOperationStatus.currentStatus);
  }, [systemOperationStatus]);

  // Track last completed operation for display
  const [lastCompletedOperation, setLastCompletedOperation] = useState<{
    type: string;
    status: 'COMPLETED' | 'FAILED';
    endTime: string;
    message?: string;
  } | null>(null);

  // Utility functions
  const formatFileSize = (sizeInBytes: number) => {
    if (sizeInBytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(sizeInBytes) / Math.log(1024));
    return `${(sizeInBytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  };

  // File validation
  const validateFilesForUpload = useCallback(
    (
      filesToConsider: File[], // Files from the current drop/selection, already respecting MAX_FILES_CLIENT
      alreadyStagedFiles: File[] // Files currently in the filesToUpload state
    ): ValidationResult => {



      const currentStagedSize = alreadyStagedFiles.reduce((sum, file) => sum + file.size, 0);
      const acceptedForThisBatch: File[] = [];
      let newBatchSize = 0; // Tracks the size of files accepted from the current batch
      const localSkippedWarnings: string[] = [];

      if (!filesToConsider || filesToConsider.length === 0) {
        return { acceptedBatchFiles: [], skippedFileWarnings: [] };
      }

      for (const file of filesToConsider) {
        if (file.size === 0) {
          localSkippedWarnings.push(t('warnings.skippedEmpty', { file: file.name }));
          continue;
        }
        if (file.size > MAX_FILE_SIZE_CLIENT) {
          localSkippedWarnings.push(
            t('warnings.skippedOversized', {
              file: file.name,
              limit: formatFileSize(MAX_FILE_SIZE_CLIENT),
            })
          );
          continue;
        }
        if (
          ALLOWED_FILE_TYPES.length > 0 &&
          file.type &&
          !ALLOWED_FILE_TYPES.includes(file.type)
        ) {
          localSkippedWarnings.push(t('warnings.skippedUnsupportedType', { file: file.name }));
          continue;
        }

        // Check if this specific file can be added without exceeding MAX_TOTAL_SIZE_CLIENT
        if (currentStagedSize + newBatchSize + file.size > MAX_TOTAL_SIZE_CLIENT) {
          localSkippedWarnings.push(
            t('warnings.skippedTotalSizeLimitReached', { // This file specifically hit the total limit
              file: file.name,
              // limit: formatFileSize(MAX_TOTAL_SIZE_CLIENT), // Limit info might be redundant if a general error is shown
            })
          );
          // Once the total limit is hit with the current file,
          // no more files from this batch can be added.
          // We could 'break' here if files are not pre-sorted by size.
          // For simplicity, we 'continue', meaning subsequent smaller files might still fit if this one was large.
          // However, if this file itself makes it exceed, it's skipped.
          continue;
        }

        // If all checks pass for this file and it fits:
        acceptedForThisBatch.push(file);
        newBatchSize += file.size;
      }

      let uiError: string | undefined = undefined;
      if (filesToConsider.length > 0 && acceptedForThisBatch.length === 0) {
        // No files from the considered batch were accepted.
        // Try to provide a more specific message for the UI error state.
        if (localSkippedWarnings.some(msg => msg.includes(t('warnings.skippedTotalSizeLimitReached', {file:''}).substring(0,10)))) { // Heuristic check
          uiError = t('errors.batchRejectedTotalSizeFull', { limit: formatFileSize(MAX_TOTAL_SIZE_CLIENT) });
        } else if (localSkippedWarnings.length > 0) {
          uiError = t('errors.batchRejectedAllInvalidFiles', { count: filesToConsider.length });
        } else {
          uiError = t('errors.unknownBatchRejection'); // Fallback
        }
      }

      return {
        acceptedBatchFiles: acceptedForThisBatch,
        errorMessageForUI: uiError,
        skippedFileWarnings: localSkippedWarnings,
      };
    },
    [t] // Ensure formatFileSize is in scope or pass as prop/import if external
  );

  const clearUploadFiles = () => {
    setFilesToUpload([]);
    setUploadValidationError('');
  };

  // Create a separate function that can accept query and page parameters
  const fetchFilesWithQuery = useCallback(async (queryOverride?: string, pageOverride?: number, forceRefresh = true) => {
    if (!mountedRef.current) return;

    // Abort previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    setIsFetchingFiles(true);

    const url = new URL('/api/knowledge-base/files', window.location.origin);
    url.searchParams.append('page', (pageOverride ?? currentPage).toString());
    url.searchParams.append('limit', pageLimit.toString());
    url.searchParams.append('sortField', sortField);
    url.searchParams.append('sortDirection', sortDirection);

    // Use override query if provided, otherwise use current state
    const queryToUse = queryOverride !== undefined ? queryOverride : searchQuery;
    if (queryToUse.trim()) {
      url.searchParams.append('searchQuery', queryToUse.trim());
    }

    try {
      const response = await fetch(url.toString(), {
        signal: abortControllerRef.current.signal,
        cache: forceRefresh ? 'no-cache' : 'default'
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = (await response.json()) as ApiFileListResponse;

      if (!mountedRef.current) return;

      if (data.error) {
        throw new Error(data.error);
      }

      setFileList(data.files || []);
      setCurrentPage(data.pagination.page);
      setTotalPages(data.pagination.totalPages);
      setTotalCount(data.pagination.totalCount);

    } catch (error) {
      if (!mountedRef.current) return;

      if (error instanceof DOMException && error.name === 'AbortError') {
        return; // Request was cancelled, ignore
      }

      console.error('File list fetch error:', error);

      // Only show error toast if it's not during active polling
      if (!isPollingActive) {
        toast.error(t('errors.fileListRefresh') || 'Failed to refresh file list.');
      }
    } finally {
      if (mountedRef.current) {
        setIsFetchingFiles(false);
      }
    }
  }, [currentPage, pageLimit, sortField, sortDirection, searchQuery, t, isPollingActive]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Cancel any ongoing fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      // Reset to first page when searching and fetch with the current query
      setCurrentPage(1);
      fetchFilesWithQuery(query, 1);
    }, 300);
  }, [fetchFilesWithQuery]);

// Updated fetchFiles function with better abort handling
  const fetchFiles = useCallback(async (forceRefresh = false) => {
    return fetchFilesWithQuery(undefined, undefined, forceRefresh);
  }, [fetchFilesWithQuery]);

// Also add a clear search function for better UX
  const clearSearch = useCallback(() => {
    // Clear any pending timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Cancel any ongoing fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset search query and page
    setSearchQuery('');
    setCurrentPage(1);

    // Immediately fetch with empty query - don't wait for state update
    fetchFilesWithQuery('', 1);
  }, [fetchFilesWithQuery]);

  // Poll system operation status
  const pollOperationStatus = useCallback(async () => {
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

      const oldStatus = systemOperationStatus?.currentStatus;
      const oldOperationId = systemOperationStatus?.id;

      setSystemOperationStatus(data);

      // Update progress
      if (typeof data.progressDetails?.percent === 'number') {
        setOperationProgress(data.progressDetails.percent);
      } else if (['COMPLETED', 'FAILED', 'IDLE'].includes(data.currentStatus)) {
        setOperationProgress(100);
      } else if (data.currentStatus && !['COMPLETED', 'FAILED', 'IDLE'].includes(data.currentStatus)) {
        setOperationProgress(prev => Math.min(99, Math.max(10, prev || 10)));
      }

      const isStillActive = !['COMPLETED', 'FAILED', 'IDLE'].includes(data.currentStatus);
      lastOperationIdRef.current = data.id;

      if (isStillActive) {
        pollAttemptCountRef.current++;

        // Safety check to prevent infinite polling
        if (pollAttemptCountRef.current > MAX_POLL_ATTEMPTS) {
          console.warn('Max polling attempts reached, stopping polling');
          stopPolling();
          toast.error('Operation timed out. Please refresh the page.');
          return;
        }
      } else {
        // Operation completed or failed
        pollAttemptCountRef.current = 0;

        // Refresh files when operation completes
        if (oldStatus && !['COMPLETED', 'FAILED', 'IDLE'].includes(oldStatus)) {
          setTimeout(() => fetchFiles(true), 500); // Small delay to ensure backend is updated
        }

        // Show completion/failure toast
        if (data.currentStatus === 'COMPLETED' && oldStatus !== 'COMPLETED') {
          toast.success(data.progressDetails?.message || t('success.operationComplete') || 'Operation completed!');
          if (data.operationType === 'SHAREPOINT_SYNC_AND_PROCESS' && data.endedAt) {
            setLastSuccessfulSyncTime(data.endedAt);
          }

          // Track last completed operation
          setLastCompletedOperation({
            type: data.operationType || 'Unknown',
            status: 'COMPLETED',
            endTime: data.endedAt || new Date().toISOString()
          });
        } else if (data.currentStatus === 'FAILED' && oldStatus !== 'FAILED') {
          // Don't show toast for restart-related failures
          if (!data.errorMessage?.includes('application restart')) {
            toast.error(data.errorMessage || data.progressDetails?.message || t('errors.operationFailed') || 'Operation failed.');
          }

          // Track last failed operation (excluding restart failures)
          if (!data.errorMessage?.includes('application restart')) {
            setLastCompletedOperation({
              type: data.operationType || 'Unknown',
              status: 'FAILED',
              endTime: data.endedAt || new Date().toISOString(),
              // @ts-ignore
              message: data.errorMessage
            });
          }
        }

        // Clear terminal status after delay
        if (['COMPLETED', 'FAILED'].includes(data.currentStatus)) {
          setTimeout(() => {
            if (!mountedRef.current) return;
            setSystemOperationStatus(prev => {
              if (prev && prev.id === data.id && ['COMPLETED', 'FAILED'].includes(prev.currentStatus)) {
                return {
                  id: -Date.now(),
                  operationType: null,
                  currentStatus: 'IDLE',
                  updatedAt: new Date().toISOString(),
                  startedAt: null,
                  endedAt: new Date().toISOString(),
                  progressDetails: {message: t('status.idle') || "System is idle."}
                };
              }
              return prev;
            });
          }, CLEAR_TERMINAL_STATUS_DELAY);
        }

        // Stop polling for terminal states
        stopPolling();
      }

    } catch (error) {
      if (!mountedRef.current) return;

      console.error('Status polling error:', error);
      pollAttemptCountRef.current++;

      // Stop polling after too many failures
      if (pollAttemptCountRef.current > 10) {
        stopPolling();
        toast.error('Lost connection to server. Please refresh the page.');
      }
    }
  }, [systemOperationStatus, t, fetchFiles]);

  // Start polling
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return; // Already polling

    setIsPollingActive(true);
    pollAttemptCountRef.current = 0;

    // Start status polling
    pollOperationStatus(); // Initial call
    pollingIntervalRef.current = setInterval(pollOperationStatus, STATUS_POLL_INTERVAL);

    // Start file refresh polling (less frequent)
    fileRefreshIntervalRef.current = setInterval(() => {
      if (!isFetchingFiles) {
        fetchFiles(true);
      }
    }, FILE_POLL_INTERVAL);

  }, [pollOperationStatus, fetchFiles, isFetchingFiles]);

  // Stop polling
  const stopPolling = useCallback(() => {
    setIsPollingActive(false);
    pollAttemptCountRef.current = 0;

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (fileRefreshIntervalRef.current) {
      clearInterval(fileRefreshIntervalRef.current);
      fileRefreshIntervalRef.current = null;
    }
  }, []);

  // Initialize component
  const initialize = useCallback(async () => {
    if (!mountedRef.current) return;

    setIsInitializing(true);

    try {
      // Fetch initial status
      const response = await fetch('/api/operations/status');
      if (response.ok) {
        const initialOpStatus: SystemOperation = await response.json();

        if (!mountedRef.current) return;

        setSystemOperationStatus(initialOpStatus);

        if (initialOpStatus.operationType === 'SHAREPOINT_SYNC_AND_PROCESS' &&
          initialOpStatus.currentStatus === 'COMPLETED' &&
          initialOpStatus.endedAt) {
          setLastSuccessfulSyncTime(initialOpStatus.endedAt);
        }

        // Set initial last completed operation
        if (['COMPLETED', 'FAILED'].includes(initialOpStatus.currentStatus) && initialOpStatus.operationType) {
          setLastCompletedOperation({
            type: initialOpStatus.operationType,
            status: initialOpStatus.currentStatus as 'COMPLETED' | 'FAILED',
            endTime: initialOpStatus.endedAt || initialOpStatus.updatedAt,
            // @ts-ignore
            message: initialOpStatus.currentStatus === 'FAILED' ? initialOpStatus.errorMessage : undefined
          });
        }

        const isActive = !['COMPLETED', 'FAILED', 'IDLE'].includes(initialOpStatus.currentStatus);

        if (isActive) {
          startPolling();
        } else {
          // Handle terminal states immediately
          if (['COMPLETED', 'FAILED'].includes(initialOpStatus.currentStatus)) {
            setTimeout(() => {
              if (!mountedRef.current) return;
              setSystemOperationStatus({
                id: -Date.now(),
                operationType: null,
                currentStatus: 'IDLE',
                updatedAt: new Date().toISOString(),
                startedAt: null,
                endedAt: new Date().toISOString(),
                progressDetails: {message: t('status.idle') || "System is idle."}
              });
            }, CLEAR_TERMINAL_STATUS_DELAY / 2);
          }
        }
      }

      // Initial file load
      await fetchFiles(true);

    } catch (error) {
      console.error('Initialization error:', error);
      if (mountedRef.current) {
        toast.error(t('errors.fetchInitialStatusFailed') || 'Could not fetch initial system status.');
      }
    } finally {
      if (mountedRef.current) {
        setIsInitializing(false);
      }
    }
  }, [startPolling, fetchFiles, t]);

  // Generic operation handler with immediate UI feedback
  const handleGenericOperation = useCallback(async (
    endpoint: string,
    method: 'POST',
    body: any,
    operationTypeForToast: string,
    operationTypeEnumForStatus: string
  ) => {
    if (isSystemBusy) {
      toast.info(t('status.operationAlreadyInProgress'));
      return;
    }

    // Show immediate loading state
    const immediateOperationState: SystemOperation = {
      id: -Date.now(),
      operationType: operationTypeEnumForStatus,
      currentStatus: 'INITIATING',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      endedAt: null,
      progressDetails: {
        message: t('status.initiatingOp', {type: operationTypeForToast}) || `Starting ${operationTypeForToast}...`,
        percent: 0
      }
    };

    setSystemOperationStatus(immediateOperationState);
    setOperationProgress(0);

    // Show immediate toast
    toast.info(t('status.operationStarting', {type: operationTypeForToast}) || `Starting ${operationTypeForToast}...`);

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
      });

      const responseData = await response.json().catch(() => ({
        error: t('errors.invalidJsonResponse') || "Invalid server response"
      }));

      if (!response.ok) {
        const errorMessage = responseData.error ||
          (response.status === 429 ?
              (t('errors.systemBusy') || "System busy...") :
              (t('errors.httpError', {status: response.status}) || `HTTP error ${response.status}`)
          );

        // Update to error state
        setSystemOperationStatus({
          ...immediateOperationState,
          currentStatus: 'FAILED',
          errorMessage: errorMessage,
          endedAt: new Date().toISOString(),
          progressDetails: {
            message: errorMessage
          }
        });

        toast.error(errorMessage);

        // Clear error state after delay
        setTimeout(() => {
          setSystemOperationStatus({
            id: -Date.now(),
            operationType: null,
            currentStatus: 'IDLE',
            startedAt: null,
            updatedAt: new Date().toISOString(),
            endedAt: new Date().toISOString(),
            progressDetails: {message: t('status.idle') || "System is idle."}
          });
        }, 3000);

        return;
      }

      // Set actual operation state from server response
      if (responseData?.id && responseData.currentStatus) {
        setSystemOperationStatus(responseData as SystemOperation);
        if (typeof responseData.progressDetails?.percent === 'number') {
          setOperationProgress(responseData.progressDetails.percent);
        }

        // Start polling for this operation
        startPolling();
      }

      // Update toast to indicate successful start
      toast.success(t('status.operationStarted', {type: operationTypeForToast}) || `${operationTypeForToast} started successfully`);

      // Clear selected files for delete operations
      if (endpoint.includes('delete')) {
        setSelectedFileKeys([]);
      }

    } catch (error) {
      console.error(`${operationTypeForToast} initiation error:`, error);
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Update to error state
      setSystemOperationStatus({
        ...immediateOperationState,
        currentStatus: 'FAILED',
        errorMessage: errorMsg,
        endedAt: new Date().toISOString(),
        progressDetails: {
          message: `Failed to start ${operationTypeForToast}: ${errorMsg}`
        }
      });

      toast.error(errorMsg);

      // Clear error state after delay
      setTimeout(() => {
        setSystemOperationStatus({
          id: -Date.now(),
          operationType: null,
          currentStatus: 'IDLE',
          startedAt: null,
          updatedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          progressDetails: {message: t('status.idle') || "System is idle."}
        });
      }, 3000);
    }
  }, [isSystemBusy, t, startPolling]);

  // Specific operation handlers
  const handleUpload = useCallback(async () => {
    if (!filesToUpload.length) {
      toast.error(t('errors.fileUploadNoSelection'));
      return;
    }
    if (uploadValidationError) {
      toast.error(uploadValidationError);
      return;
    }
    if (isSystemBusy) {
      toast.info(t('status.operationAlreadyInProgress'));
      return;
    }

    const operationTypeForToast = t('operations.type.upload') || 'Upload';

    // Show immediate loading state
    const immediateOperationState: SystemOperation = {
      id: -Date.now(),
      operationType: 'MANUAL_UPLOAD_AND_PROCESS',
      currentStatus: 'INITIATING',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      endedAt: null,
      progressDetails: {
        message: t('status.initiatingOp', {type: operationTypeForToast}) || `Starting ${operationTypeForToast}...`,
        percent: 0,
        totalFiles: filesToUpload.length
      }
    };

    setSystemOperationStatus(immediateOperationState);
    setOperationProgress(0);

    // Show immediate toast
    toast.info(t('status.operationStarting', {type: operationTypeForToast}) || `Starting upload of ${filesToUpload.length} files...`);

    try {
      const formData = new FormData();
      filesToUpload.forEach((file) => formData.append('files', file));

      const response = await fetch('/api/knowledge-base/upload', {
        method: 'POST',
        body: formData
      });

      const responseData = await response.json().catch(() => ({
        error: t('errors.invalidJsonResponse') || "Invalid server response"
      }));

      if (!response.ok) {
        const errorMessage = responseData.error ||
          (response.status === 429 ?
              (t('errors.systemBusy') || "System busy...") :
              (t('errors.httpError', {status: response.status}) || `HTTP error ${response.status}`)
          );

        // Update to error state
        setSystemOperationStatus({
          ...immediateOperationState,
          currentStatus: 'FAILED',
          errorMessage: errorMessage,
          endedAt: new Date().toISOString(),
          progressDetails: {
            message: errorMessage
          }
        });

        toast.error(errorMessage);

        // Clear error state after delay
        setTimeout(() => {
          setSystemOperationStatus({
            id: -Date.now(),
            operationType: null,
            currentStatus: 'IDLE',
            startedAt: null,
            updatedAt: new Date().toISOString(),
            endedAt: new Date().toISOString(),
            progressDetails: {message: t('status.idle') || "System is idle."}
          });
        }, 3000);

        return;
      }

      // Clear upload files immediately on successful start
      setFilesToUpload([]);

      // Update toast to success
      toast.success(t('status.operationStarted', {type: operationTypeForToast}) || `Upload started successfully`);

      if (responseData?.id && responseData.currentStatus) {
        setSystemOperationStatus(responseData as SystemOperation);
        if (typeof responseData.progressDetails?.percent === 'number') {
          setOperationProgress(responseData.progressDetails.percent);
        }
        startPolling();
      }

    } catch (error) {
      console.error('Upload initiation error:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Update to error state
      setSystemOperationStatus({
        ...immediateOperationState,
        currentStatus: 'FAILED',
        errorMessage: errorMsg,
        endedAt: new Date().toISOString(),
        progressDetails: {
          message: `Failed to start upload: ${errorMsg}`
        }
      });

      toast.error(errorMsg);

      // Clear error state after delay
      setTimeout(() => {
        setSystemOperationStatus({
          id: -Date.now(),
          operationType: null,
          currentStatus: 'IDLE',
          startedAt: null,
          updatedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          progressDetails: {message: t('status.idle') || "System is idle."}
        });
      }, 3000);
    }
  }, [filesToUpload, uploadValidationError, isSystemBusy, t, startPolling]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedFileKeys.length === 0) {
      toast.error(t('errors.noFilesSelected'));
      return;
    }
    handleGenericOperation(
      '/api/knowledge-base/delete-multiple',
      'POST',
      {documentIds: selectedFileKeys},
      t('operations.type.deleteMultiple') || 'Delete Selected',
      'FILE_DELETION_AND_PROCESS'
    );
    setDeleteDialogOpen(false);
  }, [selectedFileKeys, handleGenericOperation, t]);

  const handleDeleteSingle = useCallback((documentId: string) => {
    handleGenericOperation(
      '/api/knowledge-base/delete-single',
      'POST',
      {documentId},
      t('operations.type.deleteSingle') || 'Delete File',
      'FILE_DELETION_AND_PROCESS'
    );
  }, [handleGenericOperation, t]);

  const handleSyncSharepoint = useCallback(() => {
    handleGenericOperation(
      '/api/knowledge-base/sync-sharepoint',
      'POST',
      {},
      t('operations.type.syncSharepoint') || 'SharePoint Sync',
      'SHAREPOINT_SYNC_AND_PROCESS'
    );
  }, [handleGenericOperation, t]);

  const handleProcessPending = useCallback(() => {
    handleGenericOperation(
      '/api/knowledge-base/process-pending',
      'POST',
      {},
      t('operations.type.processPending') || 'Process Pending',
      'BEDROCK_PROCESS_PENDING'
    );
  }, [handleGenericOperation, t]);

  // Stop/Cancel current operation
  const handleStopOperation = useCallback(async () => {
    if (!systemOperationStatus?.id) return;

    // Show immediate feedback
    setSystemOperationStatus(prev => prev ? {
      ...prev,
      progressDetails: {
        ...prev.progressDetails,
        message: 'Cancelling operation...'
      }
    } : prev);

    try {
      console.log(`[Stop Operation] Attempting to cancel operation ${systemOperationStatus.id}`);

      const response = await fetch('/api/operations/cancel', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ operationId: systemOperationStatus.id })
      });

      const result = await response.json();
      console.log(`[Stop Operation] Response:`, result);

      if (response.ok && result.success) {
        toast.success(t('status.operationCancelled') || 'Operation cancelled');
        stopPolling();

        // Update to cancelled state immediately
        setSystemOperationStatus(prev => prev ? {
          ...prev,
          currentStatus: 'FAILED',
          endedAt: new Date().toISOString(),
          errorMessage: 'User cancelled operation',
          progressDetails: {
            message: 'Operation cancelled by user',
            wasCancelled: true
          }
        } : prev);

        // Refresh status after short delay
        setTimeout(() => initialize(), 1500);
      } else {
        console.error('[Stop Operation] Failed:', result.error);
        toast.error(result.error || t('errors.cancelFailed') || 'Failed to cancel operation');
      }
    } catch (error) {
      console.error('Cancel operation error:', error);
      toast.error(t('errors.cancelFailed') || 'Failed to cancel operation');
    }
  }, [systemOperationStatus, t, stopPolling, initialize]);

  // Pagination handler
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage && !isFetchingFiles) {
      setCurrentPage(page);
    }
  };

  const handleSort = useCallback((field: SortField) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';

    // Update state
    setSortField(field);
    setSortDirection(newDirection);

    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear any pending search timeouts
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Immediately fetch with new sort parameters, using current search query and page 1
    fetchFilesWithNewSort(field, newDirection, searchQuery, 1);
  }, [sortField, sortDirection, searchQuery]);

// Create a specialized fetch function for sorting that accepts explicit sort parameters
  const fetchFilesWithNewSort = useCallback(async (
    newSortField: SortField,
    newSortDirection: SortDirection,
    queryOverride?: string,
    pageOverride?: number
  ) => {
    if (!mountedRef.current) return;

    // Abort previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    setIsFetchingFiles(true);

    const url = new URL('/api/knowledge-base/files', window.location.origin);
    url.searchParams.append('page', (pageOverride ?? currentPage).toString());
    url.searchParams.append('limit', pageLimit.toString());
    url.searchParams.append('sortField', newSortField);
    url.searchParams.append('sortDirection', newSortDirection);

    // Use override query if provided, otherwise use current state
    const queryToUse = queryOverride !== undefined ? queryOverride : searchQuery;
    if (queryToUse.trim()) {
      url.searchParams.append('searchQuery', queryToUse.trim());
    }

    try {
      const response = await fetch(url.toString(), {
        signal: abortControllerRef.current.signal,
        cache: 'no-cache'
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = (await response.json()) as ApiFileListResponse;

      if (!mountedRef.current) return;

      if (data.error) {
        throw new Error(data.error);
      }

      setFileList(data.files || []);
      setCurrentPage(data.pagination.page);
      setTotalPages(data.pagination.totalPages);
      setTotalCount(data.pagination.totalCount);

    } catch (error) {
      if (!mountedRef.current) return;

      if (error instanceof DOMException && error.name === 'AbortError') {
        return; // Request was cancelled, ignore
      }

      console.error('File list fetch error:', error);

      // Only show error toast if it's not during active polling
      if (!isPollingActive) {
        toast.error(t('errors.fileListRefresh') || 'Failed to refresh file list.');
      }
    } finally {
      if (mountedRef.current) {
        setIsFetchingFiles(false);
      }
    }
  }, [currentPage, pageLimit, searchQuery, t, isPollingActive]);

  // Dropzone configuration
  const onDrop = useCallback(
    (droppedFiles: File[]) => {
      const currentFileCountInQueue = filesToUpload.length;
      const remainingSlots = MAX_FILES_CLIENT - currentFileCountInQueue;

      if (remainingSlots <= 0) {
        toast.error(t('errors.tooManyFilesOverall', {max: MAX_FILES_CLIENT})); // Overall limit reached
        return;
      }

      let filesToValidateInThisAttempt = droppedFiles;
      if (droppedFiles.length > remainingSlots) {
        filesToValidateInThisAttempt = droppedFiles.slice(0, remainingSlots);
        toast.warning(t('warnings.someFilesClippedMaxCount', { // Files from current drop clipped
          count: droppedFiles.length - remainingSlots,
          maxInQueue: MAX_FILES_CLIENT
        }));
      }

      const validationResult = validateFilesForUpload(filesToValidateInThisAttempt, filesToUpload);

      // Show toasts for individual files that were skipped
      validationResult.skippedFileWarnings.forEach((warningMsg) => {
        toast.warning(warningMsg);
      });

      // Handle overall batch validation outcome
      if (validationResult.errorMessageForUI) {
        setUploadValidationError(validationResult.errorMessageForUI);
        // The toast for individual skips might be enough, or you can add a general error toast
        if (validationResult.acceptedBatchFiles.length === 0) { // Only show general error toast if nothing was accepted
          toast.error(validationResult.errorMessageForUI);
        }
      } else {
        // If files were accepted, clear any previous general UI validation error
        if (uploadValidationError) {
          setUploadValidationError('');
        }
        // Optional: Info toast for partial success if some were accepted but others skipped
        if (validationResult.acceptedBatchFiles.length > 0 && validationResult.skippedFileWarnings.length > 0) {
          toast.info(t('infos.batchPartialSuccess', {
            accepted: validationResult.acceptedBatchFiles.length,
            attempted: filesToValidateInThisAttempt.length
          }));
        }
      }

      if (validationResult.acceptedBatchFiles.length > 0) {
        setFilesToUpload((prevFiles) => [...prevFiles, ...validationResult.acceptedBatchFiles]);
      }
    },
    [filesToUpload, t, validateFilesForUpload, uploadValidationError, formatFileSize] // formatFileSize added
  );

  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    onDrop,
    maxSize: MAX_FILE_SIZE_CLIENT,
    disabled: filesToUpload.length >= MAX_FILES_CLIENT || isSystemBusy || isInitializing,
    validator: (file: File) => {
      if (file.size === 0) return {code: 'file-empty', message: t('dropzone.fileEmpty') || 'File is empty'};
      return null;
    },
  });

  // Effects
  useEffect(() => {
    mountedRef.current = true;
    initialize();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isInitializing && !isFetchingFiles && !isSystemBusy) {
      fetchFiles(false);
    }
  }, [currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setCurrentPage(1);
  }, [sortField, sortDirection]);

  useEffect(() => {
    if (filesToUpload.length < MAX_FILES_CLIENT && uploadValidationError) {
      setUploadValidationError('');
    }
  }, [filesToUpload, uploadValidationError]);

  // Display message for operation status - user-friendly version
  const getOperationDisplayMessage = (): string => {
    if (!systemOperationStatus || systemOperationStatus.currentStatus === 'IDLE') return '';

    const opType = systemOperationStatus.operationType;
    const status = systemOperationStatus.currentStatus;
    const progress = systemOperationStatus.progressDetails;

    // For terminal states, show simple messages
    if (['COMPLETED', 'FAILED'].includes(status)) {
      if (status === 'COMPLETED') {
        return t(`operations.complete.${opType?.toLowerCase()}`) ||
          progress?.message ||
          t('status.operationCompleted') ||
          'Operation completed successfully';
      } else {
        return systemOperationStatus.errorMessage ||
          progress?.message ||
          t('status.operationFailed') ||
          'Operation failed';
      }
    }

    // For active operations, show user-friendly status
    let message = '';

    switch (status) {
      case 'STARTED':
      case 'INITIATING':
        message = t(`operations.starting.${opType?.toLowerCase()}`) ||
          t('status.starting') ||
          'Starting operation...';
        break;
      case 'PULLING_FROM_SHAREPOINT':
        message = t('status.pullingFromSharePoint') || 'Getting files from SharePoint...';
        break;
      case 'UPLOADING_TO_S3':
        if (progress?.currentFile) {
          message = `Uploading: ${progress.currentFile}`;
        } else if (progress?.processedFiles && progress?.totalFiles) {
          message = `Uploading files... ${progress.processedFiles} of ${progress.totalFiles} complete`;
        } else {
          message = t('status.uploadingFiles') || 'Uploading files...';
        }
        break;
      case 'FLAGGING_FOR_BEDROCK':
        message = t('status.preparingForProcessing') || 'Preparing files for processing...';
        break;
      case 'BEDROCK_PROCESSING_SUBMITTED':
        message = t('status.submittedToProcessor') || 'Files submitted for processing...';
        break;
      case 'BEDROCK_POLLING_STATUS':
        // This is where we make it user-friendly
        message = getUserFriendlyProcessingMessage(progress);
        break;
      default:
        message = progress?.message ||
          t(`operations.status.${opType?.toLowerCase()}.${status.toLowerCase()}`) ||
          t('status.processing') ||
          'Processing...';
    }

    return message;
  };

  // Helper function to create user-friendly processing messages
  const getUserFriendlyProcessingMessage = (progress: any): string => {
    if (!progress) {
      return t('status.processingFiles') || 'Processing files...';
    }

    const pendingIngestions = progress.pendingIngestions || 0;
    const pendingDeletions = progress.pendingDeletions || 0;
    const activeOperations = progress.activeBedrockOperations || 0;

    // Calculate simple stats
    const totalProcessing = pendingIngestions + pendingDeletions;
    const currentlyActive = activeOperations;

    if (totalProcessing === 0 && currentlyActive === 0) {
      return t('status.finalizingProcessing') || 'Finalizing processing...';
    }

    // Create user-friendly messages based on what's happening
    if (pendingDeletions > 0 && pendingIngestions > 0) {
      return t('status.processingAndDeleting', {
        processing: pendingIngestions,
        deleting: pendingDeletions,
        active: currentlyActive
      }) || `Processing ${pendingIngestions} files and deleting ${pendingDeletions} files... ${currentlyActive} active`;
    } else if (pendingDeletions > 0) {
      return t('status.deletingFiles', {
        count: pendingDeletions,
        active: currentlyActive
      }) || `Deleting ${pendingDeletions} files... ${currentlyActive} in progress`;
    } else if (pendingIngestions > 0) {
      return t('status.processingFiles', {
        count: pendingIngestions,
        active: currentlyActive
      }) || `Processing ${pendingIngestions} files... ${currentlyActive} in progress`;
    } else if (currentlyActive > 0) {
      return t('status.completingProcessing', {
        active: currentlyActive
      }) || `Completing processing... ${currentlyActive} files finishing up`;
    }

    return t('status.processingFiles') || 'Processing files...';
  };

  // Pagination component
  const PaginationComponent = () => {
    const pageNumbers = useMemo(() => {
      const maxVisiblePages = 5;
      const pages: (number | string)[] = [];

      if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = startPage + maxVisiblePages - 1;

        if (endPage > totalPages) {
          endPage = totalPages;
          startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
          pages.push(1);
          if (startPage > 2) pages.push('...');
        }

        for (let i = startPage; i <= endPage; i++) pages.push(i);

        if (endPage < totalPages) {
          if (endPage < totalPages - 1) pages.push('...');
          pages.push(totalPages);
        }
      }

      return pages;
    }, [currentPage, totalPages]);

    if (totalPages <= 1) return null;

    const isPagingDisabled = isFetchingFiles || isSystemBusy || isInitializing;

    return (
      <div className="flex items-center justify-center mt-4" aria-label={t('pagination.label') || "Pagination"}>
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isPagingDisabled}
            aria-label={t('pagination.previousPage') || "Previous Page"}
          >
            <ChevronLeft className="h-4 w-4"/>
          </Button>

          {pageNumbers.map((page, index) =>
            page === '...' ? (
              <span key={`gap-${index}`} className="text-muted-foreground px-2 py-1 text-sm">...</span>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePageChange(page as number)}
                disabled={isPagingDisabled}
                aria-current={currentPage === page ? "page" : undefined}
              >
                {page}
              </Button>
            )
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || isPagingDisabled}
            aria-label={t('pagination.nextPage') || "Next Page"}
          >
            <ChevronRight className="h-4 w-4"/>
          </Button>
        </div>
      </div>
    );
  };

  // Pagination info display
  const PaginationInfoDisplay = () => {
    if (totalCount === 0 && !isFetchingFiles && !isInitializing && !isSystemBusy) return null;

    const startItem = totalCount > 0 ? Math.min((currentPage - 1) * pageLimit + 1, totalCount) : 0;
    const endItem = Math.min(currentPage * pageLimit, totalCount);

    if ((isFetchingFiles || isInitializing) && totalCount === 0) {
      return (
        <div className="text-sm text-muted-foreground mt-4 text-center animate-pulse">
          {t('labels.loadingPagination') || 'Loading entries...'}
        </div>
      );
    }

    return (
      <div className="text-sm text-muted-foreground mt-4 text-center">
        {t('labels.paginationInfo', {
          start: startItem,
          end: endItem,
          total: totalCount,
          totalPages: totalPages,
          page: currentPage
        }) || `Showing ${startItem}-${endItem} of ${totalCount} (Page ${currentPage}/${totalPages})`}
      </div>
    );
  };

  // Loading state for initial load
  if (isInitializing) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t('status.initializing') || 'Initializing...'}</p>
        </div>
      </div>
    );
  }

  const disableAllActions = isSystemBusy || isInitializing;

  return (
    <div className="flex h-full flex-wrap lg:flex-nowrap">
      {/* Sidebar */}
      <div className="w-full lg:w-1/3 xl:w-1/4 border-r border-input p-4 space-y-4">
        <h2 className="text-lg font-semibold">{t('files.fileManagement')}</h2>

        {/* Last Sync Info */}
        <div className="p-3 my-2 border rounded-md bg-muted/20 shadow-sm">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground"/>
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                {t('sharepoint.lastSyncTitle') || 'Last SharePoint Sync'}
              </p>
              <p className="text-sm font-semibold">
                {lastSuccessfulSyncTime ?
                  new Date(lastSuccessfulSyncTime).toLocaleString(t('locale') || undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  }) :
                  (t('sharepoint.neverSynced') || 'Never')
                }
              </p>
            </div>
          </div>
        </div>

        {/* Last Operation Info */}
        {lastCompletedOperation && (
          <div className="p-3 my-2 border rounded-md bg-muted/20 shadow-sm">
            <div className="flex items-center gap-2">
              {lastCompletedOperation.status === 'COMPLETED' ? (
                <Check className="h-5 w-5 text-green-600"/>
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600"/>
              )}
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  {t('operations.lastOperation') || 'Last Operation'}
                </p>
                <p className={`text-sm font-semibold ${lastCompletedOperation.status === 'COMPLETED' ? 'text-green-700' : 'text-red-700'}`}>
                  {t(`operations.types.${lastCompletedOperation.type.toLowerCase()}`) || lastCompletedOperation.type} - {lastCompletedOperation.status === 'COMPLETED' ? t('status.success') || 'Success' : t('status.failed') || 'Failed'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(lastCompletedOperation.endTime).toLocaleString(t('locale') || undefined, {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  })}
                </p>
                {lastCompletedOperation.message && (
                  <p className="text-xs text-red-600 mt-1 truncate" title={lastCompletedOperation.message}>
                    {lastCompletedOperation.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4"/>
          <AlertTitle>{t('alerts.knowledgeBaseInfo')}</AlertTitle>
          <AlertDescription>{t('alerts.knowledgeBaseDescription')}</AlertDescription>
        </Alert>

        {/* SharePoint Sync Button */}
        <Button
          variant="outline"
          className="w-full hover:bg-accent"
          onClick={handleSyncSharepoint}
          disabled={disableAllActions}
        >
          {isSystemBusy && systemOperationStatus?.operationType === 'SHAREPOINT_SYNC_AND_PROCESS' ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="animate-spin h-4 w-4"/>
              {t('status.synchronizing')}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <CloudCog className="h-4 w-4"/>
              {t('sharepoint.syncWithSharepoint')}
            </span>
          )}
        </Button>

        {/* File Upload Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed border-input rounded-lg p-6 text-center bg-background hover:bg-accent/5 cursor-pointer transition-colors ${
            disableAllActions || filesToUpload.length >= MAX_FILES_CLIENT ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <input {...getInputProps()} disabled={disableAllActions || filesToUpload.length >= MAX_FILES_CLIENT}/>
          <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground"/>

          {filesToUpload.length >= MAX_FILES_CLIENT ? (
            <p className="text-sm mb-2 text-amber-500">
              {t('warnings.maxFilesReached', {max: MAX_FILES_CLIENT})}
            </p>
          ) : isDragActive ? (
            <p className="text-sm mb-2">{t('placeholders.dragActive')}</p>
          ) : (
            <p className="text-sm mb-2">{t('placeholders.dragInactive')}</p>
          )}

          <p className="text-xs text-muted-foreground">
            {t('labels.fileLimit', {
              max: MAX_FILES_CLIENT,
              size: formatFileSize(MAX_FILE_SIZE_CLIENT)
            })}
          </p>
        </div>

        {/* Upload Validation Error */}
        {uploadValidationError && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4"/>
            <AlertTitle>{t('errors.validationErrorTitle') || "Validation Error"}</AlertTitle>
            <AlertDescription>{uploadValidationError}</AlertDescription>
          </Alert>
        )}

        {/* Selected Files for Upload */}
        {filesToUpload.length > 0 && (
          <div className="bg-accent/5 rounded-lg p-4">
            <h3 className="text-sm font-medium mb-2 flex justify-between items-baseline">
              <span>{t('labels.selectedFiles')} ({filesToUpload.length})</span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(filesToUpload.reduce((sum, file) => sum + file.size, 0))}
              </span>
            </h3>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {filesToUpload.map((file, index) => (
                <div key={index} className="text-sm text-muted-foreground flex items-center gap-2 p-1.5 rounded hover:bg-accent/20 group">
                  <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground/70"/>
                  <span className="flex-1 truncate" title={file.name}>{file.name}</span>
                  <span className="text-xs">({formatFileSize(file.size)})</span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearUploadFiles}
                disabled={disableAllActions}
              >
                {t('actions.clearAll')}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleUpload}
                disabled={disableAllActions || !filesToUpload.length || !!uploadValidationError}
              >
                {isSystemBusy && systemOperationStatus?.operationType === 'MANUAL_UPLOAD_AND_PROCESS' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2"/>
                    {t('fileUpload.uploading')}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2"/>
                    {t('buttons.uploadFiles')}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-hidden lg:overflow-auto">
        <div className="space-y-4">
          {/* Operation Status Alert - Only show for active operations */}
          {systemOperationStatus && isSystemBusy && (
            <Alert variant="default">
              <div className="flex gap-2 items-center justify-between">
                <div className="flex gap-2 items-center flex-1">
                  <Loader2 className="h-4 w-4 animate-spin"/>
                  <AlertTitle className="flex-1">
                    {getOperationDisplayMessage()}
                  </AlertTitle>
                </div>

                {/*Stop Operation Button */}
                {/*//TODO: Fix this stop action feature to work properly, currently its wonky*/}
                {/*<Button*/}
                {/*  variant="outline"*/}
                {/*  size="sm"*/}
                {/*  onClick={handleStopOperation}*/}
                {/*  className="text-destructive hover:text-destructive hover:border-destructive/80"*/}
                {/*  disabled={!systemOperationStatus?.id}*/}
                {/*>*/}
                {/*  <X className="h-4 w-4 mr-1"/>*/}
                {/*  {t('actions.stop') || 'Stop'}*/}
                {/*</Button>*/}
              </div>

              <AlertDescription className="mt-2">
                <div className="space-y-1">
                  {operationProgress >= 0 && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="truncate max-w-[70%]">
                          {systemOperationStatus.progressDetails?.currentFile ||
                            t('status.progress') || 'Progress'}
                        </span>
                        <span>{Math.round(operationProgress)}%</span>
                      </div>
                      <Progress value={operationProgress} className="h-2"/>
                    </div>
                  )}

                  {/* Show user-friendly processing details */}
                  {systemOperationStatus.currentStatus === 'BEDROCK_POLLING_STATUS' && systemOperationStatus.progressDetails && (
                    <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {/* Files being processed */}
                        {systemOperationStatus.progressDetails.pendingIngestions > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            <span>
                              {t('status.filesBeingProcessed', {count: systemOperationStatus.progressDetails.pendingIngestions}) ||
                                `${systemOperationStatus.progressDetails.pendingIngestions} files waiting to be processed`}
                            </span>
                          </div>
                        )}

                        {/* Files being deleted */}
                        {systemOperationStatus.progressDetails.pendingDeletions > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span>
                              {t('status.filesBeingDeleted', {count: systemOperationStatus.progressDetails.pendingDeletions}) ||
                                `${systemOperationStatus.progressDetails.pendingDeletions} files being deleted`}
                            </span>
                          </div>
                        )}

                        {/* Currently active */}
                        {systemOperationStatus.progressDetails.activeBedrockOperations > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span>
                              {t('status.filesCurrentlyActive', {count: systemOperationStatus.progressDetails.activeBedrockOperations}) ||
                                `${systemOperationStatus.progressDetails.activeBedrockOperations} files currently being processed`}
                            </span>
                          </div>
                        )}

                        {/* Show completion stats if available */}
                        {(systemOperationStatus.progressDetails.ingestionsSubmittedThisRun > 0 ||
                          systemOperationStatus.progressDetails.statusesUpdatedToTerminalThisRun > 0) && (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                            <span>
                              {t('status.filesCompleted', {
                                  count: (systemOperationStatus.progressDetails.statusesUpdatedToTerminalThisRun || 0) +
                                    (systemOperationStatus.progressDetails.ingestionsSubmittedThisRun || 0)
                                }) ||
                                `${(systemOperationStatus.progressDetails.statusesUpdatedToTerminalThisRun || 0)} files completed this session`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Header with Search and Actions */}
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <div className="relative flex-grow sm:flex-grow-0">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
              <Input
                placeholder={t('files.search')}
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full md:w-64 h-9 pl-9 pr-8"
                disabled={disableAllActions}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted"
                  onClick={clearSearch}
                  disabled={disableAllActions}
                  title={t('actions.clearSearch') || 'Clear search'}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              {/* Delete Selected Button */}
              {selectedFileKeys.length > 0 && (
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:text-destructive hover:border-destructive/80"
                      disabled={disableAllActions}
                    >
                      <Trash2 className="h-4 w-4 mr-2"/>
                      {t('actions.deleteSelected', {count: selectedFileKeys.length})}
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>{t('dialogs.deleteSelectedTitle')}</DialogTitle>
                    </DialogHeader>

                    <div className="py-4">
                      <p className="text-sm text-muted-foreground">
                        {t('dialogs.deleteSelectedMessage', {count: selectedFileKeys.length})}
                      </p>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => setDeleteDialogOpen(false)}
                        disabled={disableAllActions}
                      >
                        {t('actions.cancel')}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteSelected}
                        disabled={disableAllActions}
                      >
                        {t('actions.delete')}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Process Pending Button */}
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-accent"
                onClick={handleProcessPending}
                disabled={disableAllActions}
              >
                <RefreshCw className="h-4 w-4 mr-2"/>
                {t('actions.processAllPending')}
              </Button>

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-accent"
                onClick={() => {
                  fetchFiles(true);
                  initialize();
                }}
                disabled={isFetchingFiles || disableAllActions}
              >
                {(isFetchingFiles && !disableAllActions) ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2"/>
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2"/>
                )}
                {t('actions.refreshList')}
              </Button>
            </div>
          </div>

          {/* File Table */}
          <div>
            <FileTable
              files={fileList}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              selectedFiles={selectedFileKeys}
              setSelectedFiles={setSelectedFileKeys}
              onDeleteSingle={handleDeleteSingle}
              isLoading={isFetchingFiles}
              isSystemBusy={isSystemBusy || undefined} // Pass system busy state to disable table actions
            />
          </div>

          {/* Pagination Info and Controls */}
          <PaginationInfoDisplay/>
          <PaginationComponent/>
        </div>
      </div>
    </div>
  );
}