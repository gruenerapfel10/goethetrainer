'use client';

import { QuestionResult } from '@/lib/sessions/questions/question-types';
import { CheckCircle2, XCircle, Award, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionResultsViewProps {
  results: QuestionResult[];
  summary: {
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    totalScore: number;
    maxScore: number;
    percentage: number;
  };
  onClose?: () => void;
}

export function SessionResultsView({ results, summary, onClose }: SessionResultsViewProps) {
  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 dark:text-green-400';
    if (percentage >= 75) return 'text-blue-600 dark:text-blue-400';
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getGradeLabel = (percentage: number) => {
    if (percentage >= 90) return 'Ausgezeichnet!';
    if (percentage >= 75) return 'Sehr gut!';
    if (percentage >= 60) return 'Gut';
    if (percentage >= 50) return 'Bestanden';
    return 'Nicht bestanden';
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Testergebnis</h1>
          <p className="text-muted-foreground">Hier ist dein Ergebnis</p>
        </div>

        {/* Summary Card */}
        <div className="bg-card border rounded-lg p-8 space-y-6">
          {/* Score Circle */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative w-48 h-48">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 88}`}
                  strokeDashoffset={`${2 * Math.PI * 88 * (1 - summary.percentage / 100)}`}
                  className={cn("transition-all duration-1000", getGradeColor(summary.percentage))}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={cn("text-5xl font-bold", getGradeColor(summary.percentage))}>
                  {summary.percentage}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {getGradeLabel(summary.percentage)}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-6 w-full mt-6">
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                <div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {summary.correctAnswers}
                  </div>
                  <div className="text-sm text-muted-foreground">Richtig</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                <div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {summary.incorrectAnswers}
                  </div>
                  <div className="text-sm text-muted-foreground">Falsch</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <Target className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {summary.totalScore}
                  </div>
                  <div className="text-sm text-muted-foreground">Punkte</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <Award className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                <div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {summary.maxScore}
                  </div>
                  <div className="text-sm text-muted-foreground">Max. Punkte</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Results */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Detaillierte Ergebnisse</h2>

          <div className="space-y-3">
            {results.map((result, index) => {
              const userAnswerOption = result.question.options?.find(
                opt => opt.id === result.userAnswer.answer
              );
              const correctOption = result.question.options?.find(
                opt => opt.id === result.question.correctOptionId || opt.isCorrect
              );

              return (
                <div
                  key={result.questionId}
                  className={cn(
                    "border rounded-lg p-4 space-y-2",
                    result.isCorrect
                      ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {result.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 space-y-2">
                        <div className="font-medium">
                          Frage {index + 1}
                          {result.question.prompt && (
                            <span className="ml-2 text-sm text-muted-foreground">
                              {result.question.prompt}
                            </span>
                          )}
                        </div>

                        {userAnswerOption && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Deine Antwort: </span>
                            <span className={result.isCorrect ? "text-foreground" : "text-red-600 dark:text-red-400 line-through"}>
                              {userAnswerOption.text}
                            </span>
                          </div>
                        )}

                        {!result.isCorrect && correctOption && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Richtige Antwort: </span>
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {correctOption.text}
                            </span>
                          </div>
                        )}

                        {result.feedback && (
                          <div className="text-sm text-muted-foreground italic">
                            {result.feedback}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-sm font-medium">
                      {result.score}/{result.maxScore} Punkte
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        {onClose && (
          <div className="flex justify-center pt-4">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Schließen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
