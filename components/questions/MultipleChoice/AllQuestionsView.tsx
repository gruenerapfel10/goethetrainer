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
  const [showSource, setShowSource] = useState(false);
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

  const context = questions[0]?.context;

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-gray-50/50 p-4 pb-4 border-b">
        <h2 className="text-xl font-bold">Teil 1</h2>
      </div>

      {/* Toggle between Source and Questions */}
      <div className="flex items-center gap-2 px-6 pt-4 pb-3 border-b bg-white">
        <button
          onClick={() => setShowSource(false)}
          className={cn(
            "px-4 py-2 rounded font-medium transition-colors",
            !showSource
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          )}
        >
          Fragen
        </button>
        <button
          onClick={() => setShowSource(true)}
          className={cn(
            "px-4 py-2 rounded font-medium transition-colors",
            showSource
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          )}
        >
          Quelle
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        {showSource ? (
          // Show source/context
          <div className="max-w-3xl">
            <h3 className="text-lg font-semibold mb-6">Lesetext</h3>
            <p className="whitespace-pre-wrap text-base leading-relaxed text-gray-700">
              {context}
            </p>
          </div>
        ) : (
          // Show questions
          <div className="space-y-12">
            {questions.map((question, qIndex) => (
              <div key={`q-${qIndex}-${question.id}`} className="flex gap-6">
                {/* Question number */}
                <div className="font-bold text-lg min-w-[40px] pt-1 flex-shrink-0">
                  {qIndex}
                </div>

                {/* Question content */}
                <div className="flex-1">
                  {question.isExample && (
                    <div className="font-medium text-sm mb-3 text-blue-600">Beispiel:</div>
                  )}

                  {/* Question prompt */}
                  <p className="text-sm font-medium mb-6 text-gray-900">
                    {question.prompt}
                  </p>

                  {/* Options in single row - 4 columns */}
                  <div className="grid grid-cols-4 gap-4">
                    {question.options?.map((option, index) => {
                      const optionLetter = String.fromCharCode(97 + index);
                      const isSelected = selectedAnswers[question.id] === option.id ||
                                         (question.isExample && question.exampleAnswer === option.id);
                      const isCorrect = question.correctOptionId === option.id;
                      const showCorrect = isSubmitted && isCorrect;
                      const showIncorrect = isSubmitted && isSelected && !isCorrect;

                      return (
                        <div
                          key={option.id}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-lg border-2 border-gray-200 transition-all",
                            !isSubmitted && isSelected && !question.isExample && "border-blue-600 bg-blue-50",
                            showCorrect && "border-green-600 bg-green-50",
                            showIncorrect && "border-red-600 bg-red-50",
                            !isSubmitted && !isSelected && "hover:border-gray-400 hover:bg-gray-50"
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
                          <span className={cn(
                            "text-sm text-center",
                            showCorrect && "text-green-700 font-medium",
                            showIncorrect && "text-red-700"
                          )}>
                            {option.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with submit button */}
      <div className="border-t bg-white p-6 flex justify-end">
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
        <div className="p-6 bg-blue-50 border-t">
          <p className="font-medium text-center">
            Test abgeschlossen! Ergebnis: {questions.filter(q => !q.isExample && selectedAnswers[q.id] === q.correctOptionId).length} von {questions.filter(q => !q.isExample).length} richtig
          </p>
        </div>
      )}
    </div>
  );
}
