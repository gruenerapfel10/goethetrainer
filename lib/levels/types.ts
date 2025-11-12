import type { SessionTypeEnum, SessionLayoutDefinition } from '@/lib/sessions/session-registry';

export enum LevelId {
  A1 = 'a1',
  A2 = 'a2',
  B1 = 'b1',
  B2 = 'b2',
  C1 = 'c1',
  C2 = 'c2',
}

export interface SkillBand {
  textLength?: {
    min: number;
    max: number;
    unit: 'words' | 'seconds';
  };
  lexicalRange?: string;
  grammarFocus?: string[];
  taskDescriptors?: string[];
  register?: string;
  speed?: 'slow' | 'moderate' | 'native';
  speakerConfig?: string;
}

export interface LevelProfile {
  id: LevelId;
  label: string;
  alias?: string;
  description: string;
  difficultyRank: number;
  languageGoals: string[];
  reading: SkillBand;
  listening: SkillBand;
  writing: SkillBand & { targetWords?: number; cohesionExpectations?: string[] };
  speaking: SkillBand & { discourseMoves?: string[] };
  aiDirectives: {
    registerHint: string;
    lexicalControls: string;
    grammarControls: string;
    errorTolerance: string;
  };
  layouts?: Partial<Record<SessionTypeEnum, SessionLayoutDefinition>>;
}
