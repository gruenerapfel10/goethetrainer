'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AlertCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuestionComponentProps } from '../types';

export function ShortAnswer({
  question,
  onAnswer,
  onNext,
  onPrevious,
  isSubmitted,
  isCorrect,
  feedback,
  questionNumber,
  totalQuestions,
  showHint,
  currentHintIndex = 0,
}: QuestionComponentProps) {
  const [answer, setAnswer] = useState('');
  const [showHintState, setShowHintState] = useState(false);
  
  const handleChange = (value: string) => {
    if (!isSubmitted) {
      setAnswer(value);
      onAnswer(value);
    }
  };

  const currentHint = question.hints?.[currentHintIndex];

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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Your Answer</label>
            {currentHint && !isSubmitted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHintState(!showHintState)}
              >
                <Lightbulb className="h-4 w-4 mr-1" />
                Hint
              </Button>
            )}
          </div>
          
          {showHintState && currentHint && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
              <p className="text-yellow-900">{currentHint}</p>
            </div>
          )}
          
          <Textarea
            value={answer}
            onChange={(e) => handleChange(e.target.value)}
            disabled={isSubmitted}
            placeholder="Type your answer here..."
            className="min-h-[120px] resize-none"
            maxLength={500}
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{answer.length} / 500 characters</span>
            {question.scoringCriteria?.keywords && (
              <span>Keywords expected: {question.scoringCriteria.keywords.length}</span>
            )}
          </div>
        </div>
        
        {isSubmitted && feedback && (
          <div className={cn(
            "p-4 rounded-lg flex items-start gap-2",
            isCorrect ? "bg-green-50 text-green-900" : "bg-amber-50 text-amber-900"
          )}>
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">
                {isCorrect ? "Correct!" : "Submitted for review"}
              </p>
              <p className="text-sm">{feedback}</p>
              {question.explanation && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-sm font-medium">Expected answer:</p>
                  <p className="text-sm">{question.explanation}</p>
                </div>
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
            disabled={!onNext || (!isSubmitted && answer.trim().length === 0)}
          >
            {questionNumber === totalQuestions ? 'Finish' : 'Next'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}