'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLearningSession, QuestionStatus } from '@/lib/sessions/learning-session-context';
import { useSessionPage } from '@/lib/sessions/session-page-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Loader2, MoreHorizontal } from 'lucide-react';
import type { QuestionResult } from '@/lib/sessions/questions/question-types';
import type { AnswerValue } from '@/lib/sessions/types';
import { resolveModuleComponent } from '@/components/question-modules/module-registry';
import { QuestionModuleId } from '@/lib/questions/modules/types';

// Import question components
import { AllQuestionsView } from '@/components/questions/MultipleChoice/AllQuestionsView';
import { SessionResultsView } from '@/components/questions/SessionResultsView';
import { SessionTypeEnum } from '@/lib/sessions/session-registry';

export function SessionOrchestrator() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const { sessionType } = useSessionPage();
  const {
    activeSession,
    currentQuestion,
    questionProgress,
    generationState,
    isGeneratingQuestions,
    isLoading,
    error,
    submitAnswer,
    nextQuestion,
    previousQuestion,
    endSession,
    sessionQuestions,
    submitTeilAnswers,
    activateTeil,
    setQuestionAnswer,
    activeView,
    setActiveView,
    completeQuestions,
    initializeSession,
    latestResults,
    clearResults,
  } = useLearningSession();

  // Local state
  const [userAnswer, setUserAnswer] = useState<AnswerValue>(null);
  const [questionResult, setQuestionResult] = useState<QuestionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showA4Format, setShowA4Format] = useState(true);
  const [pendingTeilUnlock, setPendingTeilUnlock] = useState(false);
  const effectiveAnswer: AnswerValue =
    (userAnswer ?? (currentQuestion?.answer as AnswerValue | null)) ?? null;

  useEffect(() => {
    if (!sessionId) return;
    if (activeSession && activeSession.id === sessionId) {
      return;
    }

    let cancelled = false;

    (async () => {
      const session = await initializeSession(sessionId);
      if (!cancelled && !session) {
        // initialization failed; stay on page so user can decide next steps
        console.warn('Session initialization failed for', sessionId);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, activeSession?.id, initializeSession]);

  const normaliseTeil = (value?: number | null) =>
    typeof value === 'number' && !Number.isNaN(value) ? value : 1;

  const teilSummaries = useMemo(
    () =>
      Array.from(
        sessionQuestions.reduce((acc, question) => {
          const teilNumber = normaliseTeil(question.teil);
          const entry = acc.get(teilNumber) ?? { questions: [] as typeof sessionQuestions, state: 'pending' as 'pending' | 'active' | 'completed' };

          entry.questions.push(question);
          if (question.teilState === 'active') {
            entry.state = 'active';
          } else if (question.teilState === 'completed' && entry.state !== 'active') {
            entry.state = 'completed';
          }

          acc.set(teilNumber, entry);
          return acc;
        }, new Map<number, { questions: typeof sessionQuestions; state: 'pending' | 'active' | 'completed' }>())
      )
        .sort(([a], [b]) => a - b)
        .map(([teilNumber, entry]) => ({
          teilNumber,
          questions: entry.questions,
          state: entry.state,
        })),
    [sessionQuestions]
  );

  const activeTeilEntry =
    teilSummaries.find(entry => entry.state === 'active') ?? teilSummaries[0];
  const activeTeilNumber = activeTeilEntry?.teilNumber ?? 1;
  const activeTeilQuestions = activeTeilEntry?.questions ?? [];
  const teilNumbers = teilSummaries.map(entry => entry.teilNumber);
  const teilCount = teilSummaries.length;
  const activeTeilIndex = teilNumbers.indexOf(activeTeilNumber);
  const nextTeilNumber =
    activeTeilIndex >= 0 && activeTeilIndex < teilNumbers.length - 1
      ? teilNumbers[activeTeilIndex + 1]
      : null;
  const previousTeilNumber = activeTeilIndex > 0 ? teilNumbers[activeTeilIndex - 1] : null;
  const isLastTeil = nextTeilNumber === null;
  const generatedTeils = useMemo(
    () =>
      new Set(
        sessionQuestions
          .filter(question => question.status === QuestionStatus.LOADED)
          .map(question => normaliseTeil(question.teil))
      ),
    [sessionQuestions]
  );
  const totalLoadedQuestions = sessionQuestions.length;
  const accumulatedAnswers = useMemo(
    () =>
      Object.fromEntries(
        sessionQuestions
          .filter(
            question =>
              question.id && question.answer !== undefined && question.answer !== null
          )
          .map(question => [question.id as string, String(question.answer)])
      ),
    [sessionQuestions]
  );

  useEffect(() => {
    if (!pendingTeilUnlock) {
      return;
    }

    if (nextTeilNumber) {
      activateTeil(nextTeilNumber);
      setPendingTeilUnlock(false);
      return;
    }

    const expectedTotal = generationState?.total ?? totalLoadedQuestions;
    if (!isGeneratingQuestions || totalLoadedQuestions >= expectedTotal) {
      setPendingTeilUnlock(false);
    }
  }, [
    pendingTeilUnlock,
    nextTeilNumber,
    activateTeil,
    generationState?.total,
    totalLoadedQuestions,
    isGeneratingQuestions,
  ]);

  // Reset state when question changes
  useEffect(() => {
    setUserAnswer((currentQuestion?.answer as AnswerValue) ?? null);
    setQuestionResult(null);
  }, [currentQuestion?.id]);

  // Teil detection is now handled by the session context

  const handleSubmitAnswer = async () => {
    if (!currentQuestion) return;

    const answerPayload =
      (userAnswer ?? (currentQuestion.answer as AnswerValue | null)) ?? null;

    if (answerPayload === null) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitAnswer(currentQuestion.id, answerPayload, 0, 0);
      setQuestionResult(result);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (!currentQuestion) return;
    nextQuestion();
  };

  const handleEndSession = () => {
    endSession('abandoned');
    router.push(`/${sessionType}`);
  };

  // Loading state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!activeSession || activeSession.id !== sessionId || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">Loading session...</div>
      </div>
    );
  }

  // Render question based on type
  if (latestResults) {
    return (
      <div className="p-6 h-full overflow-hidden">
        <div className="h-full overflow-y-auto">
          <SessionResultsView
            results={latestResults.results}
            summary={latestResults.summary}
            onClose={() => {
              clearResults();
              router.replace(`/${sessionType}`);
            }}
          />
        </div>
      </div>
    );
  }

  const renderQuestion = () => {
    if (isGeneratingQuestions && sessionQuestions.length === 0) {
      const generated = generationState?.generated ?? 0;
      const total = generationState?.total ?? 0;
      const progressLabel =
        total > 0
          ? `${generated} von ${total} Fragen sind bereit.`
          : 'Wir generieren deine erste Frage.';

      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="space-y-1">
            <p className="text-foreground font-medium">Fragen werden vorbereitet …</p>
            <p className="text-sm text-muted-foreground">{progressLabel}</p>
          </div>
        </div>
      );
    }

    if (
      sessionType === SessionTypeEnum.READING &&
      activeTeilQuestions.length > 0
    ) {
      return (
        <AllQuestionsView
          key={`teil-${activeTeilNumber}`}
          questions={activeTeilQuestions}
          showA4Format={showA4Format}
          isLastTeil={isLastTeil}
          accumulatedAnswers={accumulatedAnswers}
          onBack={
            previousTeilNumber
              ? () => {
                  if (isNavigating) return;
                  activateTeil(previousTeilNumber);
                }
              : undefined
          }
          showBackButton={!!previousTeilNumber}
          totalTeils={teilCount}
          generatedTeils={generatedTeils}
          allQuestions={sessionQuestions}
          onAnswerChange={(questionId, answer) => setQuestionAnswer(questionId, answer)}
          isSubmitting={isSubmitting || isNavigating}
          activeView={activeView}
          onActiveViewChange={setActiveView}
          onTeilNavigate={teil => {
            if (isNavigating) return;
            activateTeil(teil);
          }}
          onSubmit={async answers => {
            if (isNavigating || latestResults) return;
            setIsNavigating(true);
            try {
              await submitTeilAnswers(answers, activeTeilNumber);

              if (nextTeilNumber) {
                activateTeil(nextTeilNumber);
                setPendingTeilUnlock(false);
                setIsNavigating(false);
                return;
              }

              const expectedTotal = generationState?.total ?? totalLoadedQuestions;
              if (
                isGeneratingQuestions ||
                totalLoadedQuestions < expectedTotal
              ) {
                setPendingTeilUnlock(true);
                setIsNavigating(false);
                return;
              }

              const completion = await completeQuestions();
              if (completion) {
                await endSession('completed');
                setPendingTeilUnlock(false);
              }
            } finally {
              setIsNavigating(false);
            }
          }}
        />
      );
    }

    // Single question display for other cases
    if (!currentQuestion) {
      return (
        <div className="text-center p-8">
          <p className="text-muted-foreground">
            {isGeneratingQuestions
              ? 'Weitere Fragen werden geladen …'
              : 'No questions available'}
          </p>
        </div>
      );
    }

    const moduleId =
      (currentQuestion.moduleId ??
        currentQuestion.registryType ??
        QuestionModuleId.MULTIPLE_CHOICE) as QuestionModuleId;
    const InputComponent = resolveModuleComponent(moduleId);
    const effectiveValue = effectiveAnswer;

    if (InputComponent) {
      return (
        <InputComponent
          question={currentQuestion}
          value={effectiveValue}
          onChange={value => {
            setUserAnswer(value);
            setQuestionAnswer(currentQuestion.id, value);
          }}
          onNext={handleNextQuestion}
          onPrevious={previousQuestion}
          feedback={questionResult}
          position={{
            current: questionProgress.current,
            total: questionProgress.total,
          }}
        />
      );
    }

    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground mb-4">
          Kein Renderer für Fragemodul "{moduleId}" registriert.
        </p>
      </div>
    );
  };

  return (
    <div className="relative h-full overflow-hidden">

      {pendingTeilUnlock && (
        <div className="absolute top-16 left-1/2 z-10 -translate-x-1/2 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary shadow-sm">
          Teil {activeTeilNumber + 1} wird vorbereitet …
        </div>
      )}

      {/* Triple dot menu */}
      <div className="absolute top-4 right-4 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem
              checked={showA4Format}
              onCheckedChange={setShowA4Format}
            >
              A4 Format
            </DropdownMenuCheckboxItem>
            <DropdownMenuItem onClick={handleEndSession}>
              End Session
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Question Component */}
      <div className="h-full overflow-hidden">
        <div className="h-full overflow-y-auto">
          {renderQuestion()}
        </div>
      </div>

      {/* Submit Button */}
      {currentQuestion && effectiveAnswer !== null && !questionResult && (
        <div className="flex justify-center p-4">
          <Button
            onClick={handleSubmitAnswer}
            disabled={isSubmitting}
            size="lg"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Answer'}
          </Button>
        </div>
      )}
    </div>
  );
}
