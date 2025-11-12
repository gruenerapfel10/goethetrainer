import { LevelId } from './types';
import { QuestionDifficulty } from '@/lib/sessions/questions/question-types';

export function mapLevelToQuestionDifficulty(levelId: LevelId | undefined | null): QuestionDifficulty {
  switch (levelId) {
    case LevelId.A1:
    case LevelId.A2:
      return QuestionDifficulty.BEGINNER;
    case LevelId.B1:
    case LevelId.B2:
      return QuestionDifficulty.INTERMEDIATE;
    case LevelId.C1:
    case LevelId.C2:
    default:
      return QuestionDifficulty.ADVANCED;
  }
}
