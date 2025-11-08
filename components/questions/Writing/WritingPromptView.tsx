import type { Question } from '@/lib/sessions/questions/question-types';
import { SessionBoard } from '@/components/questions/SessionBoard';
import { WritingResponse } from './WritingResponse';
import { WritingSource } from './WritingSource';

interface WritingPromptViewProps {
  question: Question;
  onAnswer: (value: string) => void;
  teilNumber: number;
  teilLabel: string;
  teilLabels: Record<number, string>;
  totalTeils: number;
  generatedTeils: Set<number>;
  onTeilNavigate?: (teil: number) => void;
  showBackButton?: boolean;
  onBack?: () => void;
  isSubmitting: boolean;
  isLastTeil: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
  activeView: 'fragen' | 'quelle';
  onActiveViewChange: (view: 'fragen' | 'quelle') => void;
}

export function WritingPromptView(props: WritingPromptViewProps) {
  const {
    question,
    onAnswer,
    teilNumber,
    teilLabel,
    teilLabels,
    totalTeils,
    generatedTeils,
    onTeilNavigate,
    showBackButton,
    onBack,
    isSubmitting,
    isLastTeil,
    canSubmit,
    onSubmit,
    activeView,
    onActiveViewChange,
  } = props;

  return (
    <SessionBoard
      teilNumber={teilNumber}
      teilLabel={teilLabel}
      teilLabels={teilLabels}
      totalTeils={totalTeils}
      generatedTeils={generatedTeils}
      onTeilNavigate={onTeilNavigate}
      showBackButton={showBackButton}
      onBack={onBack}
      isSubmitting={isSubmitting}
      isLastTeil={isLastTeil}
      canSubmit={canSubmit}
      onSubmit={onSubmit}
      activeView={activeView}
      onActiveViewChange={onActiveViewChange}
      frageContent={
        <WritingResponse
          question={question}
          onAnswer={value => {
            const resolved = typeof value === 'string' ? value : value ? String(value) : '';
            onAnswer(resolved);
          }}
        />
      }
      quelleContent={<WritingSource question={question} />}
    />
  );
}
