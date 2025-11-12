'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLearningSession, QuestionStatus } from '@/lib/sessions/learning-session-context';
import { useSessionPage } from '@/lib/sessions/session-page-context';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { QuestionResult } from '@/lib/sessions/questions/question-types';
import type { AnswerValue } from '@/lib/sessions/types';
import { resolveModuleComponent } from '@/components/question-modules/module-registry';
import { QuestionModuleId } from '@/lib/questions/modules/types';
import { getQuestionUnitCount } from '@/lib/sessions/questions/question-units';

// Import question components
import { AllQuestionsView } from '@/components/questions/MultipleChoice/AllQuestionsView';
import { SessionResultsView } from '@/components/questions/SessionResultsView';
import { StatementMatchView } from '@/components/questions/StatementMatch/StatementMatchView';
import { WritingPromptView } from '@/components/questions/Writing/WritingPromptView';
import {
  type SessionTypeEnum,
  type NormalisedSessionLayoutEntry,
  getSessionLayout,
} from '@/lib/sessions/session-registry';
import { SessionBoard } from '@/components/questions/SessionBoard';
import '@/lib/sessions/configs';

function getPlannedUnitsForEntry(entry: NormalisedSessionLayoutEntry): number {
  const baseCount = entry.questionCount ?? 0;
  const exampleCount = entry.generateExample ? 1 : 0;
  const moduleId = entry.moduleId as QuestionModuleId;

  if (moduleId === QuestionModuleId.STATEMENT_MATCH) {
    const source = (entry.sourceOverrides ?? {}) as {
      statementCount?: number;
      gapCount?: number;
    };
    if (typeof source?.statementCount === 'number' && source.statementCount > 0) {
      return source.statementCount;
    }
    if (typeof source?.gapCount === 'number' && source.gapCount > 0) {
      return source.gapCount;
    }
    if (typeof entry.metadata?.points === 'number' && entry.metadata.points > 0) {
      return Math.round(entry.metadata.points);
    }
  }

  return baseCount + exampleCount;
}

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

  const hasLatestResultsForSession = latestResults?.sessionType === sessionType;

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

  const sessionLayout = useMemo(() => {
    try {
      return getSessionLayout(sessionType as SessionTypeEnum);
    } catch (layoutError) {
      console.error('Failed to resolve session layout for session type', sessionType, layoutError);
      return [];
    }
  }, [sessionType]);

  const readyQuestionUnits = useMemo(() => {
    return sessionQuestions.reduce((sum, question) => sum + getQuestionUnitCount(question), 0);
  }, [sessionQuestions]);

  const plannedQuestionTotal = useMemo(() => {
    return sessionLayout.reduce((sum, entry) => sum + getPlannedUnitsForEntry(entry), 0);
  }, [sessionLayout]);

  const expectedTeilCount = sessionLayout.length > 0 ? sessionLayout.length : 1;
  const teilLabels = useMemo(() => {
    return sessionLayout.reduce<Record<number, string>>((acc, entry, index) => {
      acc[index + 1] = entry.label ?? `Teil ${index + 1}`;
      return acc;
    }, {});
  }, [sessionLayout]);

  const normaliseTeil = (value?: number | null) =>
    typeof value === 'number' && !Number.isNaN(value) ? value : 1;

  const teilSummaries = useMemo(() => {
    const summaryMap = sessionQuestions.reduce(
      (acc, question) => {
        const teilNumber = normaliseTeil(question.teil);
        const entry =
          acc.get(teilNumber) ??
          ({
            questions: [] as typeof sessionQuestions,
            state: 'pending' as 'pending' | 'active' | 'completed',
          });

        entry.questions.push(question);
        if (question.teilState === 'active') {
          entry.state = 'active';
        } else if (question.teilState === 'completed' && entry.state !== 'active') {
          entry.state = 'completed';
        }

        acc.set(teilNumber, entry);
        return acc;
      },
      new Map<number, { questions: typeof sessionQuestions; state: 'pending' | 'active' | 'completed' }>()
    );

    if (sessionLayout.length > 0) {
      sessionLayout.forEach((_, index) => {
        const teilNumber = index + 1;
        if (!summaryMap.has(teilNumber)) {
          summaryMap.set(teilNumber, {
            questions: [] as typeof sessionQuestions,
            state: 'pending',
          });
        }
      });
    }

    return Array.from(summaryMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([teilNumber, entry]) => ({
        teilNumber,
        questions: entry.questions,
        state: entry.state,
      }));
  }, [sessionQuestions, sessionLayout]);

  const activeTeilEntry =
    teilSummaries.find(entry => entry.state === 'active') ?? teilSummaries[0];
  const activeTeilNumber = activeTeilEntry?.teilNumber ?? 1;
  const activeTeilQuestions = activeTeilEntry?.questions ?? [];
  const teilNumbers = teilSummaries.map(entry => entry.teilNumber);
  const teilCount = Math.max(expectedTeilCount, teilSummaries.length);
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
  const accumulatedAnswers = useMemo<Record<string, string | string[] | boolean>>(
    () =>
      Object.fromEntries(
        sessionQuestions
          .filter(
            question =>
              question.id && question.answer !== undefined && question.answer !== null
          )
          .map(question => {
            const value = question.answer as AnswerValue;
            if (typeof value === 'string' || typeof value === 'boolean' || Array.isArray(value)) {
              return [question.id as string, value];
            }

            return [question.id as string, ''];
          })
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

  const handleTeilCompletion = useCallback(
    async () => {
      console.log('[SessionOrchestrator] handleTeilCompletion', {
        sessionId,
        teilNumber: activeTeilNumber,
        nextTeilNumber,
        isNavigating,
        hasResults: hasLatestResultsForSession,
      });
      if (isNavigating || hasLatestResultsForSession) {
        return;
      }

      setIsNavigating(true);
      try {
        const payload = Object.fromEntries(
          activeTeilQuestions.map(question => [
            question.id,
            (question.answer ?? null) as AnswerValue,
          ])
        );

        await submitTeilAnswers(payload, activeTeilNumber);

        if (nextTeilNumber) {
          activateTeil(nextTeilNumber);
          setPendingTeilUnlock(false);
          setIsNavigating(false);
          return;
        }

        const expectedTotal = generationState?.total ?? totalLoadedQuestions;
        if (isGeneratingQuestions || totalLoadedQuestions < expectedTotal) {
          setPendingTeilUnlock(true);
          setIsNavigating(false);
          return;
        }

        const completion = await completeQuestions();
        console.log('[SessionOrchestrator] completeQuestions response', {
          sessionId,
          hasCompletion: Boolean(completion),
        });
        if (completion) {
          await endSession('completed');
          console.log('[SessionOrchestrator] Session marked completed via teil submission', sessionId);
          setPendingTeilUnlock(false);
        }
      } finally {
        setIsNavigating(false);
      }
    },
    [
      activeTeilQuestions,
      activeTeilNumber,
      nextTeilNumber,
      isNavigating,
      hasLatestResultsForSession,
      submitTeilAnswers,
      activateTeil,
      setPendingTeilUnlock,
      generationState?.total,
      totalLoadedQuestions,
      isGeneratingQuestions,
      completeQuestions,
      endSession,
    ]
  );

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
      console.log('[SessionOrchestrator] submitAnswer start', {
        sessionId,
        questionId: currentQuestion.id,
      });
      const result = await submitAnswer(currentQuestion.id, answerPayload, 0, 0);
      console.log('[SessionOrchestrator] submitAnswer done', {
        sessionId,
        questionId: currentQuestion.id,
        score: result?.score,
      });
      setQuestionResult(result);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (!currentQuestion) return;
    nextQuestion();
  };

  const handleEndSession = async () => {
    console.log('[SessionOrchestrator] handleEndSession invoked', { sessionId });
    setIsNavigating(true);
    try {
      const completion = await completeQuestions();
      console.log('[SessionOrchestrator] handleEndSession completion result', {
        sessionId,
        hasCompletion: Boolean(completion),
      });
      if (completion) {
        await endSession('completed');
        console.log('[SessionOrchestrator] Session completed via handleEndSession', sessionId);
        router.replace(`/${sessionType}`);
        return;
      }
    } catch (error) {
      console.error('failed to complete before ending', error);
    } finally {
      setIsNavigating(false);
    }
    await endSession('abandoned');
    console.log('[SessionOrchestrator] Session marked abandoned via handleEndSession', sessionId);
    router.replace(`/${sessionType}`);
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
  if (hasLatestResultsForSession) {
    const issuedAtValue = activeSession?.endedAt ?? activeSession?.metadata?.completedAt ?? activeSession?.metadata?.lastUpdatedAt ?? activeSession?.startedAt ?? new Date();
    return (
      <div className="h-full overflow-hidden">
        <div className="h-full overflow-y-auto">
          <SessionResultsView
            results={latestResults.results}
            summary={latestResults.summary}
            sessionType={sessionType}
            issuedAt={issuedAtValue}
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
    if (isGeneratingQuestions) {
      const generated = readyQuestionUnits > 0 ? readyQuestionUnits : generationState?.generated ?? 0;
      const fallbackTotal = Math.max(generationState?.total ?? 0, generated);
      const total = plannedQuestionTotal > 0 ? plannedQuestionTotal : fallbackTotal;
      const progressLabel =
        total > 0
          ? `${generated} / ${total} Fragen sind bereit.`
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

    if (activeTeilQuestions.length > 0) {
      const teilModuleId =
        (activeTeilQuestions[0].moduleId ??
          activeTeilQuestions[0].registryType ??
          QuestionModuleId.MULTIPLE_CHOICE) as QuestionModuleId;

      if (teilModuleId === QuestionModuleId.STATEMENT_MATCH) {
        const primaryQuestion = activeTeilQuestions[0];
        const statementAnswer =
          (primaryQuestion.answer && typeof primaryQuestion.answer === 'object'
            ? (primaryQuestion.answer as Record<string, string>)
            : {}) ?? {};
        const statements = primaryQuestion.statements ?? [];
        const canSubmit = statements.every(statement => statementAnswer[statement.id]);

        return (
          <StatementMatchView
            question={primaryQuestion}
            value={primaryQuestion.answer as AnswerValue}
            onAnswer={record => setQuestionAnswer(primaryQuestion.id, record)}
            teilNumber={activeTeilNumber}
            teilLabel={teilLabels[activeTeilNumber] ?? `Teil ${activeTeilNumber}`}
            teilLabels={teilLabels}
            totalTeils={teilCount}
            generatedTeils={generatedTeils}
            onTeilNavigate={teil => {
              if (isNavigating) return;
              activateTeil(teil);
            }}
            onBack={
              previousTeilNumber
                ? () => {
                    if (isNavigating) return;
                    activateTeil(previousTeilNumber);
                  }
                : undefined
            }
            showBackButton={!!previousTeilNumber}
            isSubmitting={isSubmitting || isNavigating}
            isLastTeil={isLastTeil}
            canSubmit={canSubmit}
            onSubmit={() => handleTeilCompletion()}
            activeView={activeView}
            onActiveViewChange={setActiveView}
            showA4Format={showA4Format}
            onShowA4FormatChange={setShowA4Format}
            onEndSession={handleEndSession}
          />
        );
      }

      if (teilModuleId === QuestionModuleId.MULTIPLE_CHOICE) {
        return (
          <AllQuestionsView
            key={`teil-${activeTeilNumber}`}
            questions={activeTeilQuestions}
            showA4Format={showA4Format}
            onShowA4FormatChange={setShowA4Format}
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
            onEndSession={handleEndSession}
            onTeilNavigate={teil => {
              if (isNavigating) return;
              activateTeil(teil);
            }}
            onSubmit={() => handleTeilCompletion()}
          />
        );
      }

      if (teilModuleId === QuestionModuleId.WRITTEN_RESPONSE) {
        const primaryQuestion = activeTeilQuestions[0];
        const rawAnswer = primaryQuestion.answer;
        const answered = Boolean(
          typeof rawAnswer === 'string'
            ? rawAnswer.trim().length > 0
            : rawAnswer && typeof rawAnswer === 'object'
              ? Object.values(rawAnswer as Record<string, string>)
                  .some(value => typeof value === 'string' && value.trim().length > 0)
              : false
        );

        return (
          <WritingPromptView
            question={primaryQuestion}
            onAnswer={text => setQuestionAnswer(primaryQuestion.id, text)}
            teilNumber={activeTeilNumber}
            teilLabel={teilLabels[activeTeilNumber] ?? `Teil ${activeTeilNumber}`}
            teilLabels={teilLabels}
            totalTeils={teilCount}
            generatedTeils={generatedTeils}
            onTeilNavigate={teil => {
              if (isNavigating) return;
              activateTeil(teil);
            }}
            showBackButton={!!previousTeilNumber}
            onBack={
              previousTeilNumber
                ? () => {
                    if (isNavigating) return;
                    activateTeil(previousTeilNumber);
                  }
                : undefined
            }
            isSubmitting={isSubmitting || isNavigating}
            isLastTeil={isLastTeil}
            canSubmit={answered}
            onSubmit={() => handleTeilCompletion()}
            activeView={activeView}
            onActiveViewChange={setActiveView}
            showA4Format={showA4Format}
            onShowA4FormatChange={setShowA4Format}
            onEndSession={handleEndSession}
          />
        );
      }

      const InputComponent = resolveModuleComponent(teilModuleId);
      const teilLabel = teilLabels[activeTeilNumber] ?? `Teil ${activeTeilNumber}`;
      const canSubmit = activeTeilQuestions.every(question => question.answered);

      if (InputComponent) {
        const primaryQuestion = activeTeilQuestions[0];
        const quelleContent = primaryQuestion.context ? (
          <div className="space-y-4 text-sm leading-relaxed whitespace-pre-wrap">
            {primaryQuestion.context}
          </div>
        ) : undefined;

        return (
          <SessionBoard
            teilNumber={activeTeilNumber}
            teilLabel={teilLabel}
            teilLabels={teilLabels}
            totalTeils={teilCount}
            generatedTeils={generatedTeils}
            onTeilNavigate={teil => {
              if (isNavigating) return;
              activateTeil(teil);
            }}
            onBack={
              previousTeilNumber
                ? () => {
                    if (isNavigating) return;
                    activateTeil(previousTeilNumber);
                  }
                : undefined
            }
            showBackButton={!!previousTeilNumber}
            isSubmitting={isSubmitting || isNavigating}
            isLastTeil={isLastTeil}
            canSubmit={canSubmit}
            onSubmit={() => handleTeilCompletion()}
            activeView={activeView}
            onActiveViewChange={setActiveView}
            frageContent={
              <InputComponent
                question={primaryQuestion}
                value={(primaryQuestion.answer ?? null) as AnswerValue}
                onChange={value => setQuestionAnswer(primaryQuestion.id, value)}
                feedback={primaryQuestion.result ?? null}
                position={{ current: 1, total: 1 }}
              />
            }
            quelleContent={quelleContent}
            showSourceToggle={Boolean(quelleContent)}
            showA4Format={showA4Format}
            onShowA4FormatChange={setShowA4Format}
            onEndSession={handleEndSession}
            sourceReference={primaryQuestion.sourceReference}
          />
        );
      }
    }

    // Single question display for other cases
    if (!currentQuestion) {
      const waitingForInitialQuestions =
        !sessionQuestions.length &&
        (isGeneratingQuestions || generationState?.status !== 'failed');

      return (
        <div className="flex flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
          {waitingForInitialQuestions ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <p>Fragen werden gerade generiert …</p>
            </>
          ) : (
            <p>Der Test konnte keine Fragen laden.</p>
          )}
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
