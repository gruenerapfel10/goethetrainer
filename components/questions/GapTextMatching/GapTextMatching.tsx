'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuestionComponentProps } from '../types';

interface Sentence {
  id: string;
  text: string;
  correctGapId?: string;
}

interface Gap {
  id: string;
  correctSentenceId: string;
}

export function GapTextMatching({
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
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [draggedSentence, setDraggedSentence] = useState<string | null>(null);
  
  // Parse data from question
  const sentences: Sentence[] = question.sentences || [];
  const gaps: Gap[] = question.gaps || [];
  const text = question.text || question.prompt;
  
  const handleDragStart = (sentenceId: string) => {
    if (!isSubmitted) {
      setDraggedSentence(sentenceId);
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  const handleDrop = (e: React.DragEvent, gapId: string) => {
    e.preventDefault();
    if (!isSubmitted && draggedSentence) {
      const newMatches = { ...matches };
      
      // Remove sentence from any previous gap
      Object.keys(newMatches).forEach(key => {
        if (newMatches[key] === draggedSentence) {
          delete newMatches[key];
        }
      });
      
      // Add to new gap
      newMatches[gapId] = draggedSentence;
      setMatches(newMatches);
      onAnswer(newMatches);
      setDraggedSentence(null);
    }
  };
  
  const handleRemoveMatch = (gapId: string) => {
    if (!isSubmitted) {
      const newMatches = { ...matches };
      delete newMatches[gapId];
      setMatches(newMatches);
      onAnswer(newMatches);
    }
  };
  
  // Render text with numbered gaps
  const renderTextWithGaps = () => {
    const parts = text.split(/\[(\d+)\]/g);
    const result = [];
    
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // Regular text
        result.push(<span key={i}>{parts[i]}</span>);
      } else {
        // Gap number
        const gapNumber = parseInt(parts[i]);
        const gap = gaps[gapNumber - 1];
        if (gap) {
          const matchedSentenceId = matches[gap.id];
          const matchedSentence = sentences.find(s => s.id === matchedSentenceId);
          const isCorrectMatch = isSubmitted && matchedSentenceId === gap.correctSentenceId;
          const isIncorrectMatch = isSubmitted && matchedSentenceId && matchedSentenceId !== gap.correctSentenceId;
          
          result.push(
            <span
              key={i}
              className={cn(
                "inline-block mx-1 px-3 py-1 rounded-sm border min-w-[50px] text-center font-medium transition-colors",
                !matchedSentence && "bg-gray-50 border-gray-300 border-dashed",
                matchedSentence && !isSubmitted && "bg-blue-50/50 border-blue-400",
                isCorrectMatch && "bg-green-50 border-green-500 text-green-800",
                isIncorrectMatch && "bg-red-50 border-red-400 text-red-700"
              )}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, gap.id)}
              onClick={() => matchedSentence && handleRemoveMatch(gap.id)}
              title={matchedSentence ? matchedSentence.text : 'Drop a sentence here'}
            >
              {matchedSentence ? (
                <span className="cursor-pointer">
                  [{sentences.indexOf(matchedSentence) + 1}]
                  {isCorrectMatch && ' ✓'}
                  {isIncorrectMatch && ' ✗'}
                </span>
              ) : (
                <span className="text-muted-foreground">[{gapNumber}]</span>
              )}
            </span>
          );
        }
      }
    }
    
    return result;
  };
  
  const usedSentences = new Set(Object.values(matches));
  const allGapsFilled = gaps.every(gap => matches[gap.id]);

  return (
    <Card className="w-full max-w-4xl mx-auto border-gray-200">
      <CardHeader className="space-y-4 bg-gray-50/50 border-b border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Teil 3 · Aufgabe {questionNumber}
          </span>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-gray-500">
              GOETHE-ZERTIFIKAT C1
            </span>
            <span className="font-medium text-gray-700">{question.points} Punkte</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-gray-900">Textrekonstruktion</h3>
          <p className="text-sm text-gray-600">
            Ordnen Sie die Sätze den passenden Lücken im Text zu.
          </p>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main text with gaps */}
        <div className="p-4 bg-white border border-gray-200 rounded-sm leading-relaxed text-base font-serif text-gray-800">
          {renderTextWithGaps()}
        </div>
        
        {/* Available sentences */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Verfügbare Sätze:
          </h4>
          <div className="grid gap-2">
            {sentences.map((sentence, index) => {
              const isUsed = usedSentences.has(sentence.id);
              const correctGap = gaps.find(g => g.correctSentenceId === sentence.id);
              const isCorrectlyPlaced = isSubmitted && matches[correctGap?.id || ''] === sentence.id;
              const isIncorrectlyPlaced = isSubmitted && isUsed && !isCorrectlyPlaced;
              
              return (
                <div
                  key={sentence.id}
                  draggable={!isSubmitted && !isUsed}
                  onDragStart={() => handleDragStart(sentence.id)}
                  className={cn(
                    "p-3 rounded-sm border cursor-move transition-all",
                    isUsed && "opacity-50 cursor-not-allowed",
                    !isUsed && !isSubmitted && "hover:bg-gray-50 hover:border-gray-400 border-gray-200",
                    isCorrectlyPlaced && "bg-green-50 border-green-500",
                    isIncorrectlyPlaced && "bg-red-50 border-red-400",
                    isSubmitted && !isUsed && "bg-amber-50 border-amber-400"
                  )}
                >
                  <span className="flex items-start gap-2">
                    <span className="font-semibold text-gray-600 min-w-[24px]">
                      {String.fromCharCode(65 + index)})
                    </span>
                    <span className="flex-1">{sentence.text}</span>
                    {isCorrectlyPlaced && <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />}
                    {isIncorrectlyPlaced && <XCircle className="h-4 w-4 text-red-600 mt-0.5" />}
                    {isSubmitted && !isUsed && sentence.correctGapId === null && (
                      <span className="text-xs text-amber-700">Nicht verwendet</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        
        {isSubmitted && feedback && (
          <div className={cn(
            "p-3 rounded-sm border-l-4",
            isCorrect ? "bg-green-50 border-green-500" : "bg-amber-50 border-amber-500"
          )}>
            <div className="space-y-1">
              <p className="font-medium text-gray-800">
                {Object.entries(matches).filter(([gapId, sentId]) => 
                  gaps.find(g => g.id === gapId)?.correctSentenceId === sentId
                ).length} von {gaps.length} richtig
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
            disabled={!onNext || (!isSubmitted && !allGapsFilled)}
            className="text-sm"
          >
            {questionNumber === totalQuestions ? 'Test beenden' : 'Nächste Aufgabe →'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}