'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuestionComponentProps } from '../types';

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
  const [selectedOption, setSelectedOption] = useState<string>('');
  
  const handleSelect = (value: string) => {
    if (!isSubmitted) {
      setSelectedOption(value);
      onAnswer(value);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Question {questionNumber} of {totalQuestions}
          </span>
          <span className="font-medium">{question.points} points</span>
        </div>
        
        {question.context && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm leading-relaxed">{question.context}</p>
          </div>
        )}
        
        <h3 className="text-lg font-medium">{question.prompt}</h3>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <RadioGroup
          value={selectedOption}
          onValueChange={handleSelect}
          disabled={isSubmitted}
          className="space-y-3"
        >
          {question.options?.map((option) => {
            const isSelected = selectedOption === option.id;
            const isCorrectOption = question.correctAnswer === option.id;
            const showCorrect = isSubmitted && isCorrectOption;
            const showIncorrect = isSubmitted && isSelected && !isCorrectOption;
            
            return (
              <div
                key={option.id}
                className={cn(
                  "flex items-start space-x-3 p-3 rounded-lg border transition-colors",
                  !isSubmitted && isSelected && "border-primary bg-primary/5",
                  showCorrect && "border-green-500 bg-green-50",
                  showIncorrect && "border-red-500 bg-red-50"
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
                  <span className="flex items-center gap-2">
                    {option.text}
                    {showCorrect && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {showIncorrect && <XCircle className="h-4 w-4 text-red-600" />}
                  </span>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
        
        {isSubmitted && feedback && (
          <div className={cn(
            "p-4 rounded-lg flex items-start gap-2",
            isCorrect ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"
          )}>
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">
                {isCorrect ? "Correct!" : "Incorrect"}
              </p>
              <p className="text-sm">{feedback}</p>
              {question.explanation && (
                <p className="text-sm mt-2">{question.explanation}</p>
              )}
            </div>
          </div>
        )}
        
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={!onPrevious || questionNumber === 1}
          >
            Previous
          </Button>
          
          <Button
            onClick={onNext}
            disabled={!onNext || (!isSubmitted && !selectedOption)}
          >
            {questionNumber === totalQuestions ? 'Finish' : 'Next'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}