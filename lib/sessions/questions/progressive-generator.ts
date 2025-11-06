/**
 * Progressive question generator - generates questions one by one and updates state
 */

import { generateSessionQuestion } from './standard-generator';
import { QuestionTypeName } from './question-registry';
import {
  SessionTypeEnum,
  type NormalisedSessionLayoutEntry,
} from '../session-registry';
import { QuestionDifficulty } from './question-types';

export interface ProgressiveGeneratorOptions {
  layout: NormalisedSessionLayoutEntry[];
  sessionType: SessionTypeEnum;
  difficulty: QuestionDifficulty;
  onQuestionGenerated: (question: any) => void;
  onTeilComplete?: (teilNumber: number) => void;
  onComplete?: () => void;
}

/**
 * Generate questions progressively - starts immediately after first question loads
 */
export async function generateProgressively(options: ProgressiveGeneratorOptions) {
  const { layout, sessionType, difficulty, onQuestionGenerated, onTeilComplete, onComplete } = options;

  for (let teilIndex = 0; teilIndex < layout.length; teilIndex++) {
    const layoutEntry = layout[teilIndex];
    const questionType = layoutEntry.questionType;
    const teilNumber = teilIndex + 1;

    try {
      // Generate questions for this Teil
      const questions = await generateSessionQuestion(
        sessionType,
        difficulty,
        questionType,
        {
          questionCount: layoutEntry.questionCount,
          aiGeneration: layoutEntry.question?.aiGeneration,
          defaults: layoutEntry.question?.defaults,
          source: layoutEntry.source,
        }
      );

      // Emit each question as it's ready
      for (const question of questions) {
        onQuestionGenerated({
          ...question,
          teil: teilNumber,
          registryType: questionType,
          layoutVariant: layoutEntry.question?.layoutVariant ?? question.layoutVariant,
          layoutId: layoutEntry.id,
          layoutLabel: layoutEntry.label,
        });
      }

      onTeilComplete?.(teilNumber);
    } catch (error) {
      console.error(`Failed to generate Teil ${teilNumber}:`, error);
      throw error;
    }
  }

  onComplete?.();
}
