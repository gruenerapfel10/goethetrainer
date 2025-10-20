'use client';

import { useState, useEffect } from 'react';
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
import { MultipleChoiceView } from '@/components/questions/MultipleChoice/MultipleChoiceView';
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
    // Teil-based session - SIMPLIFIED
    sessionQuestions,
    currentTeil,
    navigateToTeil,
    submitTeilAnswers,
  } = useLearningSession();

  // Debug logs
  useEffect(() => {
    console.log(`\n🎪 SessionOrchestrator mounted or updated:`);
    console.log(`   sessionId from URL: ${sessionId}`);
    console.log(`   activeSession?.id: ${activeSession?.id}`);
    console.log(`   isLoading: ${isLoading}`);
    console.log(`   error: ${error}`);
    console.log(`   sessionQuestions.length: ${sessionQuestions.length}`);
    console.log(`   Check: !activeSession=${!activeSession}, id mismatch=${activeSession?.id !== sessionId}, isLoading=${isLoading}`);
  }, [sessionId, activeSession?.id, isLoading, error, sessionQuestions.length]);

  // Local state
  const [userAnswer, setUserAnswer] = useState<string | string[] | boolean | null>(null);
  const [questionResult, setQuestionResult] = useState<QuestionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeOnQuestion, setTimeOnQuestion] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showA4Format, setShowA4Format] = useState(true);

  // Reset state when question changes
  useEffect(() => {
    setUserAnswer(null);
    setQuestionResult(null);
    setTimeOnQuestion(0);
  }, [currentQuestion?.id]);

  // Teil detection is now handled by the session context

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || userAnswer === null) return;

    setIsSubmitting(true);
    try {
      const result = await submitAnswer(userAnswer, timeOnQuestion);
      setQuestionResult(result);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (!currentQuestion) return;

    nextQuestion();
    // Check if we've reached the last question
    if (questionProgress.current === questionProgress.total) {
      // Session completed, navigate back
      router.push(`/${sessionType}`);
    }
  };

  const handleEndSession = () => {
    endSession('abandoned');
    router.push(`/${sessionType}`);
  };

  // Loading state
  if (!activeSession || activeSession.id !== sessionId || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">Loading session...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-600">Error: {error}</div>
      </div>
    );
  }

  // Render question based on type
  const renderQuestion = () => {
    // Check if we have questions with Teil structure
    if (!isNavigating && sessionType === SessionTypeEnum.READING && sessionQuestions.length > 0) {
      // Check if questions have teil property (standard layout)
      const hasTeilStructure = sessionQuestions.some((q: any) => q.teil !== undefined);

      if (hasTeilStructure) {
        // Derive everything from sessionQuestions
        const teilsSet = new Set(sessionQuestions.map(q => (q as any).teil || 1));
        const totalTeils = teilsSet.size;
        const generatedTeils = new Set(
          sessionQuestions
            .filter(q => q.status === QuestionStatus.LOADED)
            .map(q => (q as any).teil || 1)
        );
        const currentTeilQuestions = sessionQuestions.filter(q => ((q as any).teil || 1) === currentTeil);
        const accumulatedAnswers = Object.fromEntries(
          sessionQuestions.filter(q => q.answer).map(q => [q.id, q.answer!])
        );

        // Show current Teil - UNIFIED for all Teils
        if (currentTeilQuestions.length > 0) {
          return (
            <AllQuestionsView
              key={`teil-${currentTeil}-view`}
              questions={currentTeilQuestions}
              showA4Format={showA4Format}
              sessionId={sessionId}
              showResultsImmediately={currentTeil === totalTeils}
              isLastTeil={currentTeil === totalTeils}
              accumulatedAnswers={accumulatedAnswers}
              showBackButton={currentTeil > 1}
              totalTeils={totalTeils}
              generatedTeils={generatedTeils}
              onTeilNavigate={navigateToTeil}
              onBack={() => navigateToTeil(currentTeil - 1)}
              onSubmit={(answers) => {
                if (isNavigating) return;
                submitTeilAnswers(answers);

                if (currentTeil < totalTeils) {
                  navigateToTeil(currentTeil + 1);
                } else {
                  setIsNavigating(true);
                  endSession('completed');
                  setTimeout(() => router.push(`/${sessionType}`), 100);
                }
              }}
            />
          );
        }
      } else {
        // Legacy behavior: show all questions if GAP_TEXT_MULTIPLE_CHOICE
        if (sessionQuestions.length > 0 && sessionQuestions[0].registryType === QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE) {
          return (
            <AllQuestionsView
              key="all-questions-view"
              questions={sessionQuestions}
              showA4Format={showA4Format}
              sessionId={sessionId}
              onSubmit={(answers) => {
                if (isNavigating) return;
                submitTeilAnswers(answers);
                setIsNavigating(true);
                endSession('completed');
                setTimeout(() => router.push(`/${sessionType}`), 100);
              }}
            />
          );
        }
      }
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