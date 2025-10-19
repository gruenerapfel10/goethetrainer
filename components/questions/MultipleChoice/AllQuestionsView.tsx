'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MCQCheckbox } from './MCQCheckbox';
import { GoetheHeader } from './GoetheHeader';

interface Question {
  id: string;
  prompt?: string;
  context?: string;
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
}

export function AllQuestionsView({ questions, onSubmit }: AllQuestionsViewProps) {
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
    <div className="w-full h-full flex flex-col bg-background">
      {/* Content */}
      <div className="flex-1 overflow-y-auto px-12 py-6 overflow-x-visible pt-8">
        <div className="w-full overflow-visible">
          {/* Quelle/Fragen Toggle */}
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setActiveView('fragen')}
              className={cn(
                "px-4 py-2 rounded font-medium transition-colors",
                activeView === 'fragen'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Fragen
            </button>
            <button
              onClick={() => setActiveView('quelle')}
              className={cn(
                "px-4 py-2 rounded font-medium transition-colors",
                activeView === 'quelle'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Quelle
            </button>
          </div>

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
                    const showCorrect = isSubmitted && isCorrect;
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
                            "flex items-center gap-2 transition-colors",
                            isSubmitted && !isSelected && !showIncorrect && "text-muted-foreground"
                          )}
                        >
                        <MCQCheckbox
                          letter={optionLetter}
                          checked={isSelected}
                          onChange={() => handleSelectOption(question.id, option.id, question.isExample || false)}
                          disabled={isSubmitted || question.isExample}
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
            <div className="space-y-6 max-w-3xl mx-auto">
              {questions[0]?.context ? (
                <div className="bg-card p-8 rounded-lg border border-border">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                    {questions[0].context}
                  </p>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-12">
                  Keine Quelle verfügbar
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer - Outside scrollable area, stays at bottom */}
      <div className="bg-background p-6 flex justify-between items-center">
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
          <p className="font-medium text-center text-foreground">
            Test abgeschlossen! Ergebnis: {questions.filter(q => !q.isExample && selectedAnswers[q.id] === q.correctOptionId).length} von {questions.filter(q => !q.isExample).length} richtig
          </p>
        </div>
      )}
    </div>
  );
}
