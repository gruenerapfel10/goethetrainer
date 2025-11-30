import { deepMerge } from '@/lib/utils/object';
import type { SessionTypeEnum } from '@/lib/sessions/session-registry';
import type { QuestionDifficulty } from '@/lib/sessions/questions/question-types';
import type {
  QuestionModule,
  QuestionModuleTask,
  QuestionModuleGenerateResult,
  QuestionModulePromptConfig,
  QuestionModuleSourceConfig,
  ModelUsageRecord,
} from './types';
import type { QuestionModuleId } from './types';
import type { LevelId, LevelProfile } from '@/lib/levels/level-profiles';

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
  userId?: string;
  recordUsage?: (record: ModelUsageRecord) => void;
  levelId?: LevelId | null;
  levelProfile?: LevelProfile | null;
}

export async function executeQuestionModuleTask(
  task: QuestionModuleTask,
  options: ExecuteTaskOptions
): Promise<QuestionModuleGenerateResult & { moduleId: QuestionModuleId }> {
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`📋 STAGE 4: Module Execution - STARTING`);
  console.log(`   Task ID: ${task.id}`);
  console.log(`   Module: ${task.moduleId}`);
  console.log(`   Questions Requested: ${task.questionCount}`);
  console.log(`${'─'.repeat(80)}`);

  try {
    const module = getQuestionModule(task.moduleId);

    if (!module.supportsSessions.includes(options.sessionType)) {
      const errorMsg = `Module ${module.id} does not support session type ${options.sessionType}`;
      console.error(`❌ Module Compatibility Check Failed: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    console.log(`✅ Module found: ${module.label}`);

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

    console.log(`⏳ Invoking module.generate()...`);
    const result = await module.generate({
      userId: options.userId,
      recordUsage: options.recordUsage,
      sessionType: options.sessionType,
      difficulty: options.difficulty,
      levelId: options.levelId,
      levelProfile: options.levelProfile,
      questionCount: task.questionCount,
      promptConfig,
      sourceConfig,
    });

    console.log(`✅ Module returned ${result.questions.length} questions`);

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

    console.log(`✅ STAGE 4: Module Execution - COMPLETED`);
    console.log(`   Questions enriched with metadata`);
    console.log(`${'─'.repeat(80)}\n`);

    return { ...result, moduleId: module.id };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ STAGE 4: Module Execution - FAILED`);
    console.error(`   Error: ${errorMsg}`);
    console.log(`${'─'.repeat(80)}\n`);
    throw error;
  }
}
