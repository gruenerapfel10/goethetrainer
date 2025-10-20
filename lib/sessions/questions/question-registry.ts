import { z } from 'zod';
import { QuestionTypeName, MarkingMethod } from './question-enums';
import { multipleChoiceConfig } from './configs/gap-text-multiple-choice.config';
import { multipleChoiceStandardConfig } from './configs/multiple-choice-standard.config';

// Re-export enums for backward compatibility
export { QuestionTypeName, MarkingMethod } from './question-enums';

export interface QuestionMetadata {
  name: QuestionTypeName;
  displayName: string;
  description: string;
  category: string;
  markingMethod: MarkingMethod;
  generationSchema: z.ZodTypeAny;
  sessionGenerationSchema?: z.ZodTypeAny;
  markingSchema?: z.ZodTypeAny;
  answerSchema?: z.ZodTypeAny;
  supportedSessions?: ReadonlyArray<string>;
  defaultPoints: number;
  defaultTimeLimit?: number;
  requiresRichTextEditor?: boolean;
  requiresAudioRecorder?: boolean;
  requiresTimer?: boolean;
  supportsHints?: boolean;
  supportsPartialCredit?: boolean;
  aiGeneration?: Record<string, unknown>;
  [key: string]: unknown;
}

type QuestionDefinition = QuestionMetadata;

const registry = new Map<QuestionTypeName, QuestionDefinition>();

function registerQuestion(metadata: QuestionDefinition): void {
  registry.set(metadata.name, metadata);
}

// Register built-in question types
[multipleChoiceConfig, multipleChoiceStandardConfig].forEach(config => {
  registerQuestion(config as QuestionDefinition);
});

export function getQuestionMetadata(type: QuestionTypeName): QuestionMetadata {
  const metadata = registry.get(type);
  if (!metadata) {
    throw new Error(`Question type "${type}" is not registered`);
  }
  return metadata;
}

export function isQuestionTypeRegistered(type: QuestionTypeName): boolean {
  return registry.has(type);
}

export function listRegisteredQuestionTypes(): QuestionTypeName[] {
  return Array.from(registry.keys());
}

export function getQuestionRegistry(): Map<QuestionTypeName, QuestionDefinition> {
  return registry;
}
