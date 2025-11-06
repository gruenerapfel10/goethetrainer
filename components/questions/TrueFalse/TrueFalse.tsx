'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuestionComponentProps } from '../types';

export function TrueFalse({
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
  const deriveInitialAnswer = () => {
    if (typeof question.answer === 'boolean') {
      return question.answer;
    }
    if (typeof question.answer === 'string') {
      if (question.answer.toLowerCase() === 'true') {
        return true;
      }
      if (question.answer.toLowerCase() === 'false') {
        return false;
      }
    }
    return null;
  };

  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(deriveInitialAnswer);

  useEffect(() => {
    setSelectedAnswer(deriveInitialAnswer());
  }, [question.id, question.answer]);
  
  const handleSelect = (value: boolean) => {
    if (!isSubmitted) {
      setSelectedAnswer(value);
      onAnswer(value);
    }
  };

  const correctAnswer = (() => {
    if (typeof question.correctAnswer === 'boolean') {
      return question.correctAnswer;
    }
    if (Array.isArray(question.correctAnswer)) {
      return question.correctAnswer.some(
        value => typeof value === 'string' && value.toLowerCase() === 'true'
      );
    }
    if (typeof question.correctAnswer === 'string') {
      return question.correctAnswer.toLowerCase() === 'true';
    }
    return false;
  })();

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
        <div className="grid grid-cols-2 gap-4">
          {[true, false].map((value) => {
            const isSelected = selectedAnswer === value;
            const showCorrect = isSubmitted && correctAnswer === value;
            const showIncorrect = isSubmitted && isSelected && correctAnswer !== value;
            
            return (
              <Button
                key={value.toString()}
                variant={isSelected && !isSubmitted ? "default" : "outline"}
                size="lg"
                onClick={() => handleSelect(value)}
                disabled={isSubmitted}
                className={cn(
                  "h-20 text-lg font-medium transition-colors",
                  showCorrect && "border-green-500 bg-green-50 hover:bg-green-50",
                  showIncorrect && "border-red-500 bg-red-50 hover:bg-red-50"
                )}
              >
                <span className="flex items-center gap-2">
                  {value ? "True" : "False"}
                  {showCorrect && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                  {showIncorrect && <XCircle className="h-5 w-5 text-red-600" />}
                </span>
              </Button>
            );
          })}
        </div>
        
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
            disabled={!onNext || (!isSubmitted && selectedAnswer === null)}
          >
            {questionNumber === totalQuestions ? 'Finish' : 'Next'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
