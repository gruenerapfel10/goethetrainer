'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MCQCheckbox } from './MCQCheckbox';
import { GoetheHeader } from './GoetheHeader';
import { QuestionTimeline } from './QuestionTimeline';
import { SessionResultsView } from '../SessionResultsView';
import { QuestionResult } from '@/lib/sessions/questions/question-types';
import { QuestionStatus } from '@/lib/sessions/learning-session-context';

interface Question {
  id: string;
  prompt?: string;
  context?: string;
  title?: string;
  subtitle?: string;
  theme?: string;
  options?: Array<{ id: string; text: string }>;
  correctAnswer?: string;
  correctOptionId?: string;
  isExample?: boolean;
  exampleAnswer?: string;
  points?: number;
  status?: QuestionStatus;
  teil?: number;
  answer?: string | string[] | boolean;
}

interface QuestionResultsPayload {
  results: QuestionResult[];
  summary: {
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    totalScore: number;
    maxScore: number;
    percentage: number;
  };
}

interface AllQuestionsViewProps {
  questions: Question[];
  onSubmit: (answers: Record<string, string>) => Promise<void> | void;
  showA4Format?: boolean;
  isLastTeil?: boolean;
  accumulatedAnswers?: Record<string, string | string[] | boolean>;
  onBack?: () => void;
  showBackButton?: boolean;
  totalTeils?: number;
  generatedTeils?: Set<number>;
  onTeilNavigate?: (teilNumber: number) => void;
  allQuestions?: Question[];
  onAnswerChange?: (questionId: string, answer: string) => void;
  isSubmitting?: boolean;
  resultsSummary?: QuestionResultsPayload | null;
  onResultsClose?: () => void;
  activeView?: 'fragen' | 'quelle';
  onActiveViewChange?: (view: 'fragen' | 'quelle') => void;
}

