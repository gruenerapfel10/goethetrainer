export type LexisBand = 'basic_only' | 'basic_plus_mid' | 'full';
export type InferenceRequirement = 'off' | 'on' | 'high';
export type DistractorCloseness = 'loose' | 'tight' | 'very_tight';

export interface LevelProfile {
  passageLength: [number, number];
  syntaxDepth: number;
  lexisBand: LexisBand;
  connectorExplicitMin: number;
  inferenceRequirement: InferenceRequirement;
  optionsPerItem: 3 | 4;
  distractorCloseness: DistractorCloseness;
  questionCount?: number;
  gapCount?: number;
  finalGuide?: string;
}

export type LevelId = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export const LEVEL_PROFILES: Record<LevelId, LevelProfile> = {
  A1: {
    passageLength: [60, 90],
    syntaxDepth: 1,
    lexisBand: 'basic_only',
    connectorExplicitMin: 1,
    inferenceRequirement: 'off',
    optionsPerItem: 3,
    distractorCloseness: 'loose',
    questionCount: 4,
    gapCount: 4,
    finalGuide: 'Halte alles extrem einfach und konkret; nur Hauptsätze, Alltagswörter, keine Fachbegriffe.',
  },
  A2: {
    passageLength: [90, 130],
    syntaxDepth: 2,
    lexisBand: 'basic_only',
    connectorExplicitMin: 1,
    inferenceRequirement: 'off',
    optionsPerItem: 3,
    distractorCloseness: 'loose',
    questionCount: 4,
    gapCount: 4,
    finalGuide: 'Einfache, klare Sprache mit kurzen Sätzen; wenige Nebensätze, keine Fachsprache.',
  },
  B1: {
    passageLength: [130, 180],
    syntaxDepth: 2,
    lexisBand: 'basic_plus_mid',
    connectorExplicitMin: 1,
    inferenceRequirement: 'on',
    optionsPerItem: 3,
    distractorCloseness: 'tight',
    questionCount: 6,
    gapCount: 6,
    finalGuide: 'Magazinartige Alltagssprache, kurze Sätze, kein Amtsdeutsch; konkrete Beispiele bevorzugen.',
  },
  B2: {
    passageLength: [180, 230],
    syntaxDepth: 3,
    lexisBand: 'basic_plus_mid',
    connectorExplicitMin: 2,
    inferenceRequirement: 'on',
    optionsPerItem: 4,
    distractorCloseness: 'tight',
    questionCount: 6,
    gapCount: 6,
    finalGuide: 'Kurze, klare Sätze (max ein Nebensatz), magazinartig, keine schweren Wirtschafts-/Amtsfloskeln.',
  },
  C1: {
    passageLength: [220, 260],
    syntaxDepth: 3,
    lexisBand: 'basic_plus_mid',
    connectorExplicitMin: 2,
    inferenceRequirement: 'on',
    optionsPerItem: 4,
    distractorCloseness: 'tight',
    questionCount: 8,
    gapCount: 8,
    finalGuide: 'Gehobener, aber klarer Stil; präzise Verknüpfungen, abwechslungsreiche Syntax ohne unnötige Schwerfälligkeit.',
  },
  C2: {
    passageLength: [280, 320],
    syntaxDepth: 4,
    lexisBand: 'full',
    connectorExplicitMin: 1,
    inferenceRequirement: 'high',
    optionsPerItem: 4,
    distractorCloseness: 'very_tight',
    questionCount: 8,
    gapCount: 8,
    finalGuide: 'Sehr flüssig und nuanciert; anspruchsvolle Syntax und Wortwahl, dennoch kohärent und präzise.',
  },
};

export function getLevelProfile(level?: LevelId | null): LevelProfile | null {
  if (!level) return null;
  return LEVEL_PROFILES[level] ?? null;
}
