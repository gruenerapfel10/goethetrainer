import { registerQuestionModule } from './registry';
import { multipleChoiceModule } from './multiple-choice';
import { statementMatchModule } from './statement-match';

export function registerDefaultQuestionModules() {
  registerQuestionModule(multipleChoiceModule);
  registerQuestionModule(statementMatchModule);
}

export * from './types';
export * from './registry';
