'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLearningSession } from '@/lib/sessions/learning-session-context';
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
  } = useLearningSession();

  // Local state
  const [userAnswer, setUserAnswer] = useState<string | string[] | boolean | null>(null);
  const [questionResult, setQuestionResult] = useState<QuestionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeOnQuestion, setTimeOnQuestion] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showA4Format, setShowA4Format] = useState(true);
  const [currentTeil, setCurrentTeil] = useState(1);

  // Reset state when question changes
  useEffect(() => {
    setUserAnswer(null);
    setQuestionResult(null);
    setTimeOnQuestion(0);
  }, [currentQuestion?.id]);

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
    if (!isNavigating && sessionType === SessionTypeEnum.READING && activeSession?.data?.allQuestions) {
      const allQuestions = activeSession.data.allQuestions;

      // Check if questions have teil property (standard layout)
      const hasTeilStructure = allQuestions.some((q: any) => q.teil !== undefined);

      if (hasTeilStructure) {
        // Filter questions by Teil
        const teil1Questions = allQuestions.filter((q: any) => q.teil === 1);
        const teil2Questions = allQuestions.filter((q: any) => q.teil === 2);

        // Show Teil 1 (GAP_TEXT_MULTIPLE_CHOICE)
        if (currentTeil === 1 && teil1Questions.length > 0) {
          const hasMoreTeils = teil2Questions.length > 0;
          return (
            <AllQuestionsView
              key="teil-1-view"
              questions={teil1Questions}
              showA4Format={showA4Format}
              sessionId={sessionId}
              showResultsImmediately={false} // Don't show results yet, move to Teil 2
              isLastTeil={!hasMoreTeils} // False if there are more Teils
              onSubmit={(answers) => {
                if (isNavigating) return;
                console.log('Teil 1 answers submitted:', answers);

                // Move to Teil 2 if available
                if (hasMoreTeils) {
                  setCurrentTeil(2);
                } else {
                  // End session if no Teil 2
                  setIsNavigating(true);
                  endSession('completed');
                  setTimeout(() => {
                    router.push(`/${sessionType}`);
                  }, 100);
                }
              }}
            />
          );
        }

        // Show Teil 2 (MULTIPLE_CHOICE)
        if (currentTeil === 2 && teil2Questions.length > 0) {
          const teil2Question = teil2Questions[0]; // Only one question in Teil 2
          return (
            <MultipleChoiceView
              key="teil-2-view"
              question={teil2Question}
              showA4Format={showA4Format}
              sessionId={sessionId}
              onSubmit={(answer) => {
                if (isNavigating) return;
                console.log('Teil 2 answer submitted:', answer);
                setIsNavigating(true);

                // End the session
                endSession('completed');
                setTimeout(() => {
                  router.push(`/${sessionType}`);
                }, 100);
              }}
            />
          );
        }
      } else {
        // Legacy behavior: show all questions if GAP_TEXT_MULTIPLE_CHOICE
        if (allQuestions.length > 0 && allQuestions[0].registryType === QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE) {
          return (
            <AllQuestionsView
              key="all-questions-view"
              questions={allQuestions}
              showA4Format={showA4Format}
              sessionId={sessionId}
              onSubmit={(answers) => {
                if (isNavigating) return;
                console.log('All answers submitted:', answers);
                setIsNavigating(true);
                endSession('completed');
                setTimeout(() => {
                  router.push(`/${sessionType}`);
                }, 100);
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