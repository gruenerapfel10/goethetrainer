'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MCQCheckbox } from './MCQCheckbox';

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
    <div className="w-full h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6">
        <h2 className="text-base font-bold">Teil 1</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 overflow-x-visible pt-8">
        <div className="w-full space-y-20 overflow-visible">
          {questions.map((question, qIndex) => (
            <div key={`q-${qIndex}-${question.id}`} className="overflow-visible">
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
                            isSubmitted && !isSelected && !showIncorrect && "text-gray-700"
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
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white p-6 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isSubmitted || !allQuestionsAnswered}
          className="px-8 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {isSubmitted ? 'Test abgeschlossen' : 'Test abgeben'}
        </button>
      </div>

      {/* Results summary when submitted */}
      {isSubmitted && (
        <div className="p-6 bg-blue-50">
          <p className="font-medium text-center">
            Test abgeschlossen! Ergebnis: {questions.filter(q => !q.isExample && selectedAnswers[q.id] === q.correctOptionId).length} von {questions.filter(q => !q.isExample).length} richtig
          </p>
        </div>
      )}
    </div>
  );
}
