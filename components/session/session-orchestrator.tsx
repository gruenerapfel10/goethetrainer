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
import { MoreHorizontal } from 'lucide-react';
import type { QuestionResult } from '@/lib/sessions/questions/question-types';

// Import question components
import { MultipleChoice } from '@/components/questions/MultipleChoice/MultipleChoice';
import { AllQuestionsView } from '@/components/questions/MultipleChoice/AllQuestionsView';
import { SessionResultsView } from '@/components/questions/SessionResultsView';
import { TrueFalse } from '@/components/questions/TrueFalse/TrueFalse';
import { ShortAnswer } from '@/components/questions/ShortAnswer/ShortAnswer';
import { QuestionTypeName } from '@/lib/sessions/questions/question-registry';
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
  const [userAnswer, setUserAnswer] = useState<string | string[] | boolean | null>(null);
  const [questionResult, setQuestionResult] = useState<QuestionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showA4Format, setShowA4Format] = useState(true);

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

  // Reset state when question changes
  useEffect(() => {
    setUserAnswer(null);
    setQuestionResult(null);
  }, [currentQuestion?.id]);

  // Teil detection is now handled by the session context

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || userAnswer === null) return;

    setIsSubmitting(true);
    try {
      const result = await submitAnswer(currentQuestion.id, userAnswer, 0, 0);
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
      <div className="p-6 h-full overflow-y-auto">
        <SessionResultsView
          results={latestResults.results}
          summary={latestResults.summary}
          onClose={() => {
            clearResults();
            router.replace(`/${sessionType}`);
          }}
        />
      </div>
    );
  }

  const renderQuestion = () => {
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
                setIsNavigating(false);
                return;
              }

              const completion = await completeQuestions();
              if (completion) {
                await endSession('completed');
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
          <p className="text-muted-foreground">No questions available</p>
        </div>
      );
    }

    const questionProps = {
      question: currentQuestion,
      onAnswer: setUserAnswer,
      onNext: handleNextQuestion,
      onPrevious: previousQuestion,
      isSubmitted: !!questionResult,
      isCorrect: questionResult?.isCorrect,
      feedback: questionResult?.feedback,
      questionNumber: questionProgress.current,
      totalQuestions: questionProgress.total,
    };

    const registryType = currentQuestion.registryType as QuestionTypeName;

    // DEBUG: Log the registryType value
    if (process.env.NODE_ENV !== 'production') {
      console.log('Rendering question with registryType:', registryType, 'Expected:', QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE);
    }

    switch (registryType) {
      // Unified MultipleChoice component handles all multiple choice variants
      case QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE:
        return <MultipleChoice {...questionProps} />;

      case QuestionTypeName.MULTIPLE_CHOICE:
        return <MultipleChoice {...questionProps} />;

      case QuestionTypeName.TRUE_FALSE:
        return <TrueFalse {...questionProps} />;

      case QuestionTypeName.SHORT_ANSWER:
        return <ShortAnswer {...questionProps} />;

      default:
        return (
          <div className="text-center p-8">
            <p className="text-muted-foreground mb-4">
              Question type "{registryType}" is not yet implemented.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="relative h-full">
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
      <div className="h-full">
        {renderQuestion()}
      </div>

      {/* Submit Button */}
      {currentQuestion && userAnswer !== null && !questionResult && (
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
