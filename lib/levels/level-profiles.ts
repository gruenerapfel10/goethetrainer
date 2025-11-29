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
  lexicon?: {
    avoid?: string[];
    prefer?: string[];
  };
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
    lexicon: {
      avoid: [
        'Regierung',
        'Politik',
        'Behörde',
        'Forschung',
        'Technologie',
        'Daten',
        'Analyse',
        'Mission',
        'Algorithmus',
        'Sensor',
        'Drohne',
        'Mars',
        'Korruption',
      ],
      prefer: ['Schule', 'Essen', 'Familie', 'Stadt', 'Bus', 'Bahn', 'Wetter', 'Sport', 'Arzt', 'Einkaufen'],
    },
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
    questionCount: 5,
    gapCount: 5,
    lexicon: {
      avoid: ['Korruption', 'Ministerium', 'Haushalt', 'Plenarsaal', 'Sensor', 'Drohne', 'Algorithmus', 'Labor', 'Mars', 'Orbiter'],
      prefer: ['Arbeit', 'Freizeit', 'Reise', 'Einkaufen', 'Schule', 'Familie', 'Wetter', 'Sport', 'Park', 'Bahn'],
    },
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
    lexicon: {
      avoid: [
        'Gesetz',
        'Reform',
        'Bundestag',
        'Paket',
        'Fahrplan',
        'Haushalt',
        'Prävention',
        'Ökonomie',
        'Konjunktur',
        'Konferenz',
        'Minister',
        'Rentenpaket',
        'Tarifrunde',
        'Regierung',
        'Verordnung',
      ],
      prefer: [
        'Arbeit',
        'Gesundheit im Alltag',
        'Schule',
        'Familie',
        'Reisen',
        'Sport',
        'Stadt',
        'Wetter',
        'Freizeit',
      ],
    },
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
    questionCount: 7,
    gapCount: 7,
    lexicon: {
      avoid: [
        'Haftzentrum',
        'Misshandlung',
        'Audit',
        'Einspruch',
        'Verordnung',
        'Ministerium',
        'Gesetzesentwurf',
        'Haushaltsplan',
        'Legitimität',
        'Sicherheitsinteressen',
        'Verletzung von Menschenrechten',
        'Fristen',
        'Gremium',
        'Formalisierung',
        'nominalisierung',
        'komplexe Theorie',
        'abstrakte Begriffe',
        'nachvollziehbare Kostenmodelle',
        'verantwortliche Updates',
        'registrierung',
        'plattformfunktionen',
        'evidenz',
        'evaluierung',
        'experten warnen',
        'Ausnahmezustand',
        'handlungsfähig',
        'Krisenlage',
        'Ersatz bieten',
        'verankert',
        'Rahmen',
        'restriktiv',
        'implementieren',
        'verpflichtend',
        'stark formal',
        'geänderte Bezahlung',
        'Verdienste unsicher',
        'im Hintergrund kommend',
        'langkettige Nebensätze',
        'Konjunktur',
        'Planungssicherheit',
        'Entlastungen',
        'Förderprogramme',
        'Genehmigungen',
        'mittelständische Betriebe',
        'Energiepreise',
        'inflationsbedingt',
        'Regulierung',
        'Fachkräftemangel',
        'Parteitag',
        'Wirtschaftslage',
        'Preisschub',
        'Preisdämpfung',
      ],
      prefer: [
        'Alltagstechnik',
        'Datenschutz im Alltag',
        'Apps',
        'Geräte',
        'Arbeit',
        'Gesundheit',
        'Reise',
        'Stadt',
        'Schule',
        'Freizeit',
        'Online Lernen',
        'Videos',
        'News Magazin',
        'Alltagsbeispiele',
      ],
    },
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
    questionCount: 7,
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
