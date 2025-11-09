import type { AnswerValue } from '@/lib/sessions/types';
import type { SessionQuestion } from '@/lib/sessions/learning-session-context';
import { SessionBoard } from '@/components/questions/SessionBoard';
import { StatementMatchQuestion } from './StatementMatchQuestion';
import { StatementMatchSource } from './StatementMatchSource';

interface StatementMatchViewProps {
  question: SessionQuestion;
  value: AnswerValue;
  onAnswer: (value: Record<string, string>) => void;
  teilNumber: number;
  teilLabel: string;
  teilLabels: Record<number, string>;
  totalTeils: number;
  generatedTeils: Set<number>;
  onTeilNavigate?: (teilNumber: number) => void;
  onBack?: () => void;
  showBackButton?: boolean;
  isSubmitting?: boolean;
  isLastTeil?: boolean;
  canSubmit?: boolean;
  onSubmit: () => void;
  activeView: 'fragen' | 'quelle';
  onActiveViewChange: (view: 'fragen' | 'quelle') => void;
  showA4Format?: boolean;
  onShowA4FormatChange?: (show: boolean) => void;
  onEndSession?: () => void;
}

export function StatementMatchView({
  question,
  value,
  onAnswer,
  teilNumber,
  teilLabel,
  teilLabels,
  totalTeils,
  generatedTeils,
  onTeilNavigate,
  onBack,
  showBackButton = false,
  isSubmitting = false,
  isLastTeil = true,
  canSubmit = true,
  onSubmit,
  activeView,
  onActiveViewChange,
  showA4Format = true,
  onShowA4FormatChange,
  onEndSession,
}: StatementMatchViewProps) {
  return (
    <SessionBoard
      teilNumber={teilNumber}
      teilLabel={teilLabel}
      teilLabels={teilLabels}
      totalTeils={totalTeils}
      generatedTeils={generatedTeils}
      onTeilNavigate={onTeilNavigate}
      onBack={onBack}
      showBackButton={showBackButton}
      isSubmitting={isSubmitting}
      isLastTeil={isLastTeil}
      canSubmit={canSubmit}
      onSubmit={onSubmit}
      activeView={activeView}
      onActiveViewChange={onActiveViewChange}
      frageContent={
        <StatementMatchQuestion
          question={question}
          value={value}
          onAnswer={onAnswer}
          isSubmitted={Boolean(question.result)}
          feedback={question.result?.feedback}
        />
      }
      quelleContent={<StatementMatchSource question={question} />}
      showA4Format={showA4Format}
      onShowA4FormatChange={onShowA4FormatChange}
      onEndSession={onEndSession}
    />
  );
}
