'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

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
    <div className="w-full">
      <div className="bg-gray-50/50 p-4 pb-4">
        <h2 className="text-xl font-bold">Teil 1</h2>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-4">
          {questions.map((question, qIndex) => (
            <div key={`q-${qIndex}-${question.id}`} className="flex gap-6">
              <div className="font-bold text-lg min-w-[30px] pt-1">
                {qIndex}
              </div>

              <div className="flex-1">
                {question.isExample && (
                  <div className="font-medium text-sm mb-2">Beispiel:</div>
                )}

                <div className="flex gap-6 flex-wrap">
                  {question.options?.map((option, index) => {
                    const optionLetter = String.fromCharCode(97 + index);
                    const isSelected = selectedAnswers[question.id] === option.id ||
                                       (question.isExample && question.exampleAnswer === option.id);
                    const isCorrect = question.correctOptionId === option.id;
                    const showCorrect = isSubmitted && isCorrect;
                    const showIncorrect = isSubmitted && isSelected && !isCorrect;

                    return (
                      <label
                        key={option.id}
                        className={cn(
                          "flex items-center gap-2 cursor-pointer transition-colors min-w-[180px]",
                          !isSubmitted && isSelected && !question.isExample && "text-blue-600",
                          showCorrect && "text-green-600",
                          showIncorrect && "text-red-600",
                          question.isExample && "cursor-default"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOption(question.id, option.id, question.isExample || false)}
                          disabled={isSubmitted || question.isExample}
                          className={cn(
                            "w-4 h-4",
                            question.isExample ? "cursor-default" : "cursor-pointer"
                          )}
                        />
                        <span className="text-gray-700">
                          {optionLetter})
                        </span>
                        <span className={cn(
                          "text-sm",
                          showCorrect && "text-green-600 font-medium",
                          showIncorrect && "text-red-600"
                        )}>
                          {option.text}
                        </span>
                        {question.isExample && isSelected && (
                          <span className="text-black font-bold ml-2">✗</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-6 border-t">
          <button
            onClick={handleSubmit}
            disabled={isSubmitted || !allQuestionsAnswered}
            className="px-8 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitted ? 'Test abgeschlossen' : 'Test abgeben'}
          </button>
        </div>

        {isSubmitted && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="font-medium">
              Test abgeschlossen! Ergebnis: {questions.filter(q => !q.isExample && selectedAnswers[q.id] === q.correctOptionId).length} von {questions.filter(q => !q.isExample).length} richtig
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
