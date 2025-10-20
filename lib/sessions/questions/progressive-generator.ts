/**
 * Progressive question generator - generates questions one by one and updates state
 */

import { generateQuestionsForSession } from './standard-generator';
import { QuestionTypeName } from './question-registry';
import { SessionTypeEnum } from '../session-registry';
import { QuestionDifficulty } from './question-types';

export interface ProgressiveGeneratorOptions {
  layout: QuestionTypeName[];
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
    const questionType = layout[teilIndex];
    const teilNumber = teilIndex + 1;
    const questionCount = questionType === QuestionTypeName.GAP_TEXT_MULTIPLE_CHOICE ? 9 : 7;

    try {
      // Generate questions for this Teil
      const questions = await generateQuestionsForSession(
        sessionType,
        difficulty,
        questionCount,
        [questionType]
      );

      // Emit each question as it's ready
      for (const question of questions) {
        onQuestionGenerated({
          ...question,
          teil: teilNumber,
          registryType: questionType
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