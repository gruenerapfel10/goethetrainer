import { QuestionModuleId } from '@/lib/questions/modules/types';
import type { QuestionInputComponent } from '@/components/inputs/types';
import { MultipleChoiceInput } from '@/components/inputs/MultipleChoice';
import { WritingResponse } from '@/components/questions/Writing/WritingResponse';

const WrittenResponseInput: QuestionInputComponent = ({ question, onChange }) => {
  return <WritingResponse question={question} onAnswer={text => onChange(text)} />;
};

const MODULE_COMPONENTS: Partial<Record<QuestionModuleId, QuestionInputComponent>> = {
  [QuestionModuleId.MULTIPLE_CHOICE]: MultipleChoiceInput,
  [QuestionModuleId.WRITTEN_RESPONSE]: WrittenResponseInput,
};

export function resolveModuleComponent(
  moduleId: QuestionModuleId
): QuestionInputComponent | null {
  return MODULE_COMPONENTS[moduleId] ?? null;
}