export function AllQuestionsView({
  questions,
  onSubmit,
  showA4Format = true,
  isLastTeil = true,
  accumulatedAnswers = {},
  onBack,
  showBackButton = false,
  totalTeils = 1,
  generatedTeils = new Set([1]),
  onTeilNavigate,
  allQuestions,
  onAnswerChange,
  isSubmitting = false,
  resultsSummary = null,
  onResultsClose,
  activeView = 'fragen',
  onActiveViewChange,
}: AllQuestionsViewProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [view, setView] = useState<'fragen' | 'quelle'>(activeView);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        setView(prev => (prev === 'fragen' ? 'quelle' : 'fragen'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (activeView !== view) {
      setView(activeView);
    }
  }, [activeView]);

  useEffect(() => {
    onActiveViewChange?.(view);
  }, [view, onActiveViewChange]);

  useEffect(() => {
    setIsSubmitted(false);
    const next: Record<string, string> = {};
    questions.forEach(question => {
      const existing = accumulatedAnswers?.[question.id];
      if (typeof existing === 'string') {
        next[question.id] = existing;
      } else if (typeof question.answer === 'string') {
        next[question.id] = question.answer as string;
      } else if (question.isExample && question.exampleAnswer) {
        next[question.id] = question.exampleAnswer;
      }
    });
    setSelectedAnswers(next);
  }, [questions, accumulatedAnswers]);

  const handleSelectOption = (questionId: string, optionId: string, isExample: boolean) => {
    if (!isSubmitted && !isExample) {
      setSelectedAnswers(prev => ({
        ...prev,
        [questionId]: optionId
      }));
      onAnswerChange?.(questionId, optionId);
    }
  };

  const handleSubmit = async () => {
    try {
      await onSubmit(selectedAnswers);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Failed to submit answers:', error);
    }
  };

  const allQuestionsAnswered = questions
    .filter(q => !q.isExample)
    .every(q => selectedAnswers[q.id]);

  // Derive Teil information from actual questions
  const timelineQuestions = allQuestions && allQuestions.length > 0 ? allQuestions : questions;
  const teilNumber = (questions[0] as any)?.teil || 1;
  const teils = new Set(timelineQuestions.map(q => (q as any).teil || 1));
  const derivedTotalTeils = teils.size;
  const actualTotalTeils = totalTeils || derivedTotalTeils;

  // Check if this is MULTIPLE_CHOICE (Teil 2) or GAP_TEXT (Teil 1)
  const isMultipleChoice = (questions[0] as any)?.registryType === 'multiple_choice' || false;

  // Show results view if results are available
  if (resultsSummary) {
    return (
      <SessionResultsView
        results={resultsSummary.results}
        summary={resultsSummary.summary}
        onClose={onResultsClose}
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-background relative">
      {/* Quelle/Fragen Toggle - Absolute positioned */}
      <div className="absolute top-6 left-6 flex gap-0 z-10 border-b border-border">
        <button
          onClick={() => setView('fragen')}
          className={cn(
            "px-4 py-2 font-medium transition-colors",
            view === 'fragen'
              ? "text-foreground border-b-2 border-primary -mb-px"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Fragen
        </button>
        <button
          onClick={() => setView('quelle')}
          className={cn(
            "px-4 py-2 font-medium transition-colors",
            view === 'quelle'
              ? "text-foreground border-b-2 border-primary -mb-px"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Quelle
        </button>
      </div>

      {/* Teil Navigation */}
      <QuestionTimeline
        questions={timelineQuestions}
        totalTeils={actualTotalTeils}
        currentTeilNumber={teilNumber}
        generatedTeils={generatedTeils}
        onTeilNavigate={onTeilNavigate}
      />

      <div
        className="flex-1 flex items-center justify-center bg-gray-200 dark:bg-sidebar"
      >
        <div
          className="w-full h-full flex flex-col dark:bg-background"
          style={showA4Format ? { width: '210mm', height: '297mm', backgroundColor: 'hsl(var(--sidebar-background))' } : { width: '100%', height: '100%' }}
        >
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-12 py-6 overflow-x-visible pt-8 flex flex-col">
          <div className="w-full overflow-visible flex-1">
            {/* Show based on active view */}
            {view === 'fragen' ? (
              <>
                {/* Goethe Exam Header */}
                <GoetheHeader />

                {/* Header */}
                <div className="mb-10">
                  <h2 className="text-base font-bold">Teil {teilNumber}</h2>
                </div>
                {questions.map((question, qIndex) => (
                  <div key={`q-${qIndex}-${question.id}`} className="overflow-visible mb-12">
                    {/* Question row with number and options */}
                    <div className="flex gap-3 items-start overflow-visible">
                      {/* Question number */}
                      <div className="font-bold text-sm min-w-[30px] flex-shrink-0">
                        {qIndex}
                      </div>

                      {/* Options - horizontal for GAP_TEXT, vertical for MULTIPLE_CHOICE */}
                      <div className={cn(
                        "flex flex-1",
                        isMultipleChoice ? "flex-col gap-3" : "gap-6 flex-nowrap"
                      )}>
                        {question.options?.map((option, index) => {
                          const optionLetter = String.fromCharCode(97 + index);
                          const isExample = question.isExample === true;
                          const isSelected = selectedAnswers[question.id] === option.id ||
                                             (isExample && question.exampleAnswer === option.id);
                          const isCorrect = question.correctOptionId === option.id;
                          const showIncorrect = isSubmitted && isSelected && !isCorrect;
                          const isFirstOption = index === 0;

                          return (
                            <div key={option.id} className={cn(
                              "relative",
                              isMultipleChoice ? "w-full" : "flex-1 min-w-0"
                            )}>
                              {/* Example label above first option */}
                              {isFirstOption && isExample && (
                                <div className="font-bold text-base absolute -top-8 left-0">Beispiel:</div>
                              )}
                              <div
                                className={cn(
                                  "flex items-center gap-2 transition-colors p-2 -m-2",
                                  !isSubmitted && !isExample && "cursor-pointer",
                                  isSubmitted && !isSelected && !showIncorrect && "text-muted-foreground"
                                )}
                                onClick={() => !isSubmitted && !isExample && handleSelectOption(question.id, option.id, isExample)}
                              >
                                <MCQCheckbox
                                  letter={optionLetter}
                                  checked={isSelected}
                                  onChange={() => handleSelectOption(question.id, option.id, isExample)}
                                  disabled={isSubmitted || isExample}
                                  isExample={isExample}
                                  isCorrect={isCorrect}
                                  showFeedback={isSubmitted}
                                />
                                <span className="text-sm break-words hyphens-auto" lang="de">
                                  {option.text}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              // Quelle (Source) View
              <div className="space-y-6">
                {questions[0]?.context ? (
                  <>
                    {/* Goethe Exam Header */}
                    <GoetheHeader />

                    {/* Header with title and time */}
                    <div className="flex items-start mb-8">
                      <h3 className="font-bold text-base">Teil {teilNumber}</h3>
                      <span className="text-muted-foreground ml-20 font-normal text-base">Vorgeschlagene Arbeitszeit: 10 Minuten</span>
                    </div>

                    {/* Instructions */}
                    <p className="text-foreground mb-6 leading-relaxed font-normal text-sm" style={{ maxWidth: '40%' }}>
                      Sie lesen in einer Zeitung einen Artikel über ein Unternehmen in der Tourismusbranche. Wählen Sie für jede Lücke die richtige Lösung.
                    </p>

                    {/* Content Box */}
                    <div className="border border-foreground/40 p-8">
                      {/* Theme - top left */}
                      {questions[0]?.theme && (
                        <p className="text-xs font-bold text-muted-foreground mb-4 uppercase tracking-wide">
                          {questions[0].theme}
                        </p>
                      )}

                      {/* Title */}
                      {questions[0]?.title && (
                        <h4 className="text-base font-bold mb-1 text-foreground text-center px-8">
                          {questions[0].title}
                        </h4>
                      )}

                      {/* Subtitle */}
                      {questions[0]?.subtitle && (
                        <p className="text-base font-bold mb-6 text-foreground text-center px-8">
                          {questions[0].subtitle}
                        </p>
                      )}

                      {/* Main text with gaps */}
                      <p className="leading-7 text-foreground text-sm" style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                        {questions[0].context?.split(/(\[GAP_\d+\])/).map((part, idx) => {
                          const match = part.match(/\[GAP_(\d+)\]/);
                          if (match) {
                            const gapNumber = match[1];
                            const isExample = gapNumber === '0';
                            return (
                              <span key={idx} className="inline-block border border-foreground px-2 py-0 mx-1 text-foreground align-middle" style={{ lineHeight: '1.2' }}>
                                {isExample ? (
                                  <span className="font-bold">Beispiel 0</span>
                                ) : (
                                  <>
                                    <span className="font-bold">{gapNumber}</span> ...
                                  </>
                                )}
                              </span>
                            );
                          }
                          return part;
                        })}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground py-12">
                    Keine Quelle verfügbar
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer - Part of content */}
          <div className="text-primary-foreground p-6 flex justify-between items-center mt-auto">
            {/* Left side: Back button or Logo */}
            <div className="flex-shrink-0">
              {showBackButton && onBack ? (
                <button
                  onClick={onBack}
                  disabled={isSubmitted || isSubmitting}
                  className="px-6 py-2 bg-muted text-foreground rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-opacity"
                >
                  ← Zurück
                </button>
              ) : (
                <img
                  src="/goethe-logo.png"
                  alt="Goethe-Institut"
                  className="h-12 w-auto dark:invert"
                />
              )}
            </div>

            {/* Submit/Next Button */}
            <button
              onClick={handleSubmit}
              disabled={
                isSubmitted ||
                !allQuestionsAnswered ||
                isSubmitting ||
                (!isLastTeil && !generatedTeils.has(teilNumber + 1))
              }
              className="px-8 py-2 bg-primary-foreground text-foreground rounded hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed font-medium transition-opacity"
            >
              {isSubmitting ? 'Wird gespeichert...' : isSubmitted ? (isLastTeil ? 'Test abgeschlossen' : 'Weiter...') : (isLastTeil ? 'Test abgeben' : 'Weiter')}
            </button>
          </div>

        </div>
        </div>
      </div>
    </div>
  );
}
