import { registerQuestionModule } from './registry';
import { multipleChoiceModule } from './multiple-choice';
import { statementMatchModule } from './statement-match';
import { writtenResponseModule } from './written-response';

export function registerDefaultQuestionModules() {
  registerQuestionModule(multipleChoiceModule);
  registerQuestionModule(statementMatchModule);
  registerQuestionModule(writtenResponseModule);
}

export * from './types';
export * from './registry';
