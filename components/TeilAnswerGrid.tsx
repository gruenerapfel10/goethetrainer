'use client';

import React, { useState } from 'react';
import { MCQCheckbox } from './questions/MultipleChoice/MCQCheckbox';

interface TeilAnswerGridProps {
  teilNumber: 1 | 2 | 3 | 4;
  questionCount: number;
  optionsPerQuestion?: number;
  className?: string;
}

export const TeilAnswerGrid: React.FC<TeilAnswerGridProps> = ({
  teilNumber,
  questionCount,
  optionsPerQuestion = 4,
  className = '',
}) => {
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const handleAnswerChange = (questionNum: number, option: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionNum]: prev[questionNum] === option ? '' : option,
    }));
  };

  const options = Array.from({ length: optionsPerQuestion }, (_, i) =>
    String.fromCharCode(97 + i) // a, b, c, d, etc.
  );

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {/* Header */}
      <div
        className="text-[10px] font-bold border-foreground px-1 py-0.5 w-full"
        style={{ borderWidth: '0.5px', borderStyle: 'solid' }}
      >
        Teil {teilNumber}
      </div>

      {/* Answer Grid */}
      <div className="flex gap-3">
        {/* Question Numbers Column */}
        <div
          className="flex flex-col border-foreground"
          style={{ borderWidth: '0.5px', borderStyle: 'solid' }}
        >
          {/* Header - empty space */}
          <div className="w-6 h-[20px]"></div>

          {/* Question Numbers */}
          {Array.from({ length: questionCount }, (_, i) => (
            <div key={i + 1} className="w-6 text-xs font-medium text-center flex items-center justify-center" style={{ height: '24px' }}>
              {i + 1}
            </div>
          ))}
        </div>

        {/* Checkboxes Grid */}
        <div className="flex flex-col gap-2">
          {/* Header Row with Letters */}
          <div className="flex gap-2">
            {options.map((option) => (
              <div key={option} className="w-4 text-xs font-medium text-center">
                {option}
              </div>
            ))}
          </div>

          {/* Question Rows */}
          {Array.from({ length: questionCount }, (_, i) => {
            const questionNum = i + 1;
            return (
              <div key={questionNum} className="flex gap-2">
                {/* Answer Options */}
                {options.map((option) => (
                  <MCQCheckbox
                    key={option}
                    letter={option}
                    checked={answers[questionNum] === option}
                    onChange={() => handleAnswerChange(questionNum, option)}
                    size="msm"
                    showContent={false}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
