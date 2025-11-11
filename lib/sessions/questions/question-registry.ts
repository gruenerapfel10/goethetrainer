import {
  executeQuestionModuleTask,
  getQuestionModule,
  listQuestionModules,
  registerDefaultQuestionModules,
  registerQuestionModule,
} from '@/lib/questions/modules';
import type {
  QuestionModule,
  QuestionModuleTask,
} from '@/lib/questions/modules/types';
import type {
  QuestionModuleId,
  QuestionModuleGenerateResult,
} from '@/lib/questions/modules/types';

registerDefaultQuestionModules();

// Backwards compatibility alias.
export type { QuestionModuleId as QuestionTypeName } from '@/lib/questions/modules/types';
export { QuestionModuleId } from '@/lib/questions/modules/types';
export type { QuestionModule } from '@/lib/questions/modules/types';

export function registerQuestion(metadata: QuestionModule): void {
  registerQuestionModule(metadata);
}

export function getQuestionMetadata(type: QuestionModuleId): QuestionModule {
  return getQuestionModule(type);
}

export function listRegisteredQuestionTypes(): QuestionModuleId[] {
  return listQuestionModules().map(module => module.id);
}

export function runQuestionModuleTask(
  task: QuestionModuleTask,
  options: Parameters<typeof executeQuestionModuleTask>[1]
): Promise<QuestionModuleGenerateResult & { moduleId: QuestionModuleId }> {
  return executeQuestionModuleTask(task, options);
}
