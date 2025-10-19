'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuestionComponentProps } from '../types';

interface Gap {
  id: string;
  options: Array<{
    id: string;
    text: string;
  }>;
  correctOptionId: string;
}

export function GapTextMultipleChoice({
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
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  
  // Parse gaps from question data  
  const gaps = question.gaps || [];
  const text = question.context || question.text || question.prompt;
  
  const handleSelectOption = (gapId: string, optionId: string) => {
    if (!isSubmitted) {
      const newSelections = { ...selectedOptions, [gapId]: optionId };
      setSelectedOptions(newSelections);
      onAnswer(newSelections);
    }
  };

  // Split text by gap markers and render with dropdowns
  const renderTextWithGaps = () => {
    let parts = text.split(/\[GAP_(\d+)\]/g);
    let result = [];
    
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // Regular text
        result.push(<span key={i}>{parts[i]}</span>);
      } else {
        // Gap ID from text
        const gapId = `GAP_${parts[i]}`;
        const gap = gaps.find(g => g.id === gapId);
        if (gap) {
          const selectedOption = selectedOptions[gap.id];
          const isCorrectOption = isSubmitted && selectedOption === gap.correctAnswer;
          const isIncorrectOption = isSubmitted && selectedOption && selectedOption !== gap.correctAnswer;
          
          result.push(
            <select
              key={i}
              className={cn(
                "inline-block mx-1 px-3 py-1 rounded-sm border min-w-[150px] font-medium",
                !isSubmitted && "border-gray-300 bg-white hover:border-gray-400",
                !isSubmitted && selectedOption && "border-blue-400 bg-blue-50",
                isCorrectOption && "border-green-500 bg-green-50 text-green-800",
                isIncorrectOption && "border-red-400 bg-red-50 text-red-700",
                !selectedOption && "bg-gray-50"
              )}
              value={selectedOption || ''}
              onChange={(e) => handleSelectOption(gap.id, e.target.value)}
              disabled={isSubmitted}
            >
              <option value="">___</option>
              {gap.options?.map((option, idx) => (
                <option key={idx} value={option}>
                  {option}
                </option>
              ))}
            </select>
          );
        }
      }
    }
    
    return result;
  };

  const allGapsSelected = gaps.every(gap => selectedOptions[gap.id]);

  return (
    <Card className="w-full max-w-4xl mx-auto border-gray-200">
      <CardHeader className="space-y-4 bg-gray-50/50 border-b border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Teil 1 · Aufgabe {questionNumber}
          </span>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-gray-500">
              GOETHE-ZERTIFIKAT C1
            </span>
            <span className="font-medium text-gray-700">{question.points} Punkte</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-gray-900">{question.prompt}</h3>
          <p className="text-sm text-gray-600">
            Wählen Sie für jede Lücke die richtige Lösung.
          </p>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        <div className="p-4 bg-white border border-gray-200 rounded-sm leading-relaxed text-base font-serif text-gray-800">
          {renderTextWithGaps()}
        </div>
        
        {isSubmitted && feedback && (
          <div className={cn(
            "p-3 rounded-sm border-l-4",
            isCorrect ? "bg-green-50 border-green-500" : "bg-amber-50 border-amber-500"
          )}>
            <div className="space-y-1">
              <p className="font-medium text-gray-800">
                {isCorrect ? "Alle Lücken richtig" : `${Object.values(selectedOptions).filter((opt, i) => opt === gaps[i]?.correctAnswer).length} von ${gaps.length} richtig`}
              </p>
              <p className="text-sm text-gray-700">{feedback}</p>
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
            disabled={!onNext || (!isSubmitted && !allGapsSelected)}
            className="text-sm"
          >
            {questionNumber === totalQuestions ? 'Test beenden' : 'Nächste Aufgabe →'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}