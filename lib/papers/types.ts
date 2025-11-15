import type { SessionType } from '@/lib/sessions/types';
import type { Question } from '@/lib/sessions/questions/question-types';

export interface PaperBlueprint {
  id: string;
  sessionId: string;
  type: SessionType;
  createdBy: string;
  createdAt: string;
  metadata?: {
    title?: string;
    subtitle?: string;
    icon?: string;
    color?: string;
    difficulty?: string;
    [key: string]: unknown;
  };
  blueprint: {
    questions: Question[];
  };
}
