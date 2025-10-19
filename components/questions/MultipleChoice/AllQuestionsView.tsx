'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MCQCheckbox } from './MCQCheckbox';
import { GoetheHeader } from './GoetheHeader';

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
}

interface AllQuestionsViewProps {
  questions: Question[];
  onSubmit: (answers: Record<string, string>) => void;
  showA4Format?: boolean;
}

export function AllQuestionsView({ questions, onSubmit, showA4Format = true }: AllQuestionsViewProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activeView, setActiveView] = useState<'fragen' | 'quelle'>('fragen');
  const isMountedRef = useRef(true);

  useEffect(() => {
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

  const handleSubmit = () => {
    if (!isMountedRef.current) return;
    setIsSubmitted(true);
    setTimeout(() => {
      if (isMountedRef.current) {
        onSubmit(selectedAnswers);
      }
    }, 0);
  };

  const allQuestionsAnswered = questions
    .filter(q => !q.isExample)
    .every(q => selectedAnswers[q.id]);

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

      <div
        className="flex-1 flex items-center justify-center"
        style={showA4Format ? { backgroundColor: '#e5e5e5' } : {}}
      >
        <div
          className="bg-white w-full h-full flex flex-col"
          style={showA4Format ? { width: '210mm', height: '297mm' } : { width: '100%', height: '100%' }}
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
                  <h2 className="text-base font-bold">Teil 1</h2>
                </div>
                {questions.map((question, qIndex) => (
                  <div key={`q-${qIndex}-${question.id}`} className="overflow-visible mb-12">
                    {/* Question row with number and options */}
                    <div className="flex gap-3 items-start overflow-visible">
                      {/* Question number */}
                      <div className="font-bold text-sm min-w-[30px] flex-shrink-0">
                        {qIndex}
                      </div>

                      {/* Options in a single horizontal row */}
                      <div className="flex gap-6 flex-nowrap flex-1">
                        {question.options?.map((option, index) => {
                          const optionLetter = String.fromCharCode(97 + index);
                          const isSelected = selectedAnswers[question.id] === option.id ||
                                             (question.isExample && question.exampleAnswer === option.id);
                          const isCorrect = question.correctOptionId === option.id;
                          const showIncorrect = isSubmitted && isSelected && !isCorrect;
                          const isFirstOption = index === 0;

                          return (
                            <div key={option.id} className="flex-1 relative">
                              {/* Example label above first option */}
                              {isFirstOption && question.isExample && (
                                <div className="font-bold text-base absolute -top-8 left-0">Beispiel:</div>
                              )}
                              <div
                                className={cn(
                                  "flex items-center gap-2 transition-colors p-2 -m-2",
                                  !isSubmitted && !question.isExample && "cursor-pointer",
                                  isSubmitted && !isSelected && !showIncorrect && "text-muted-foreground"
                                )}
                                onClick={() => !isSubmitted && !question.isExample && handleSelectOption(question.id, option.id, question.isExample || false)}
                              >
                                <MCQCheckbox
                                  letter={optionLetter}
                                  checked={isSelected}
                                  onChange={() => handleSelectOption(question.id, option.id, question.isExample || false)}
                                  disabled={isSubmitted || (question.isExample || false)}
                                  isExample={question.isExample || false}
                                  isCorrect={isCorrect}
                                  showFeedback={isSubmitted}
                                />
                                <span className="text-sm">
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
                      <h3 className="font-bold text-base">Teil 1</h3>
                      <span className="text-muted-foreground ml-20 font-normal text-base">Vorgeschlagene Arbeitszeit: 10 Minuten</span>
                    </div>

                    {/* Instructions */}
                    <p className="text-foreground mb-6 leading-relaxed font-normal text-sm" style={{ maxWidth: '40%' }}>
                      Sie lesen in einer Zeitung einen Artikel über ein Unternehmen in der Tourismusbranche. Wählen Sie für jede Lücke die richtige Lösung.
                    </p>

                    {/* Content Box */}
                    <div className="border border-foreground/40 p-8 bg-background">
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

                      {/* Main text */}
                      <p className="leading-7 whitespace-pre-wrap text-foreground text-sm" style={{ lineHeight: '1.6' }}>
                        {questions[0].context}
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
          <div className="bg-background p-6 flex justify-between items-center mt-auto">
            {/* Goethe Logo */}
            <div className="flex-shrink-0">
              <img
                src="/goethe-logo.png"
                alt="Goethe-Institut"
                className="h-12 w-auto dark:invert"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitted || !allQuestionsAnswered}
              className="px-8 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed font-medium transition-opacity"
            >
              {isSubmitted ? 'Test abgeschlossen' : 'Test abgeben'}
            </button>
          </div>

          {/* Results summary when submitted */}
          {isSubmitted && (
            <div className="bg-accent p-6">
              <p className="font-medium text-center text-foreground text-sm">
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
