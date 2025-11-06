'use client';

import { cn } from '@/lib/utils';
import { QuestionStatus } from '@/lib/sessions/learning-session-context';
import { Shimmer } from '@/components/ai-elements/shimmer';

interface Question {
  id: string;
  teil?: number;
  status?: QuestionStatus;
}

interface QuestionTimelineProps {
  questions: Question[];
  totalTeils: number;
  currentTeilNumber: number;
  generatedTeils?: Set<number>;
  onTeilNavigate?: (teilNumber: number) => void;
  generatingTeils?: Set<number>;
}

export function QuestionTimeline({
  questions,
  totalTeils,
  currentTeilNumber,
  generatedTeils,
  onTeilNavigate,
  generatingTeils,
}: QuestionTimelineProps) {
  if (totalTeils <= 1) {
    return null;
  }

  return (
    <div className="absolute top-6 right-6 flex gap-0 z-10 border-b border-border">
      {Array.from({ length: totalTeils }, (_, i) => i + 1).map((teilNum) => {
        // Check if at least one question in this Teil is loaded
        const teilQuestions = questions.filter(q => (q.teil || 1) === teilNum);
        const isGenerated = generatedTeils ? generatedTeils.has(teilNum) : teilQuestions.length > 0;
        const isGeneratingExplicit = generatingTeils?.has(teilNum) ?? false;
        const hasGeneratingQuestion = teilQuestions.some(q => q.status === QuestionStatus.GENERATING);
        const isGenerating = isGeneratingExplicit || (!isGenerated && hasGeneratingQuestion);
        const isLoaded = isGenerated && !isGenerating;
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
                : isGenerating
                ? "text-muted-foreground/40 cursor-not-allowed"
                : isLoaded
                ? "text-muted-foreground hover:text-foreground cursor-pointer"
                : "text-muted-foreground/40 cursor-not-allowed"
            )}
          >
            <span className="relative flex items-center gap-2">
              Teil {teilNum}
              {isGenerating && (
                <Shimmer
                  as="span"
                  className="text-xs font-normal text-muted-foreground"
                  duration={1.5}
                >
                  wird erstellt …
                </Shimmer>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
