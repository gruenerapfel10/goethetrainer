'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  XCircle,
  AlertTriangle,
  Zap,
  Clock,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import type {
  GenerationProgress,
  GenerationSummary,
} from '@/lib/use-case-generation';
import { useTranslations } from 'next-intl';

// Modal stages
type ModalStage = 'confirmation' | 'progress' | 'summary';

interface UseCaseGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerationComplete?: () => void;
  categories?: Array<{
    id: string;
    title: string;
  }>;
}

export function UseCaseGenerateModal({
  isOpen,
  onClose,
  onGenerationComplete,
  categories,
}: UseCaseGenerateModalProps) {
  const t = useTranslations('dashboard.topUseCases.modal.generate');

  // Modal stage state
  const [modalStage, setModalStage] =
    React.useState<ModalStage>('confirmation');

  // Progress tracking state
  const [progress, setProgress] = React.useState<GenerationProgress | null>(
    null,
  );
  const [generationComplete, setGenerationComplete] = React.useState(false);
  const [generationError, setGenerationError] = React.useState<string | null>(
    null,
  );
  const [generationSummary, setGenerationSummary] =
    React.useState<GenerationSummary | null>(null);
  const [hasSeenSummary, setHasSeenSummary] = React.useState(false);

  // Generation in progress flag - to track if generation is happening in background
  const [isGenerating, setIsGenerating] = React.useState(false);

  // Event source for SSE
  const eventSourceRef = React.useRef<EventSource | null>(null);

  // State for continuously updated elapsed time
  const [displayElapsedTime, setDisplayElapsedTime] = React.useState<number>(0);

  // Cleanup function for event source
  const cleanupEventSource = React.useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      cleanupEventSource();
    };
  }, [cleanupEventSource]);

  // Logic when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      // If generation is complete and user hasn't seen summary, show summary
      if (generationComplete && !hasSeenSummary) {
        setModalStage('summary');
      }
      // If generation is in progress but modal was closed, show progress
      else if (isGenerating) {
        setModalStage('progress');
      }
      // Default to confirmation stage
      else {
        setModalStage('confirmation');
        // Reset elapsed time when not showing progress
        setDisplayElapsedTime(0);
      }
    }
  }, [isOpen, generationComplete, hasSeenSummary, isGenerating]);

  // Effect to update elapsed time continuously
  React.useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (
      modalStage === 'progress' &&
      progress?.timing?.totalElapsedTime !== undefined
    ) {
      // Use the start time of the *entire process* if available, otherwise fallback needed
      // Assuming totalElapsedTime is updated by SSE roughly, we use it as a base
      // and add the time passed since the last update.
      const lastUpdateTime = Date.now();
      const lastKnownElapsedTime = progress.timing.totalElapsedTime;

      intervalId = setInterval(() => {
        const timeSinceLastUpdate = Date.now() - lastUpdateTime;
        setDisplayElapsedTime(lastKnownElapsedTime + timeSinceLastUpdate);
      }, 1000); // Update every second
    } else {
      // If not in progress or no timing info, use the last known value from SSE
      setDisplayElapsedTime(progress?.timing?.totalElapsedTime ?? 0);
    }

    // Cleanup interval on unmount or when dependencies change
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
    // Rerun effect when modal stage or progress timing changes
  }, [modalStage, progress?.timing?.totalElapsedTime]);

  // Start generation process
  const startGenerateProcess = React.useCallback(async () => {
    try {
      // Update states
      setIsGenerating(true);
      setModalStage('progress');
      setGenerationComplete(false);
      setGenerationError(null);
      setGenerationSummary(null);
      setHasSeenSummary(false);

      // Create EventSource for SSE
      const url = `/api/generate-top-use-cases?includeProgress=true`;
      cleanupEventSource();

      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.progress) {
          setProgress(data.progress);

          // Check if process is complete based on status or percentage
          if (
            data.progress.statusIndicator === 'complete' ||
            data.progress.progressPercentage >= 100
          ) {
            setGenerationComplete(true);
          }
        }

        if (data.summary) {
          setGenerationSummary(data.summary);
          setGenerationComplete(true);
          setIsGenerating(false);

          // Call the new callback on successful completion
          onGenerationComplete?.();

          // If modal is open, change to summary automatically
          if (isOpen) {
            setModalStage('summary');
          }

          cleanupEventSource();
        }

        if (data.error) {
          setGenerationError(data.error);
          setIsGenerating(false);
          cleanupEventSource();
        }
      };

      eventSource.onerror = () => {
        setGenerationError(
          'Connection to server lost. Generation may continue in the background.',
        );
        cleanupEventSource();
      };
    } catch (error) {
      setGenerationError(
        error instanceof Error
          ? error.message
          : 'Failed to start generation process',
      );
      setIsGenerating(false);
    }
  }, [cleanupEventSource, isOpen, onGenerationComplete]);

  // Handle close with different behaviors based on stage
  const handleClose = () => {
    // If in summary stage, mark as seen
    if (modalStage === 'summary') {
      setHasSeenSummary(true);
    }
    onClose();
  };

  // Reset generation - to be used when user wants to start fresh
  const resetGeneration = () => {
    setModalStage('confirmation');
    setProgress(null);
    setGenerationComplete(false);
    setGenerationError(null);
    setGenerationSummary(null);
    setHasSeenSummary(false);
    setIsGenerating(false);
    setDisplayElapsedTime(0);
  };

  // Render the confirmation stage
  const renderConfirmationStage = () => (
    <div className="space-y-6 py-4">
      <Alert className="mb-4">
        <HelpCircle className="h-4 w-4" />
        <AlertTitle>{t('title')}</AlertTitle>
        <AlertDescription>{t('description')}</AlertDescription>
      </Alert>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <p className="text-sm">{t('features.analyze')}</p>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <p className="text-sm">{t('features.group')}</p>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <p className="text-sm">{t('features.create')}</p>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <p className="text-sm">{t('features.consolidate')}</p>
        </div>
      </div>

      {categories && categories.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-medium">{t('categories')}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="p-3 border border-border rounded-md"
              >
                <p className="font-medium text-sm">{category.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Helper function to format duration in seconds to a readable string
  const formatDuration = (seconds: number): string => {
    if (seconds < 0 || !Number.isFinite(seconds)) return '-';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Render the progress stage
  const renderProgressStage = () => {
    if (generationError) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{generationError}</AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-4 py-4">
        {/* Overall Progress */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-primary">
              {t('progress')}
            </span>
            <span className="text-sm font-semibold text-primary">
              {progress?.progressPercentage ?? 0}%
            </span>
          </div>
          <Progress
            value={progress?.progressPercentage ?? 0}
            className="h-2 w-full"
          />
        </div>

        {/* Current Stage Info */}
        <Card className="p-4 bg-muted/50 border-muted">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-semibold truncate pr-2">
              {t('stage', {
                current: progress?.stage ?? '?',
                total: progress?.totalStages ?? '?',
              })}
              : {progress?.stageName || t('initializing')}
            </h4>
            {progress?.statusIndicator === 'processing' && (
              <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
            )}
            {progress?.statusIndicator === 'success' && (
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            )}
            {progress?.statusIndicator === 'warning' && (
              <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-3">
            {progress?.details || t('pleaseWait')}
          </p>

          {/* Sub-Stage Progress (if available) */}
          {progress?.subStage && progress.subStage.total > 0 && (
            <div className="mb-3 border-t pt-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-muted-foreground truncate pr-2">
                  {progress.subStage.name}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {progress.subStage.current} / {progress.subStage.total}
                </span>
              </div>
              <Progress
                value={
                  (progress.subStage.current / progress.subStage.total) * 100
                }
                className="h-1.5"
              />
            </div>
          )}

          {/* Metrics (if available) */}
          {progress?.metrics &&
            progress.metrics.totalItems !== undefined &&
            progress.metrics.totalItems > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs border-t pt-3">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                  <span className="truncate">
                    {t('metrics.processed', {
                      current: progress.metrics.processedItems,
                      total: progress.metrics.totalItems,
                    })}
                  </span>
                </div>
                {progress.metrics.processingSpeed !== undefined &&
                  progress.metrics.processingSpeed > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                      <span className="truncate">
                        {t('metrics.speed', {
                          speed: progress.metrics.processingSpeed.toFixed(1),
                        })}
                      </span>
                    </div>
                  )}
                {progress.metrics.estimatedTimeRemaining !== undefined &&
                  progress.metrics.estimatedTimeRemaining > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                      <span className="truncate">
                        {t('metrics.eta', {
                          time: formatDuration(
                            progress.metrics.estimatedTimeRemaining,
                          ),
                        })}
                      </span>
                    </div>
                  )}
              </div>
            )}

          {/* Timing (if available) */}
          {progress?.timing && progress.timing.totalElapsedTime > 0 && (
            <div className="text-xs text-muted-foreground border-t pt-3 mt-3">
              {/* Display the continuously updated time */}
              {t('metrics.elapsed', {
                time: formatDuration(displayElapsedTime / 1000),
              })}
            </div>
          )}
        </Card>

        {/* Background Alert */}
        {progress?.statusIndicator === 'processing' && (
          <Alert className="mt-4 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700/50">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <AlertTitle className="text-blue-700 dark:text-blue-300">
              {t('runningInBackground')}
            </AlertTitle>
            <AlertDescription className="text-xs text-blue-600 dark:text-blue-400">
              {t('runningInBackgroundDesc')}
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  // Render the summary stage
  const renderSummaryStage = () => {
    if (!generationSummary) {
      return (
        <Alert variant="destructive" className="mb-4">
          <XCircle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{t('summaryError')}</AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-4 py-4">
        <Card className="p-4 bg-muted/20">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <h3 className="text-lg font-semibold">{t('complete')}</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t('stats.messagesProcessed')}
              </p>
              <p className="text-2xl font-semibold">
                {generationSummary.totalMessagesProcessed}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t('stats.newUseCases')}
              </p>
              <p className="text-2xl font-semibold">
                {generationSummary.savedCount}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t('stats.messagesMerged')}
              </p>
              <p className="text-2xl font-semibold">
                {generationSummary.mergedMessagesCount || 0}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t('stats.categoriesCreated')}
              </p>
              <p className="text-2xl font-semibold">
                {generationSummary.newCategoriesCount}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t('stats.categoryAssignments')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <p className="text-sm">
                    {t('stats.existing')}:{' '}
                    {generationSummary.assignedToExistingCount}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  <p className="text-sm">
                    {t('stats.new')}: {generationSummary.assignedToNewCount}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {generationSummary.processingTime && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {t('stats.processingTime')}
              </p>
              <p className="text-lg font-medium">
                {(generationSummary.processingTime.total / 1000).toFixed(1)}{' '}
                {t('stats.seconds')}
              </p>
            </div>
          )}
        </Card>
      </div>
    );
  };

  // Render footer buttons based on current stage
  const renderFooter = () => {
    switch (modalStage) {
      case 'confirmation':
        return (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="h-10 px-4 w-full sm:w-auto"
            >
              {t('actions.cancel')}
            </Button>
            <Button
              type="button"
              onClick={startGenerateProcess}
              disabled={isGenerating}
              className="h-10 px-4 w-full sm:w-auto"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('actions.processing')}
                </>
              ) : (
                t('actions.generate')
              )}
            </Button>
          </>
        );

      case 'progress':
        return (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="h-10 px-4 w-full sm:w-auto"
            >
              {t('actions.close')}
            </Button>
            {generationError && (
              <Button
                variant="destructive"
                onClick={startGenerateProcess}
                className="h-10 px-4 w-full sm:w-auto"
              >
                {t('actions.retry')}
              </Button>
            )}
          </>
        );

      case 'summary':
        return (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={resetGeneration}
              className="h-10 px-4 w-full sm:w-auto"
            >
              {t('actions.generateAgain')}
            </Button>
            <Button
              onClick={handleClose}
              className="h-10 px-4 w-full sm:w-auto"
            >
              {t('actions.close')}
            </Button>
          </>
        );

      default:
        return null;
    }
  };

  // Get title based on current stage
  const getTitle = () => {
    switch (modalStage) {
      case 'confirmation':
        return t('title');
      case 'progress':
        return t('progress');
      case 'summary':
        return t('complete');
      default:
        return t('title');
    }
  };

  // Get description based on current stage
  const getDescription = () => {
    switch (modalStage) {
      case 'confirmation':
        return t('description');
      case 'progress':
        return t('progressDesc');
      case 'summary':
        return t('completeDesc');
      default:
        return '';
    }
  };

  // Render content based on current stage
  const renderContent = () => {
    switch (modalStage) {
      case 'confirmation':
        return renderConfirmationStage();
      case 'progress':
        return renderProgressStage();
      case 'summary':
        return renderSummaryStage();
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-[90vw] md:w-[80vw] lg:w-[60vw] xl:w-[50vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <p className="text-sm text-muted-foreground">{getDescription()}</p>
        </DialogHeader>

        {renderContent()}

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-end mt-4 pt-2 border-t">
          {renderFooter()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
