import { z } from 'zod';
import { QuestionTypeName, MarkingMethod } from './question-enums';
import { multipleChoiceConfig } from './configs/gap-text-multiple-choice.config';
import { multipleChoiceStandardConfig } from './configs/multiple-choice-standard.config';

// Re-export enums for backward compatibility
export { QuestionTypeName, MarkingMethod } from './question-enums';

// Base metadata for all question types
export interface QuestionMetadata {
  name: QuestionTypeName;
  displayName: string;
  description: string;

  // Marking configuration
  markingMethod: MarkingMethod;
  markingSchema?: z.ZodSchema; // Schema for AI marking (null = manual)

  // Generation schema for AI to create questions
  generationSchema: z.ZodSchema;

  // UI preferences
  requiresRichTextEditor?: boolean;
  requiresAudioRecorder?: boolean;
  requiresTimer?: boolean;

  // Scoring configuration
  defaultTimeLimit?: number; // in seconds
}

// Registry of implemented question types (only includes types with full implementations)
export const QUESTION_METADATA: Partial<Record<QuestionTypeName, QuestionMetadata>> = {
  [QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE]: multipleChoiceConfig as QuestionMetadata,
  [QuestionTypeName.MULTIPLE_CHOICE]: multipleChoiceStandardConfig as QuestionMetadata,
};