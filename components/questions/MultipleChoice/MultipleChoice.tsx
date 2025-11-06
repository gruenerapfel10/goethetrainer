'use client';

import type { JSX } from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuestionComponentProps } from '../types';

interface GapOption {
  id: string;
  text: string;
}

interface Gap {
  id: string;
  options?: string[] | GapOption[];
  correctAnswer?: string;
  correctOptionId?: string;
}

export function MultipleChoice({
  question,
  onAnswer,
  onNext,
  onPrevious,
  isSubmitted,
  isCorrect,
  feedback,
  questionNumber,
  totalQuestions,
}: QuestionComponentProps) {
  // Helper functions to handle both string and object option formats
  const getOptionId = (option: string | GapOption): string => {
    return typeof option === 'string' ? option : option.id;
  };

  const getOptionText = (option: string | GapOption): string => {
    return typeof option === 'string' ? option : option.text;
  };

  // Determine if this is gap-text mode or standard mode
  const hasGaps = question.gaps && question.gaps.length > 0;
  const text = question.context || question.text || question.prompt;
  const gaps = (question.gaps || []) as Gap[];

  const examplePrefill = question.isExample ? question.exampleAnswer || '' : '';
  const isExampleQuestion = Boolean(question.isExample && hasGaps);
  const zeroBasedQuestionNumber =
    typeof questionNumber === 'number' ? Math.max(0, questionNumber - 1) : null;

  const deriveInitialSelection = () => {
    const answer = question.answer as unknown;
    if (typeof answer === 'string') {
      return answer;
    }

    if (answer && typeof answer === 'object' && !Array.isArray(answer)) {
      return { ...(answer as Record<string, string>) };
    }

    if (examplePrefill) {
      return examplePrefill;
    }

    return hasGaps ? {} : '';
  };

  // State for gap selections (gap-text mode) or single option (standard mode)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string> | string>(() => deriveInitialSelection());
  const [activeTab, setActiveTab] = useState<'source' | 'questions'>('questions');

  const isGapTextMode = hasGaps && text?.includes('[GAP_');
  const hasContext = !!(question.context && question.context !== question.prompt);
  const hasSourceTab = isGapTextMode || (hasContext && question.options);

  // Call onAnswer if this is an example question with pre-filled answer
  useEffect(() => {
    if (question.isExample && examplePrefill) {
      onAnswer(examplePrefill);
    }
  }, [question.isExample, examplePrefill, onAnswer]);

  useEffect(() => {
    const nextSelection = deriveInitialSelection();

    setSelectedOptions(prev => {
      if (typeof prev === 'string' && typeof nextSelection === 'string') {
        return prev === nextSelection ? prev : nextSelection;
      }

      if (typeof prev === 'object' && typeof nextSelection === 'object') {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(nextSelection);

        if (
          prevKeys.length === nextKeys.length &&
          prevKeys.every(key => (prev as Record<string, string>)[key] === (nextSelection as Record<string, string>)[key])
        ) {
          return prev;
        }

        return nextSelection;
      }

      return nextSelection;
    });
  }, [question.id, question.answer]);

  // Gap-text mode handlers
  const handleSelectGapOption = (gapId: string, optionValue: string) => {
    if (isSubmitted || isExampleQuestion) {
      return;
    }

    const newSelections = {
      ...(typeof selectedOptions === 'object' ? selectedOptions : {}),
      [gapId]: optionValue,
    };
    setSelectedOptions(newSelections);
    onAnswer(newSelections);
  };

  // Standard mode handlers
  const handleSelectOption = (value: string) => {
    if (isSubmitted) {
      return;
    }

    setSelectedOptions(value);
    onAnswer(value);
  };

  // Render text with inline gap dropdowns
  const renderTextWithGaps = () => {
    const parts = text.split(/\[GAP_(\d+)\]/g);
    const result: JSX.Element[] = [];
    const selections = typeof selectedOptions === 'object' ? selectedOptions : {};

    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // Regular text
        result.push(<span key={i}>{parts[i]}</span>);
      } else {
        // Gap ID from text
        const gapId = `GAP_${parts[i]}`;
        const gap = gaps.find(g => g.id === gapId);
        if (gap) {
          const selectedValue = selections[gapId];
          const correctOptionId = gap.correctOptionId || gap.correctAnswer;
          const isCorrectOption = isSubmitted && selectedValue === correctOptionId;
          const isIncorrectOption = isSubmitted && selectedValue && selectedValue !== correctOptionId;

          result.push(
            <select
              key={i}
              className={cn(
                "inline-block mx-1 px-3 py-1 rounded-sm border-b-2 min-w-[150px] font-medium",
                !isSubmitted && "border-b-gray-300 bg-white hover:border-b-gray-400",
                !isSubmitted && selectedValue && "border-b-blue-400 bg-blue-50",
                isCorrectOption && "border-b-green-500 bg-green-50 text-green-800",
                isIncorrectOption && "border-b-red-400 bg-red-50 text-red-700",
                !selectedValue && "bg-gray-50"
              )}
              value={selectedValue || ''}
              onChange={e => handleSelectGapOption(gapId, e.target.value)}
              disabled={isSubmitted || isExampleQuestion}
            >
              <option value="">___</option>
              {gap.options?.map((option, idx) => {
                const optionId = getOptionId(option);
                const optionText = getOptionText(option);
                return (
                  <option key={idx} value={optionId}>
                    {optionText}
                  </option>
                );
              })}
            </select>
          );
        }
      }
    }

    return result;
  };

  // Check if all gaps are selected (for gap-text mode)
  const allGapsSelected = gaps.every(gap =>
    typeof selectedOptions === 'object' && selectedOptions[gap.id]
  );

  // Check if an option is selected (for standard mode)
  const optionSelected = typeof selectedOptions === 'string' && selectedOptions !== '';

  const isGoethe = true; // Always use Goethe format for reading comprehension
  const isEnglish = !isGoethe;

  const getPartNumber = () => {
    // Extract part number from prompt if it contains "Teil"
    const match = question.prompt?.match(/Teil\s+(\d+)/);
    return match ? match[1] : questionNumber.toString();
  };

  return (
    <Card className="w-full max-w-6xl mx-auto border-0 shadow-none h-full flex flex-col">
      {/* Header with metadata */}
      <CardHeader className={cn("space-y-4", "bg-gray-50/50")}>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-lg">
              Teil 1
            </span>
          </div>
        </div>

      </CardHeader>

      <CardContent className="pt-6 flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4">
          {false ? (
          // Source tab - Show the reading passage/context
          <div className="space-y-4">
            {isGapTextMode ? (
              // Gap text source - Show with gap markers
              <div className="p-6 space-y-3">
                <h2 className="text-center font-bold text-lg tracking-wide text-gray-900">
                  {(question as any).title}
                </h2>
                <h3 className="text-center font-bold text-base text-gray-900">
                  {(question as any).subtitle}
                </h3>
                <p className="text-center font-bold text-sm text-gray-900 leading-relaxed">
                  {(question as any).heading}
                </p>

                {/* Main article text with gaps */}
                <div className={cn("text-sm leading-relaxed font-serif text-gray-800 space-y-3", "whitespace-pre-wrap")}>
                  {text?.split(/(\[\d+ \.\.\.\])/g).map((part, idx) => {
                    if (part?.match(/^\[\d+ \.\.\.\]$/)) {
                      // This is a gap marker
                      const gapNum = part.match(/\d+/)?.[0];
                      const gap = gaps.find(g => g.id === `GAP_${gapNum}`);
                      return (
                        <span
                          key={idx}
                          className="inline-block bg-white px-1 font-normal min-w-[60px] text-center text-gray-700 border-b border-gray-400"
                        >
                          {part}
                        </span>
                      );
                    }
                    return <span key={idx}>{part}</span>;
                  })}
                </div>
              </div>
            ) : (
              // Non-gap source - Show context/passage
              <div className="p-6 space-y-3 text-sm leading-relaxed font-serif text-gray-800">
                {question.context}
              </div>
            )}
          </div>
        ) : isGapTextMode ? (
          // Gap text questions tab - Grid layout matching Goethe C1 format
          <div className="space-y-2">
            {gaps.map((gap, gapIndex) => {
              const selections = typeof selectedOptions === 'object' ? selectedOptions : {};
              const selectedValue = selections[gap.id];

              return (
                <div key={gap.id} className="flex items-center gap-4 text-sm">
                  {/* Gap number */}
                  <span className="font-semibold text-gray-700 min-w-[20px]">
                    {gapIndex}
                  </span>

                  {/* Option columns */}
                  <div className="flex gap-8 flex-1">
                    {gap.options?.map((option, optionIndex) => {
                      const optionId = getOptionId(option);
                      const optionText = getOptionText(option);
                      const optionNumber = `${optionIndex}`; // 0, 1, 2, 3
                      const isSelected = selectedValue === optionId;
                      const correctOptionId = gap.correctOptionId || gap.correctAnswer;
                      const isCorrectOption = isSubmitted && optionId === correctOptionId;
                      const isIncorrectOption = isSubmitted && isSelected && optionId !== correctOptionId;

                      return (
                        <label
                          key={`${gap.id}-${optionIndex}`}
                          className={cn(
                            "flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors",
                            !isSubmitted && isSelected && "text-blue-600",
                            isCorrectOption && "text-green-600 font-medium",
                            isIncorrectOption && "text-red-600"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => !isSubmitted && handleSelectGapOption(gap.id, optionId)}
                            disabled={isSubmitted || isExampleQuestion}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span className="font-semibold text-gray-600 min-w-[24px]">
                            {optionNumber}
                          </span>
                          <span className={cn(
                            isCorrectOption && "text-green-600 font-semibold",
                            isIncorrectOption && "text-red-600"
                          )}>
                            {optionText}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Standard/non-gap mode - Show prompt and options
          <div className="space-y-4">
            {/* Question number on the left and options grid */}
            <div className="flex gap-6">
              {/* Question number */}
              <div className="font-bold text-lg min-w-[30px]">
                {(zeroBasedQuestionNumber ?? qIndex).toString()}
              </div>

              {/* Options grid with Beispiel label if needed */}
              <div className="flex-1 space-y-3">
                {question.isExample && (
                  <div className="font-medium text-sm mb-2">Beispiel:</div>
                )}

                {/* Options - Display horizontally in Goethe format */}
                <div className="flex gap-8 flex-wrap">
                  {question.options?.map((option, index) => {
                  const isSelected = selectedOptions === option.id || (question.isExample && question.exampleAnswer === option.id);
                  const isCorrectOption = question.correctAnswer === option.id || question.correctOptionId === option.id;
                  const showCorrect = isSubmitted && isCorrectOption;
                  const showIncorrect = isSubmitted && isSelected && !isCorrectOption;

                  const optionLetter = String.fromCharCode(97 + index); // a, b, c, d

                  return (
                    <label
                      key={option.id}
                      className={cn(
                        "flex items-center gap-2 cursor-pointer transition-colors min-w-[150px]",
                        !isSubmitted && isSelected && "text-blue-600",
                        showCorrect && "text-green-600",
                        showIncorrect && "text-red-600"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => !isSubmitted && handleSelectOption(option.id)}
                        disabled={isSubmitted || isExampleQuestion}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span className="font-normal text-gray-700">
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
                        <span className="text-black font-bold text-base ml-2">✗</span>
                      )}
                    </label>
                  );
                })}
                </div>
              </div>
            </div>
          </div>
        )}
        </div>

        {isSubmitted && feedback && (
          <div className={cn(
            "p-3 rounded-sm mt-4",
            isGoethe ? "" : "rounded-lg flex items-start gap-2",
            isCorrect ? (isGoethe ? "bg-green-50" : "bg-green-50 text-green-900") : (isGoethe ? "bg-amber-50" : "bg-red-50 text-red-900")
          )}>
            {!isGoethe && !isCorrect && <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />}
            <div className="space-y-1">
              <p className={cn("font-medium", isGoethe ? "text-gray-800" : "")}>
                {isGapTextMode && isGoethe
                  ? (isCorrect ? "Alle Lücken richtig" : `${Object.values(typeof selectedOptions === 'object' ? selectedOptions : {}).filter((opt, i) => opt === gaps[i]?.correctAnswer).length} von ${gaps.length} richtig`)
                  : (isCorrect ? (isGoethe ? "Richtig" : "Correct!") : (isGoethe ? "Nicht richtig" : "Incorrect"))}
              </p>
              <p className={cn("text-sm", isGoethe ? "text-gray-700" : "")}>{feedback}</p>
              {question.explanation && (
                <p className={cn("text-sm mt-2", isGoethe ? "text-gray-600" : "")}>{question.explanation}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between pt-6 mt-auto">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={!onPrevious || questionNumber === 1}
            className="text-sm"
          >
            {isGoethe ? '← Vorherige Aufgabe' : 'Previous'}
          </Button>

          <Button
            onClick={onNext}
            disabled={!onNext || (!isSubmitted && (isGapTextMode ? !allGapsSelected : !optionSelected))}
            className="text-sm"
          >
            {questionNumber === totalQuestions
              ? (isGoethe ? 'Test beenden' : 'Finish')
              : (isGoethe ? 'Nächste Aufgabe →' : 'Next')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
