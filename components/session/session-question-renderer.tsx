'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

import { MultipleChoice } from '@/components/questions/MultipleChoice/MultipleChoice';
import { TrueFalse } from '@/components/questions/TrueFalse/TrueFalse';
import { ShortAnswer } from '@/components/questions/ShortAnswer/ShortAnswer';
import { GapTextMultipleChoice } from '@/components/questions/GapTextMultipleChoice/GapTextMultipleChoice';
import { MultipleChoice3 } from '@/components/questions/MultipleChoice3/MultipleChoice3';
import { GapTextMatching } from '@/components/questions/GapTextMatching/GapTextMatching';
import { StatementMatching } from '@/components/questions/StatementMatching/StatementMatching';
import { QuestionTypeName } from '@/lib/sessions/questions/question-registry';
import type { QuestionResult } from '@/lib/sessions/questions/question-types';
import type { Question } from '@/lib/sessions/types';

interface SessionQuestionRendererProps {
  currentQuestion: Question | null;
  questionNumber: number;
  totalQuestions: number;
  isSubmitted: boolean;
  isCorrect?: boolean;
  feedback?: string;
  userAnswer: string | string[] | boolean | null;
  onAnswer: (answer: string | string[] | boolean) => void;
  onNext: () => void;
  onPrevious: () => void;
  allQuestions: Question[];
}

export function SessionQuestionRenderer({
  currentQuestion,
  questionNumber,
  totalQuestions,
  isSubmitted,
  isCorrect,
  feedback,
  userAnswer,
  onAnswer,
  onNext,
  onPrevious,
  allQuestions,
}: SessionQuestionRendererProps) {
  if (!currentQuestion) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No questions available</p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Questions generated: {allQuestions.length}</p>
              <p>Supported types: {[
                QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE,
                QuestionTypeName.MULTIPLE_CHOICE_3,
                QuestionTypeName.GAP_TEXT_MATCHING,
                QuestionTypeName.STATEMENT_MATCHING,
              ].join(', ')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const questionProps = {
    question: currentQuestion,
    onAnswer,
    onNext,
    onPrevious,
    isSubmitted,
    isCorrect,
    feedback,
    questionNumber,
    totalQuestions,
  };

  const registryType = currentQuestion.registryType as QuestionTypeName;

  switch (registryType) {
    case QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE:
      return <GapTextMultipleChoice {...questionProps} />;

    case QuestionTypeName.MULTIPLE_CHOICE_3:
      return <MultipleChoice3 {...questionProps} />;

    case QuestionTypeName.GAP_TEXT_MATCHING:
      return <GapTextMatching {...questionProps} />;

    case QuestionTypeName.STATEMENT_MATCHING:
      return <StatementMatching {...questionProps} />;

    case QuestionTypeName.MULTIPLE_CHOICE:
      return <MultipleChoice {...questionProps} />;

    case QuestionTypeName.TRUE_FALSE:
      return <TrueFalse {...questionProps} />;

    case QuestionTypeName.SHORT_ANSWER:
      return <ShortAnswer {...questionProps} />;

    default:
      return (
        <Card>
          <CardHeader>
            <CardTitle>Question Type Not Implemented</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Question type "{registryType}" is not yet implemented.
            </p>
            <pre className="p-4 bg-muted rounded text-xs overflow-auto">
              {JSON.stringify(currentQuestion, null, 2)}
            </pre>
          </CardContent>
          <CardFooter>
            <Button onClick={onNext}>
              Skip Question
            </Button>
          </CardFooter>
        </Card>
      );
  }
}
