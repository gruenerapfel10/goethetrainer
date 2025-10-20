'use client';

import { cn } from '@/lib/utils';
import { QuestionStatus } from '@/lib/sessions/learning-session-context';

interface Question {
  id: string;
  teil?: number;
  status?: QuestionStatus;
}

interface QuestionTimelineProps {
  questions: Question[];
  totalTeils: number;
  currentTeilNumber: number;
  onTeilNavigate?: (teilNumber: number) => void;
}

export function QuestionTimeline({
  questions,
  totalTeils,
  currentTeilNumber,
  onTeilNavigate
}: QuestionTimelineProps) {
  if (totalTeils <= 1) {
    return null;
  }

  return (
    <div className="absolute top-6 right-6 flex gap-0 z-10 border-b border-border">
      {Array.from({ length: totalTeils }, (_, i) => i + 1).map((teilNum) => {
        // Check if at least one question in this Teil is loaded
        const teilQuestions = questions.filter(q => (q.teil || 1) === teilNum);
        const isLoaded = teilQuestions.some(q => q.status === QuestionStatus.LOADED);
        const isGenerating = teilQuestions.some(q => q.status === QuestionStatus.GENERATING);
        const isCurrentTeil = teilNum === currentTeilNumber;

        return (
          <button
            key={`teil-${teilNum}`}
            onClick={() => isLoaded && onTeilNavigate?.(teilNum)}
            disabled={!isLoaded}
            className={cn(
              "px-4 py-2 font-medium transition-colors relative",
              isCurrentTeil
                ? "text-foreground border-b-2 border-primary -mb-px"
                : isLoaded
                ? "text-muted-foreground hover:text-foreground cursor-pointer"
                : "text-muted-foreground/40 cursor-not-allowed"
            )}
          >
            Teil {teilNum}
            {isGenerating && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            )}
          </button>
        );
      })}
    </div>
  );
}
