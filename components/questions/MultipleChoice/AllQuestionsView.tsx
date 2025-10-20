'use client';

import { useState, useRef, useEffect } from 'react';
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
}

interface AllQuestionsViewProps {
  questions: Question[];
  onSubmit: (answers: Record<string, string>) => void;
  showA4Format?: boolean;
  sessionId?: string; // Optional: if provided, will use marking API
  showResultsImmediately?: boolean; // If false, just call onSubmit without showing results
  isLastTeil?: boolean; // If true, shows "Test abgeben" button, otherwise shows "Weiter"
  accumulatedAnswers?: Record<string, string>; // Answers from previous Teils
  onBack?: () => void; // Optional callback to go back to previous Teil
  showBackButton?: boolean; // If true, shows "Zurück" button
  totalTeils?: number; // Total number of Teils in this session
  generatedTeils?: Set<number>; // Which Teils have been generated
  onTeilNavigate?: (teilNumber: number) => void; // Navigate to a specific Teil
}

export function AllQuestionsView({
  questions,
  onSubmit,
  showA4Format = true,
  sessionId,
  showResultsImmediately = true,
  isLastTeil = true,
  accumulatedAnswers = {},
  onBack,
  showBackButton = false,
  totalTeils = 1,
  generatedTeils = new Set([1]),
  onTeilNavigate
}: AllQuestionsViewProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [results, setResults] = useState<{
    results: QuestionResult[];
    summary: {
      totalQuestions: number;
      correctAnswers: number;
      incorrectAnswers: number;
      totalScore: number;
      maxScore: number;
      percentage: number;
    };
  } | null>(null);
  const [activeView, setActiveView] = useState<'fragen' | 'quelle'>('quelle');
  const isMountedRef = useRef(true);

  // Track if component is mounted
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        setActiveView(activeView === 'fragen' ? 'quelle' : 'fragen');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView]);

  useEffect(() => {
    const exampleQuestion = questions.find(q => q.isExample);
    if (exampleQuestion && exampleQuestion.exampleAnswer) {
      setSelectedAnswers(prev => ({
        ...prev,
        [exampleQuestion.id]: exampleQuestion.exampleAnswer!
      }));
    }
  }, [questions]);

  const handleSelectOption = (questionId: string, optionId: string, isExample: boolean) => {
    if (!isSubmitted && !isExample) {
      setSelectedAnswers(prev => ({
        ...prev,
        [questionId]: optionId
      }));
    }
  };

  const handleSubmit = async () => {
    setIsSubmitted(true);

    if (!showResultsImmediately) {
      onSubmit(selectedAnswers);
      return;
    }

    if (sessionId) {
      setIsMarking(true);
      try {
        const allAnswers = {
          ...accumulatedAnswers,
          ...selectedAnswers,
        };

        const response = await fetch(`/api/sessions/${sessionId}/mark`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: allAnswers }),
        });

        if (!response.ok) {
          throw new Error('Failed to mark questions');
        }

        const data = await response.json();
        setResults(data);
      } catch (error) {
        onSubmit(selectedAnswers);
      } finally {
        setIsMarking(false);
      }
    } else {
      setTimeout(() => {
        if (isMountedRef.current) {
          onSubmit(selectedAnswers);
        }
      }, 0);
    }
  };

  const allQuestionsAnswered = questions
    .filter(q => !q.isExample)
    .every(q => selectedAnswers[q.id]);

  // Derive Teil information from actual questions
  const teilNumber = (questions[0] as any)?.teil || 1;
  const teils = new Set(questions.map(q => (q as any).teil || 1));
  const derivedTotalTeils = teils.size;
  const actualTotalTeils = totalTeils || derivedTotalTeils;

  // Check if this is MULTIPLE_CHOICE (Teil 2) or GAP_TEXT (Teil 1)
  const isMultipleChoice = (questions[0] as any)?.registryType === 'multiple_choice' || false;


  // Show results view if results are available
  if (results) {
    return (
      <SessionResultsView
        results={results.results}
        summary={results.summary}
        onClose={() => setResults(null)}
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-background relative">
      {/* Quelle/Fragen Toggle - Absolute positioned */}
      <div className="absolute top-6 left-6 flex gap-0 z-10 border-b border-border">
        <button
          onClick={() => setActiveView('fragen')}
          className={cn(
            "px-4 py-2 font-medium transition-colors",
            activeView === 'fragen'
              ? "text-foreground border-b-2 border-primary -mb-px"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Fragen
        </button>
        <button
          onClick={() => setActiveView('quelle')}
          className={cn(
            "px-4 py-2 font-medium transition-colors",
            activeView === 'quelle'
              ? "text-foreground border-b-2 border-primary -mb-px"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Quelle
        </button>
      </div>

      {/* Teil Navigation */}
      <QuestionTimeline
        questions={questions}
        totalTeils={actualTotalTeils}
        currentTeilNumber={teilNumber}
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
            {activeView === 'fragen' ? (
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
                  disabled={isSubmitted || isMarking}
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
                isMarking ||
                // Disable if next Teil hasn't been generated yet
                (!isLastTeil && !generatedTeils.has(teilNumber + 1))
              }
              className="px-8 py-2 bg-primary-foreground text-foreground rounded hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed font-medium transition-opacity"
            >
              {isMarking ? 'Wird bewertet...' : isSubmitted ? (isLastTeil ? 'Test abgeschlossen' : 'Weiter...') : (isLastTeil ? 'Test abgeben' : 'Weiter')}
            </button>
          </div>

          {/* Results summary when submitted */}
          {isSubmitted && (
            <div className="bg-primary text-primary-foreground p-6">
              <p className="font-medium text-center text-sm">
                Test abgeschlossen! Ergebnis: {questions.filter(q => !q.isExample && selectedAnswers[q.id] === q.correctOptionId).length} von {questions.filter(q => !q.isExample).length} richtig
              </p>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
