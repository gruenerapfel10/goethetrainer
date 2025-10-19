'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuestionComponentProps } from '../types';

export function MultipleChoice3({
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
  const [selectedOption, setSelectedOption] = useState<string>('');
  
  const handleSelect = (value: string) => {
    if (!isSubmitted) {
      setSelectedOption(value);
      onAnswer(value);
    }
  };

  // Ensure exactly 3 options
  const options = question.options?.slice(0, 3) || [];

  return (
    <Card className="w-full max-w-4xl mx-auto border-gray-200">
      <CardHeader className="space-y-4 bg-gray-50/50 border-b border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Teil 2 · Aufgabe {questionNumber}
          </span>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-gray-500">
              GOETHE-ZERTIFIKAT C1
            </span>
            <span className="font-medium text-gray-700">{question.points} Punkte</span>
          </div>
        </div>
        
        {question.context && (
          <div className="p-4 bg-white border-l-4 border-gray-300 rounded-sm">
            <p className="text-base leading-relaxed whitespace-pre-wrap font-serif text-gray-800">{question.context}</p>
          </div>
        )}
        
        <h3 className="text-base font-semibold text-gray-900 mt-4">{question.prompt}</h3>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <RadioGroup
          value={selectedOption}
          onValueChange={handleSelect}
          disabled={isSubmitted}
          className="space-y-3"
        >
          {options.map((option, index) => {
            const optionLetter = `${String.fromCharCode(97 + index)})` // a), b), c)
            const isSelected = selectedOption === option.id;
            const isCorrectOption = question.correctAnswer === option.id || question.correctOptionId === option.id;
            const showCorrect = isSubmitted && isCorrectOption;
            const showIncorrect = isSubmitted && isSelected && !isCorrectOption;
            
            return (
              <div
                key={option.id}
                className={cn(
                  "flex items-start space-x-3 p-3 rounded-sm border transition-all",
                  !isSubmitted && isSelected && "border-blue-400 bg-blue-50/50 shadow-sm",
                  !isSubmitted && !isSelected && "border-gray-200 hover:border-gray-300",
                  showCorrect && "border-green-500 bg-green-50",
                  showIncorrect && "border-red-400 bg-red-50"
                )}
              >
                <RadioGroupItem 
                  value={option.id} 
                  id={option.id}
                  className="mt-1"
                />
                <Label 
                  htmlFor={option.id} 
                  className="flex-1 cursor-pointer font-normal"
                >
                  <span className="flex items-start gap-2">
                    <span className="font-semibold text-gray-600 min-w-[24px]">
                      {optionLetter}
                    </span>
                    <span className="text-gray-800 leading-relaxed">{option.text}</span>
                    {showCorrect && <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto mt-0.5" />}
                    {showIncorrect && <XCircle className="h-4 w-4 text-red-600 ml-auto mt-0.5" />}
                  </span>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
        
        {isSubmitted && feedback && (
          <div className={cn(
            "p-3 rounded-sm border-l-4",
            isCorrect ? "bg-green-50 border-green-500" : "bg-red-50 border-red-400"
          )}>
            <div className="space-y-1">
              <p className="font-medium text-gray-800">
                {isCorrect ? "Richtig" : "Nicht richtig"}
              </p>
              <p className="text-sm text-gray-700">{feedback}</p>
              {question.explanation && (
                <p className="text-sm mt-2 text-gray-600">{question.explanation}</p>
              )}
            </div>
          </div>
        )}
        
        <div className="flex justify-between pt-6 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={!onPrevious || questionNumber === 1}
            className="text-sm"
          >
            ← Vorherige Aufgabe
          </Button>
          
          <Button
            onClick={onNext}
            disabled={!onNext || (!isSubmitted && !selectedOption)}
            className="text-sm"
          >
            {questionNumber === totalQuestions ? 'Test beenden' : 'Nächste Aufgabe →'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}