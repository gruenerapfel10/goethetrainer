import { QuestionInputType } from '@/lib/sessions/inputs';
import type { QuestionInputComponent } from './types';
import { MultipleChoiceInput } from './MultipleChoice';
import { TrueFalseInput } from './TrueFalse';
import { WrittenResponseInput } from './Written';

const COMPONENT_REGISTRY: Partial<Record<QuestionInputType, QuestionInputComponent>> = {
  [QuestionInputType.MULTIPLE_CHOICE]: MultipleChoiceInput,
  [QuestionInputType.TRUE_FALSE]: TrueFalseInput,
  [QuestionInputType.SHORT_TEXT]: WrittenResponseInput,
  [QuestionInputType.LONG_TEXT]: WrittenResponseInput,
};

export function resolveInputComponent(
  inputType: QuestionInputType
): QuestionInputComponent | null {
  return COMPONENT_REGISTRY[inputType] ?? null;
}
