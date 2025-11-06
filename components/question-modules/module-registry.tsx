import { QuestionModuleId } from '@/lib/questions/modules/types';
import type { QuestionInputComponent } from '@/components/inputs/types';
import { MultipleChoiceInput } from '@/components/inputs/MultipleChoice';

const MODULE_COMPONENTS: Partial<Record<QuestionModuleId, QuestionInputComponent>> = {
  [QuestionModuleId.MULTIPLE_CHOICE]: MultipleChoiceInput,
};

export function resolveModuleComponent(
  moduleId: QuestionModuleId
): QuestionInputComponent | null {
  return MODULE_COMPONENTS[moduleId] ?? null;
}
