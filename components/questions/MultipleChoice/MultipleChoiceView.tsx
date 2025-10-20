'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SessionResultsView } from '../SessionResultsView';
import type { Question } from '@/lib/sessions/questions/question-types';

interface MultipleChoiceViewProps {
  question: Question;
  showA4Format?: boolean;
  sessionId?: string;
  onSubmit?: (answer: string) => void;
  accumulatedAnswers?: Record<string, string>; // Answers from previous Teils
}

export function MultipleChoiceView({
  question,
  showA4Format = false,
  sessionId,
  onSubmit,
  accumulatedAnswers = {},
}: MultipleChoiceViewProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState<any>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleOptionClick = (optionId: string) => {
    if (!isSubmitted) {
      setSelectedAnswer(optionId);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAnswer) {
      alert('Bitte wählen Sie eine Antwort aus.');
      return;
    }

    setIsSubmitted(true);

    // Call marking API if sessionId is provided
    if (sessionId) {
      try {
        // Combine accumulated answers from previous Teils with current answer
        const allAnswers = {
          ...accumulatedAnswers,
          [question.id]: selectedAnswer,
        };

        console.log('🔵 Submitting all answers (all Teils):', allAnswers);

        const response = await fetch(`/api/sessions/${sessionId}/mark`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answers: allAnswers,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to submit answers');
        }

        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.error('Error submitting answer:', error);
        alert('Fehler beim Absenden der Antwort. Bitte versuchen Sie es erneut.');
        setIsSubmitted(false);
      }
    } else if (onSubmit) {
      onSubmit(selectedAnswer);
    }
  };

  const handleReturnToQuestions = () => {
    setResults(null);
    setIsSubmitted(false);
    setSelectedAnswer('');
  };

  // If results are available, show results view
  if (results) {
    return (
      <SessionResultsView
        results={results.results}
        summary={results.summary}
        onClose={handleReturnToQuestions}
      />
    );
  }

  const containerClass = showA4Format
    ? 'w-[21cm] h-[29.7cm] mx-auto bg-white dark:bg-sidebar shadow-lg overflow-y-auto'
    : 'w-full h-full overflow-y-auto';

  return (
    <div className="w-full h-full bg-gray-200 dark:bg-sidebar flex items-start justify-center overflow-y-auto py-8">
      <div className={containerClass}>
        <div className="p-8 space-y-6">
          {/* Theme badge */}
          {question.theme && (
            <div className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold rounded">
              {question.theme}
            </div>
          )}

          {/* Title and subtitle */}
          {question.title && (
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">{question.title}</h1>
              {question.subtitle && (
                <p className="text-sm text-muted-foreground">{question.subtitle}</p>
              )}
            </div>
          )}

          {/* Reading passage */}
          {question.context && (
            <Card className="p-6 bg-muted/50">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words hyphens-auto" lang="de">
                  {question.context}
                </p>
              </div>
            </Card>
          )}

          {/* Question */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{question.prompt}</h2>

            {/* Answer options */}
            <div className="space-y-3">
              {question.options?.map((option) => {
                const isSelected = selectedAnswer === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleOptionClick(option.id)}
                    disabled={isSubmitted}
                    className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    } ${isSubmitted ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {isSelected && (
                          <div className="w-3 h-3 rounded-full bg-white"></div>
                        )}
                      </div>
                      <span className="text-sm break-words hyphens-auto flex-1" lang="de">
                        {option.text}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!selectedAnswer || isSubmitted}
              size="lg"
            >
              Test abgeben
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
