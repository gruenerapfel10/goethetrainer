import { registerQuestionModule } from './registry';
import { multipleChoiceModule } from './multiple-choice';

export function registerDefaultQuestionModules() {
  registerQuestionModule(multipleChoiceModule);
}

export * from './types';
export * from './registry';

