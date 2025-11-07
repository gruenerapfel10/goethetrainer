import type { AnswerValue } from '@/lib/sessions/types';
import type { SessionQuestion } from '@/lib/sessions/learning-session-context';
import { ReadingSingleModuleView } from '@/components/questions/ReadingSingleModuleView';
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
}: StatementMatchViewProps) {
  return (
    <ReadingSingleModuleView
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
      sourceContent={<StatementMatchSource question={question} />}
    >
      <StatementMatchQuestion
        question={question}
        value={value}
        onAnswer={onAnswer}
        isSubmitted={Boolean(question.result)}
        feedback={question.result?.feedback}
      />
    </ReadingSingleModuleView>
  );
}
