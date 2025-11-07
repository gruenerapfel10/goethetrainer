import { deepMerge } from '@/lib/utils/object';
import type { SessionTypeEnum } from '@/lib/sessions/session-registry';
import type { QuestionDifficulty } from '@/lib/sessions/questions/question-types';
import type {
  QuestionModule,
  QuestionModuleTask,
  QuestionModuleGenerateResult,
  QuestionModulePromptConfig,
  QuestionModuleRenderConfig,
  QuestionModuleSourceConfig,
} from './types';
import { QuestionModuleId } from './types';

const MODULE_REGISTRY = new Map<QuestionModuleId, QuestionModule<any, any, any, any>>();

export function registerQuestionModule(module: QuestionModule): void {
  MODULE_REGISTRY.set(module.id, module);
}

export function getQuestionModule(id: QuestionModuleId): QuestionModule {
  const module = MODULE_REGISTRY.get(id);
  if (!module) {
    throw new Error(`Question module "${id}" is not registered`);
  }
  return module;
}

export function listQuestionModules(): QuestionModule[] {
  return Array.from(MODULE_REGISTRY.values());
}

interface ExecuteTaskOptions {
  sessionType: SessionTypeEnum;
  difficulty: QuestionDifficulty;
}

export async function executeQuestionModuleTask(
  task: QuestionModuleTask,
  options: ExecuteTaskOptions
): Promise<QuestionModuleGenerateResult & { moduleId: QuestionModuleId }> {
  const module = getQuestionModule(task.moduleId);

  if (!module.supportsSessions.includes(options.sessionType)) {
    throw new Error(
      `Module ${module.id} does not support session type ${options.sessionType}`
    );
  }

  const promptConfig = deepMerge(
    {},
    module.defaults.prompt,
    task.promptOverrides ?? {}
  ) as QuestionModulePromptConfig;

  const sourceConfig = deepMerge(
    {},
    module.defaults.source,
    task.sourceOverrides ?? {}
  ) as QuestionModuleSourceConfig;

  const result = await module.generate({
    sessionType: options.sessionType,
    difficulty: options.difficulty,
    questionCount: task.questionCount,
    promptConfig,
    sourceConfig,
  });

  // Enrich question payloads with module metadata and render/scoring overrides.
  result.questions = result.questions.map(question => ({
    ...question,
    moduleId: module.id,
    moduleLabel: module.label,
    renderConfig: deepMerge({}, module.defaults.render, task.renderOverrides ?? {}),
    scoring: deepMerge({}, module.defaults.scoring, task.scoringOverrides ?? {}),
    layoutId: task.id,
    layoutLabel: task.label ?? task.id,
  }));

  return { ...result, moduleId: module.id };
}

