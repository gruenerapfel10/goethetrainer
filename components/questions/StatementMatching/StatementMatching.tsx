'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, AlertCircle, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuestionComponentProps } from '../types';

interface Text {
  id: string;
  title: string;
  content: string;
}

interface Statement {
  id: string;
  text: string;
  correctTextId: string | null;
}

export function StatementMatching({
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
  const [matches, setMatches] = useState<Record<string, string | null>>({});
  const [activeText, setActiveText] = useState<string>('');
  
  // Parse data from question
  const texts: Text[] = question.texts || [];
  const statements: Statement[] = question.statements || [];
  
  const handleMatch = (statementId: string, textId: string | null) => {
    if (!isSubmitted) {
      const newMatches = { ...matches, [statementId]: textId };
      setMatches(newMatches);
      onAnswer(newMatches);
    }
  };
  
  const getCorrectCount = () => {
    return statements.filter(statement => 
      matches[statement.id] === statement.correctTextId
    ).length;
  };

  return (
    <Card className="w-full max-w-5xl mx-auto border-gray-200">
      <CardHeader className="space-y-4 bg-gray-50/50 border-b border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Teil 4 · Aufgabe {questionNumber}
          </span>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-gray-500">
              GOETHE-ZERTIFIKAT C1
            </span>
            <span className="font-medium text-gray-700">{question.points} Punkte</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-gray-900">Zuordnungsaufgabe</h3>
          <p className="text-sm text-gray-600">
            Lesen Sie die Texte und ordnen Sie die Aussagen den richtigen Texten zu.
            Manche Aussagen passen zu keinem Text (wählen Sie "Kein Text").
          </p>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Text tabs */}
        <div className="space-y-4">
          <div className="flex gap-2 border-b">
            {texts.map((text, index) => (
              <button
                key={text.id}
                onClick={() => setActiveText(text.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors border-b-2",
                  activeText === text.id 
                    ? "border-blue-500 text-blue-700 bg-blue-50/50" 
                    : "border-transparent text-gray-600 hover:text-gray-900"
                )}
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Text {String.fromCharCode(65 + index)}
                </span>
              </button>
            ))}
          </div>
          
          {/* Active text content */}
          {activeText && (
            <div className="p-4 bg-white border border-gray-200 rounded-sm">
              <h4 className="font-semibold text-gray-900 mb-3">
                {texts.find(t => t.id === activeText)?.title}
              </h4>
              <p className="text-base font-serif leading-relaxed whitespace-pre-wrap text-gray-800">
                {texts.find(t => t.id === activeText)?.content}
              </p>
            </div>
          )}
          
          {!activeText && (
            <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-sm border border-gray-200">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>Wählen Sie einen Text oben aus, um ihn zu lesen</p>
            </div>
          )}
        </div>
        
        {/* Statements */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-700">
            Ordnen Sie jede Aussage dem richtigen Text zu:
          </h4>
          <div className="space-y-3">
            {statements.map((statement, index) => {
              const selectedTextId = matches[statement.id];
              const isCorrectMatch = isSubmitted && selectedTextId === statement.correctTextId;
              const isIncorrectMatch = isSubmitted && selectedTextId !== undefined && selectedTextId !== statement.correctTextId;
              
              return (
                <div
                  key={statement.id}
                  className={cn(
                    "p-4 rounded-sm border transition-colors",
                    !isSubmitted && "border-gray-200 hover:border-gray-300",
                    isCorrectMatch && "bg-green-50 border-green-500",
                    isIncorrectMatch && "bg-red-50 border-red-400"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="font-semibold text-gray-600 mt-1 min-w-[24px]">
                      {index + 1}.
                    </span>
                    <div className="flex-1 space-y-3">
                      <p className="text-base text-gray-800">{statement.text}</p>
                      <RadioGroup
                        value={selectedTextId || ''}
                        onValueChange={(value) => handleMatch(statement.id, value === 'none' ? null : value)}
                        disabled={isSubmitted}
                        className="flex flex-wrap gap-3"
                      >
                        {texts.map((text, textIndex) => (
                          <div key={text.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={text.id} id={`${statement.id}-${text.id}`} />
                            <Label 
                              htmlFor={`${statement.id}-${text.id}`}
                              className="text-sm cursor-pointer"
                            >
                              Text {String.fromCharCode(65 + textIndex)}
                            </Label>
                          </div>
                        ))}
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="none" id={`${statement.id}-none`} />
                          <Label 
                            htmlFor={`${statement.id}-none`}
                            className="text-sm cursor-pointer"
                          >
                            Kein Text
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="mt-1">
                      {isCorrectMatch && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                      {isIncorrectMatch && <XCircle className="h-5 w-5 text-red-600" />}
                    </div>
                  </div>
                  {isSubmitted && isIncorrectMatch && (
                    <p className="text-xs text-red-700 mt-2 ml-8">
                      Richtig: {
                        statement.correctTextId === null 
                          ? 'Kein Text' 
                          : `Text ${String.fromCharCode(65 + texts.findIndex(t => t.id === statement.correctTextId))}`
                      }
                    </p>
                  )}
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
                {getCorrectCount()} von {statements.length} richtig
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
            disabled={!onNext || (!isSubmitted && statements.some(s => !matches[s.id]))}
            className="text-sm"
          >
            {questionNumber === totalQuestions ? 'Test beenden' : 'Nächste Aufgabe →'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}