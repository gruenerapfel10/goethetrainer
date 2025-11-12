import { LevelId, type LevelProfile } from './types';
import {
  SessionTypeEnum,
  type SessionLayoutDefinition,
  type SessionLayoutEntryConfig,
} from '@/lib/sessions/session-registry';
import { QuestionModuleId } from '@/lib/questions/modules/types';
import type { StatementMatchSourceConfig } from '@/lib/questions/modules/statement-match-types';

const buildReadingTeil = (
  id: string,
  label: string,
  questionCount: number,
  overrides: Partial<SessionLayoutEntryConfig['sourceOverrides']> = {}
): SessionLayoutEntryConfig => ({
  id,
  label,
  moduleId: QuestionModuleId.MULTIPLE_CHOICE,
  questionCount,
  renderOverrides: {
    layout: 'vertical',
    showSourceToggle: true,
  },
  sourceOverrides: {
    type: 'text_passage',
    questionCount,
    optionsPerQuestion: 3,
    ...overrides,
  },
  scoringOverrides: {
    maxPoints: questionCount,
    strategy: 'single_select',
  },
});

const buildStatementMatchTeil = (
  id: string,
  label: string,
  statementCount: number,
  overrides: Partial<StatementMatchSourceConfig> = {}
): SessionLayoutEntryConfig => ({
  id,
  label,
  moduleId: QuestionModuleId.STATEMENT_MATCH,
  questionCount: 1,
  sourceOverrides: {
    type: 'statement_matching',
    authorCount: Math.max(3, Math.ceil(statementCount / 2)),
    statementCount,
    unmatchedCount: overrides?.unmatchedCount ?? 0,
    ...overrides,
  },
  scoringOverrides: {
    maxPoints: statementCount - (overrides?.unmatchedCount ?? 0),
    strategy: 'per_gap',
  },
});

const withLayoutOverrides = (
  entry: SessionLayoutEntryConfig,
  overrides?: {
    renderOverrides?: Record<string, any>;
    metadata?: Record<string, any>;
  }
): SessionLayoutEntryConfig => ({
  ...entry,
  renderOverrides: {
    ...(entry.renderOverrides ?? {}),
    ...(overrides?.renderOverrides ?? {}),
  },
  metadata: {
    ...(entry.metadata ?? {}),
    ...(overrides?.metadata ?? {}),
  },
});

const buildListeningTeil = (
  id: string,
  label: string,
  questionCount: number,
  overrides: Partial<SessionLayoutEntryConfig['sourceOverrides']> = {}
): SessionLayoutEntryConfig => ({
  id,
  label,
  moduleId: QuestionModuleId.MULTIPLE_CHOICE,
  questionCount,
  renderOverrides: {
    layout: 'vertical',
    showAudioControls: true,
  },
  sourceOverrides: {
    type: 'audio_passage',
    questionCount,
    optionsPerQuestion: 3,
    playback: {
      allowPause: true,
      allowSeek: false,
      allowRestart: true,
      allowScrubbing: false,
      allowSpeedChange: false,
    },
    ...overrides,
  },
  scoringOverrides: {
    maxPoints: questionCount,
    strategy: 'single_select',
  },
});

const buildWritingTeil = (
  id: string,
  label: string,
  wordGuide: { min: number; target: number },
  config: {
    taskKind?: 'formal_letter' | 'opinion_article';
    tone?: 'formal' | 'neutral' | 'personal';
    contextTheme?: string;
    points?: number;
  } = {}
): SessionLayoutEntryConfig => ({
  id,
  label,
  moduleId: QuestionModuleId.WRITTEN_RESPONSE,
  questionCount: 1,
  metadata: {
    points: config.points ?? 10,
  },
  renderOverrides: {
    layout: 'writing',
    showSourceToggle: true,
  },
  sourceOverrides: {
    type: 'writing_prompt',
    taskKind: config.taskKind ?? 'formal_letter',
    tone: config.tone ?? 'neutral',
    contextTheme: config.contextTheme ?? 'Alltag',
    wordGuide,
  },
  scoringOverrides: {
    maxPoints: config.points ?? 10,
    strategy: 'ai',
  },
});

const READING_LAYOUTS: Partial<Record<LevelId, SessionLayoutDefinition>> = {
  [LevelId.A1]: [
    buildReadingTeil('teil_1', 'Teil 1', 5, { constructionMode: 'short_notes' }),
    buildReadingTeil('teil_2', 'Teil 2', 5, { constructionMode: 'simple_dialogue' }),
    buildStatementMatchTeil('teil_3', 'Teil 3', 5, { unmatchedCount: 0 }),
  ],
  [LevelId.A2]: [
    withLayoutOverrides(
      buildStatementMatchTeil('teil_1', 'Teil 1', 5, {
        constructionMode: 'planned_authors',
        authorCount: 2,
        statementCount: 5,
        unmatchedCount: 0,
        topicHint: 'Zwei kurze Alltagstexte (z. B. Hinweis + Nachricht).',
        registerHint: 'Einfache Alltagssprache, kurze Sätze.',
      }),
      {
        renderOverrides: {
          workingTime: '10 Minuten',
          summary:
            'Sie lesen zwei kurze Texte (A und B). Ordnen Sie die Aussagen 1–5 dem richtigen Text zu.',
        },
      }
    ),
    withLayoutOverrides(
      buildReadingTeil('teil_2', 'Teil 2', 5, {
        optionsPerQuestion: 2,
        constructionMode: 'true_false_notice',
        optionLabels: ['Richtig', 'Falsch'],
      }),
      {
        renderOverrides: {
          workingTime: '10 Minuten',
          summary: 'Sie lesen einen kurzen Text. Kreuzen Sie bei 6–10 an: Richtig oder Falsch.',
        },
      }
    ),
    withLayoutOverrides(
      buildStatementMatchTeil('teil_3', 'Teil 3', 5, {
        constructionMode: 'planned_authors',
        authorCount: 5,
        statementCount: 5,
        unmatchedCount: 0,
        topicHint: 'Kurzprofile von Personen mit Interessen/Angeboten.',
        registerHint: 'freundlich, knapp, Alltag.',
      }),
      {
        renderOverrides: {
          workingTime: '10 Minuten',
          summary:
            'Sie lesen fünf Kleinanzeigen oder Kurzprofile. Ordnen Sie die Aussagen den richtigen Personen zu.',
        },
      }
    ),
    withLayoutOverrides(
      buildReadingTeil('teil_4', 'Teil 4', 5, {
        constructionMode: 'article_multiple_choice',
        theme: 'Freizeit & Alltag',
      }),
      {
        renderOverrides: {
          workingTime: '15 Minuten',
          summary:
            'Sie lesen einen Artikel. Wählen Sie für jede Frage 21–25 die richtige Antwort a, b oder c.',
        },
      }
    ),
  ],
  [LevelId.B1]: [
    buildReadingTeil('teil_1', 'Teil 1', 6, { constructionMode: 'correspondence' }),
    buildReadingTeil('teil_2', 'Teil 2', 6, { constructionMode: 'articles' }),
    buildStatementMatchTeil('teil_3', 'Teil 3', 7, { unmatchedCount: 1 }),
    buildReadingTeil('teil_4', 'Teil 4', 7, { constructionMode: 'argumentation', optionsPerQuestion: 2 }),
    buildReadingTeil('teil_5', 'Teil 5', 4, { constructionMode: 'instructions' }),
  ],
  [LevelId.B2]: [
    buildStatementMatchTeil('teil_1', 'Teil 1', 9, { unmatchedCount: 1 }),
    buildReadingTeil('teil_2', 'Teil 2', 6, { constructionMode: 'information_match' }),
    buildReadingTeil('teil_3', 'Teil 3', 6, { constructionMode: 'argumentation' }),
    buildStatementMatchTeil('teil_4', 'Teil 4', 6, { unmatchedCount: 1 }),
    buildReadingTeil('teil_5', 'Teil 5', 3, { constructionMode: 'rules' }),
  ],
  [LevelId.C2]: [
    buildReadingTeil('teil_1', 'Teil 1', 10, { constructionMode: 'commentary', optionsPerQuestion: 4 }),
    buildReadingTeil('teil_2', 'Teil 2', 6, { constructionMode: 'essays', optionsPerQuestion: 4 }),
    buildStatementMatchTeil('teil_3', 'Teil 3', 6, { unmatchedCount: 1 }),
    buildReadingTeil('teil_4', 'Teil 4', 4, { constructionMode: 'critique', optionsPerQuestion: 4 }),
  ],
};

const LISTENING_LAYOUTS: Partial<Record<LevelId, SessionLayoutDefinition>> = {
  [LevelId.A1]: [
    buildListeningTeil('teil_1', 'Teil 1', 5, { scenario: 'Kurze Ansagen', speakerCount: 1 }),
    buildListeningTeil('teil_2', 'Teil 2', 5, { scenario: 'Alltagsdialoge', speakerCount: 2 }),
    buildListeningTeil('teil_3', 'Teil 3', 5, { scenario: 'Radioausschnitte', speakerCount: 1 }),
  ],
  [LevelId.A2]: [
    buildListeningTeil('teil_1', 'Teil 1', 6, { scenario: 'Ansagen am Bahnhof', speakerCount: 1 }),
    buildListeningTeil('teil_2', 'Teil 2', 6, { scenario: 'Gespräche im Alltag', speakerCount: 2 }),
    buildListeningTeil('teil_3', 'Teil 3', 6, { scenario: 'Telefonische Informationen', speakerCount: 2 }),
    buildListeningTeil('teil_4', 'Teil 4', 6, { scenario: 'Radiointerview', speakerCount: 2 }),
  ],
  [LevelId.B1]: [
    buildListeningTeil('teil_1', 'Teil 1', 10, { scenario: 'Durchsagen und Anweisungen', speakerCount: 1 }),
    buildListeningTeil('teil_2', 'Teil 2', 5, { scenario: 'Podiumsgespräch', speakerCount: 3 }),
    buildListeningTeil('teil_3', 'Teil 3', 7, { scenario: 'Dialoge aus dem Alltag', speakerCount: 2 }),
    buildListeningTeil('teil_4', 'Teil 4', 8, { scenario: 'Radiobeitrag', speakerCount: 2 }),
  ],
  [LevelId.B2]: [
    buildListeningTeil('teil_1', 'Teil 1', 5, { scenario: 'Live-Statements', speakerCount: 2 }),
    buildListeningTeil('teil_2', 'Teil 2', 6, { scenario: 'Interview mit Expert/in', speakerCount: 2 }),
    buildListeningTeil('teil_3', 'Teil 3', 6, { scenario: 'Diskussion mit mehreren Rollen', speakerCount: 3 }),
    buildListeningTeil('teil_4', 'Teil 4', 8, { scenario: 'Vortrag / Kommentar', speakerCount: 1 }),
  ],
  [LevelId.C2]: [
    buildListeningTeil('teil_1', 'Teil 1', 10, { scenario: 'Radiokommentar', speakerCount: 2 }),
    buildListeningTeil('teil_2', 'Teil 2', 6, { scenario: 'Fachinterview', speakerCount: 2 }),
    buildListeningTeil('teil_3', 'Teil 3', 8, { scenario: 'Diskussion mit mehreren Personen', speakerCount: 4 }),
  ],
};

const WRITING_LAYOUTS: Partial<Record<LevelId, SessionLayoutDefinition>> = {
  [LevelId.A1]: [
    buildWritingTeil('teil_1', 'Teil 1', { min: 20, target: 40 }, { taskKind: 'formal_letter', tone: 'personal', contextTheme: 'Freizeit', points: 5 }),
    buildWritingTeil('teil_2', 'Teil 2', { min: 30, target: 50 }, { taskKind: 'opinion_article', tone: 'personal', contextTheme: 'Reisen', points: 5 }),
  ],
  [LevelId.A2]: [
    buildWritingTeil('teil_1', 'Teil 1', { min: 50, target: 80 }, { taskKind: 'formal_letter', tone: 'neutral', contextTheme: 'Nachbarschaft', points: 6 }),
    buildWritingTeil('teil_2', 'Teil 2', { min: 60, target: 90 }, { taskKind: 'opinion_article', tone: 'personal', contextTheme: 'Arbeit & Schule', points: 6 }),
  ],
  [LevelId.B1]: [
    buildWritingTeil('teil_1', 'Teil 1', { min: 80, target: 110 }, { taskKind: 'formal_letter', tone: 'neutral', contextTheme: 'Freunde & Familie', points: 6 }),
    buildWritingTeil('teil_2', 'Teil 2', { min: 90, target: 130 }, { taskKind: 'opinion_article', tone: 'personal', contextTheme: 'Gesellschaft', points: 6 }),
    buildWritingTeil('teil_3', 'Teil 3', { min: 70, target: 100 }, { taskKind: 'formal_letter', tone: 'formal', contextTheme: 'Beschwerde', points: 6 }),
  ],
  [LevelId.B2]: [
    buildWritingTeil('teil_1', 'Teil 1', { min: 180, target: 230 }, { taskKind: 'opinion_article', tone: 'neutral', contextTheme: 'Gesellschaft & Politik', points: 8 }),
    buildWritingTeil('teil_2', 'Teil 2', { min: 130, target: 180 }, { taskKind: 'formal_letter', tone: 'formal', contextTheme: 'Arbeitswelt', points: 7 }),
  ],
  [LevelId.C2]: [
    buildWritingTeil('teil_1', 'Teil 1', { min: 250, target: 320 }, { taskKind: 'opinion_article', tone: 'formal', contextTheme: 'Akademische Debatten', points: 10 }),
    buildWritingTeil('teil_2', 'Teil 2', { min: 200, target: 280 }, { taskKind: 'formal_letter', tone: 'formal', contextTheme: 'Institutionen & Politik', points: 10 }),
  ],
};

export const ALL_LEVEL_IDS: LevelId[] = [
  LevelId.A1,
  LevelId.A2,
  LevelId.B1,
  LevelId.B2,
  LevelId.C1,
  LevelId.C2,
];

export const LEVEL_PROFILE_REGISTRY: Record<LevelId, LevelProfile> = {
  [LevelId.A1]: {
    id: LevelId.A1,
    label: 'Fundament (A1)',
    alias: 'Everyday Basics',
    description:
      'Bewältigt elementare Alltagssituationen mit kurzen, klaren Aussagen und vertrauten Routinen – fokussiert auf Zahlen, Zeiten, persönliche Daten und direkte Bedürfnisse.',
    difficultyRank: 1,
    languageGoals: [
      'Ein-Wort- und Zwei-Wort-Antworten sicher geben',
      'Persönliche Daten verstehen und nennen',
      'Direkte, gut bekannte Routinen bewältigen',
    ],
    reading: {
      textLength: { min: 40, max: 120, unit: 'words' },
      lexicalRange: 'Grundwortschatz (A1), internationale Wörter, visuelle Hilfen',
      grammarFocus: ['einfache Hauptsätze', 'kein Nebensatzgebrauch', 'höchstens ein Satz pro Information'],
      taskDescriptors: ['Hinweisschilder', 'Formulare', 'kurze Dialoge'],
      register: 'alltäglich, freundlich, neutral',
    },
    listening: {
      textLength: { min: 20, max: 60, unit: 'seconds' },
      speed: 'slow',
      speakerConfig: '1 Sprecher/in, klare Artikulation, lange Pausen',
      lexicalRange: 'bekannte Wörter, Zahlen, Uhrzeiten',
      taskDescriptors: ['Durchsagen mit Kerninfos', 'Mini-Dialoge (Frage/Antwort)'],
    },
    writing: {
      targetWords: 30,
      textLength: { min: 20, max: 60, unit: 'words' },
      lexicalRange: 'persönliche Daten, einfache Substantiv-Verb-Kombinationen',
      grammarFocus: ['Ich-Form', 'Fixformeln', 'ohne Nebensätze'],
      taskDescriptors: ['Formularfelder', 'kurze Notiz', 'Postkarte'],
      register: 'informell bis neutral',
      cohesionExpectations: ['Aufzählung durch Zeilen', 'keine Konnektoren notwendig'],
    },
    speaking: {
      discourseMoves: ['sich vorstellen', 'Zahlen nennen', 'Bitte äußern'],
      grammarFocus: ['Hauptsätze mit Verb-zweiter-Stellung'],
      register: 'höflich-neutral',
      taskDescriptors: ['Rollenkarten mit festen Fragen', 'optische Reize (z. B. Piktogramme)'],
    },
    aiDirectives: {
      registerHint: 'Verwende ausschließlich sehr einfache, klare Alltagssprache ohne Idiome.',
      lexicalControls:
        'Nutze Grundwortschatz (A1), vermeide trennbare Verbkombinationen und geliehene Fremdwörter.',
      grammarControls: 'Schreibe ausschließlich einfache Hauptsätze ohne Nebensätze oder Partizipialkonstruktionen.',
      errorTolerance: 'Lasse kleinere Wiederholungen zu; vermeide jede Form von Mehrdeutigkeit.',
    },
    layouts: {
      [SessionTypeEnum.READING]: READING_LAYOUTS[LevelId.A1],
      [SessionTypeEnum.LISTENING]: LISTENING_LAYOUTS[LevelId.A1],
      [SessionTypeEnum.WRITING]: WRITING_LAYOUTS[LevelId.A1],
    },
  },
  [LevelId.A2]: {
    id: LevelId.A2,
    label: 'Routine (A2)',
    alias: 'Guided Interaction',
    description:
      'Bewältigt vertraute Routinen mit kurzen Dialogen, kann einfache Beschreibungen liefern und reagiert auf direkte Informationsanfragen.',
    difficultyRank: 2,
    languageGoals: [
      'Häufige Ausdrücke verstehen und nutzen',
      'Kurze, zusammenhängende Sätze bilden',
      'Persönliche Erlebnisse beschreiben',
    ],
    reading: {
      textLength: { min: 80, max: 180, unit: 'words' },
      lexicalRange: 'häufige Alltagsszenarien (Einkauf, Schule, Arbeit, Freizeit)',
      grammarFocus: ['einfache Nebensätze mit weil, dass', 'Modalverben in Präsens'],
      taskDescriptors: ['Infotafeln', 'kurze E-Mails', 'Forumseinträge mit einer Kernaussage'],
      register: 'informell bis halbformell',
    },
    listening: {
      textLength: { min: 40, max: 90, unit: 'seconds' },
      speed: 'slow',
      speakerConfig: '1–2 Sprecher/innen, klarer Standard, leichte Hintergrundgeräusche möglich',
      lexicalRange: 'Vertraute Themen, wiederholte Schlüsselwörter',
      taskDescriptors: ['Durchsagen plus Reaktion', 'kurze Gespräche mit Zielhandlung'],
    },
    writing: {
      targetWords: 80,
      textLength: { min: 60, max: 120, unit: 'words' },
      lexicalRange: 'Alltagsbegriffe, einfache Kollokationen',
      grammarFocus: ['verbundene Hauptsätze mit und/aber', 'erste Nebensatzketten'],
      taskDescriptors: ['E-Mail mit kurzem Anliegen', 'Erfahrungsbericht', 'formlose Einladung'],
      register: 'informell-zugewandt',
      cohesionExpectations: ['Basis-Konnektoren wie und, aber, weil'],
    },
    speaking: {
      discourseMoves: ['Antwort geben, Rückfragen stellen, kurze Beschreibungen liefern'],
      register: 'freundlich-neutral',
      taskDescriptors: ['Rollenspiel mit Routinehandlungen', 'Bildbeschreibung mit Details'],
    },
    aiDirectives: {
      registerHint: 'Nutze klare Umgangssprache mit einfachen Erweiterungen (weil, dass).',
      lexicalControls: 'Verwende häufige Alltagssynonyme und anschauliche Substantive.',
      grammarControls: 'Baue kurze Nebensätze ein, verzichte auf Passiv und komplexe Nominalphrasen.',
      errorTolerance: 'Fehler dürfen auftreten, solange Kerninformation eindeutig bleibt.',
    },
    layouts: {
      [SessionTypeEnum.READING]: READING_LAYOUTS[LevelId.A2],
      [SessionTypeEnum.LISTENING]: LISTENING_LAYOUTS[LevelId.A2],
      [SessionTypeEnum.WRITING]: WRITING_LAYOUTS[LevelId.A2],
    },
  },
  [LevelId.B1]: {
    id: LevelId.B1,
    label: 'Selbstständigkeit (B1)',
    alias: 'Connected Discourse',
    description:
      'Kann klare Standardsprache zu vertrauten Themen verstehen und verwenden, bewältigt Reisen, Arbeitssituationen und persönliche Erzählungen mit einfachen Argumenten.',
    difficultyRank: 3,
    languageGoals: [
      'Hauptinformationen aus Alltagstexten verstehen',
      'Zusammenhängend über bekannte Themen schreiben und sprechen',
      'Einfache Argumentationen aufbauen',
    ],
    reading: {
      textLength: { min: 180, max: 350, unit: 'words' },
      lexicalRange: 'Standardsprache zu Arbeit, Freizeit, Reisen',
      grammarFocus: ['Zeitformen Präsens/Präteritum/Perfekt', 'erweiterte Nebensatzstrukturen', 'Konjunktiv II Basis'],
      taskDescriptors: ['Forenthreads', 'Einfache Reportagen', 'Anleitungen'],
      register: 'standard, klar',
    },
    listening: {
      textLength: { min: 60, max: 150, unit: 'seconds' },
      speed: 'moderate',
      speakerConfig: '2 Sprecher/innen, normale Sprechgeschwindigkeit, leichte Überlappung',
      lexicalRange: 'Standardsprache mit begrenzten Fachbegriffen',
      taskDescriptors: ['Interviews', 'Radiobeiträge mit Kernargument'],
    },
    writing: {
      targetWords: 150,
      textLength: { min: 120, max: 180, unit: 'words' },
      lexicalRange: 'Vertraute Themen mit einfachen Meinungsäußerungen',
      grammarFocus: ['Vergleiche, finale Nebensätze, Modalpartikeln (ja, doch) optional'],
      taskDescriptors: ['Meinungsbeitrag', 'formlose Beschwerde', 'Erlebnisbericht'],
      register: 'informell bis halbformell',
      cohesionExpectations: ['Verwende Konnektoren wie deshalb, trotzdem, zuerst/dann'],
    },
    speaking: {
      discourseMoves: ['Argument nennen', 'Beispiel geben', 'Rückfrage stellen'],
      register: 'standardnah',
      taskDescriptors: ['Gemeinsame Planung', 'Monolog mit persönlichem Bezug'],
    },
    aiDirectives: {
      registerHint: 'Nutze klare Standardsprache mit einfachen idiomatischen Wendungen.',
      lexicalControls: 'Führe thematische Wortfelder ein (Arbeit, soziale Medien, Reisen).',
      grammarControls: 'Setze erweiterte Nebensätze (weil, obwohl, damit) und Perfekt/Präteritum im Wechsel ein.',
      errorTolerance: 'Leichte stilistische Unebenheiten erlaubt, aber keine grundlegenden Grammatikfehler.',
    },
    layouts: {
      [SessionTypeEnum.READING]: READING_LAYOUTS[LevelId.B1],
      [SessionTypeEnum.LISTENING]: LISTENING_LAYOUTS[LevelId.B1],
      [SessionTypeEnum.WRITING]: WRITING_LAYOUTS[LevelId.B1],
    },
  },
  [LevelId.B2]: {
    id: LevelId.B2,
    label: 'Kompetenz (B2)',
    alias: 'Structured Argument',
    description:
      'Versteht komplexere Sachtexte und Gespräche, kann strukturierte Argumentationen schriftlich und mündlich leisten und sich zu abstrakten Themen äußern.',
    difficultyRank: 4,
    languageGoals: [
      'Haupt- und Detailinformationen in komplexeren Texten erfassen',
      'Argumentative Texte verfassen',
      'Aktiv an Diskussionen teilnehmen und Position beziehen',
    ],
    reading: {
      textLength: { min: 300, max: 600, unit: 'words' },
      lexicalRange: 'breite Palette an Themen inkl. abstrakte Begriffe',
      grammarFocus: ['Passiv, Nominalisierungen, erweiterter Konjunktiv II'],
      taskDescriptors: ['Debattenbeiträge', 'Sachtexte mit Argumentationsstruktur', 'Regeltexte'],
      register: 'standard bis fachlich neutral',
    },
    listening: {
      textLength: { min: 120, max: 240, unit: 'seconds' },
      speed: 'moderate',
      speakerConfig: '2–3 Sprecher/innen, natürliche Geschwindigkeit, Fachbegriffe erklärt',
      lexicalRange: 'Abstrakte Themen, Metaphern begrenzt',
      taskDescriptors: ['Podcasts', 'Radiofeatures', 'Diskussionen'],
    },
    writing: {
      targetWords: 220,
      textLength: { min: 180, max: 260, unit: 'words' },
      lexicalRange: 'argumentative Lexik, abstrakte Nomen',
      grammarFocus: ['Komplexe Nebensätze, Passiv, indirekte Rede optional'],
      taskDescriptors: ['Leserbrief mit Argumenten', 'Structured Essay', 'formelle E-Mail'],
      register: 'halbformell bis formal',
      cohesionExpectations: ['Konnektoren: zudem, dennoch, folglich, allerdings'],
    },
    speaking: {
      discourseMoves: ['These entwickeln', 'Gegenargument adressieren', 'Zusammenfassen'],
      register: 'standard bis leicht fachlich',
      taskDescriptors: ['Kurzvortrag', 'Debatte im Tandem'],
    },
    aiDirectives: {
      registerHint: 'Schreibe in klarer Standardsprache mit strukturierter Argumentation.',
      lexicalControls: 'Nutze themenspezifische Kollokationen, vermeide Umgangssprache.',
      grammarControls: 'Setze Passiv, Infinitivgruppen und konditionale Nebensätze selbstverständlich ein.',
      errorTolerance: 'Nur sehr geringe Fehlerquote; Inhalte müssen kohärent und logisch sein.',
    },
    layouts: {
      [SessionTypeEnum.READING]: READING_LAYOUTS[LevelId.B2],
      [SessionTypeEnum.LISTENING]: LISTENING_LAYOUTS[LevelId.B2],
      [SessionTypeEnum.WRITING]: WRITING_LAYOUTS[LevelId.B2],
    },
  },
  [LevelId.C1]: {
    id: LevelId.C1,
    label: 'Souveränität (C1)',
    alias: 'Academic Control',
    description:
      'Versteht anspruchsvolle Texte inkl. impliziter Bedeutungen, kann längere Beiträge verfassen und fast mühelos an Diskussionen teilnehmen.',
    difficultyRank: 5,
    languageGoals: [
      'Implizite Bedeutungen und Nuancen erkennen',
      'Komplexe Sachverhalte klar strukturieren',
      'Überzeugend argumentieren',
    ],
    reading: {
      textLength: { min: 500, max: 900, unit: 'words' },
      lexicalRange: 'akademische Standardsprache, gehobene Register',
      grammarFocus: ['Nominalstil, Partizipialkonstruktionen, Konjunktiv I/II'],
      taskDescriptors: ['Kommentare, wissenschaftliche Artikel, Reportagen'],
      register: 'formal bis akademisch',
    },
    listening: {
      textLength: { min: 180, max: 300, unit: 'seconds' },
      speed: 'moderate',
      speakerConfig: '3 Sprecher/innen, Diskussionen, Fachgespräche',
      lexicalRange: 'Abstrakte Themen, Fachbegriffe ohne Erklärung',
      taskDescriptors: ['Radiodebatten', 'Fachinterviews'],
    },
    writing: {
      targetWords: 300,
      textLength: { min: 230, max: 320, unit: 'words' },
      lexicalRange: 'nuancierte Ausdrücke, präzise Terminologie',
      grammarFocus: ['Nominalisierung, komplexe Satzverschachtelung, Konnektorenkombinationen'],
      taskDescriptors: ['Diskussionsbeitrag mit Leitfragen', 'analytische E-Mail'],
      register: 'formal/akademisch',
      cohesionExpectations: ['Verknüpfung durch anspruchsvolle Konnektoren (zumal, insofern, wohingegen)'],
    },
    speaking: {
      discourseMoves: ['Hypothesen formulieren', 'implizite Kritik äußern', 'Nachfragen parieren'],
      register: 'professionell',
      taskDescriptors: ['Vortrag + Nachfragen', 'kontroverse Diskussion'],
    },
    aiDirectives: {
      registerHint: 'Nutze elaborierte Standardsprache mit akademischen Strukturen.',
      lexicalControls: 'Setze abstrahierende Nomen und sachliche Terminologie ein.',
      grammarControls: 'Verwende Nominalstil, gehäufte Nebensätze, Partizipialattribute.',
      errorTolerance: 'Fehlerfrei bis auf seltene, stilistisch motivierte Abweichungen.',
    },
  },
  [LevelId.C2]: {
    id: LevelId.C2,
    label: 'Meisterschaft (C2)',
    alias: 'Near-Native Nuance',
    description:
      'Kann praktisch alles, was er/sie liest oder hört, mühelos verstehen, Informationen zusammenfassen und sich spontan, sehr flüssig und präzise ausdrücken.',
    difficultyRank: 6,
    languageGoals: [
      'Hohe Geschwindigkeit bei Verarbeitung komplexer Inhalte',
      'Nuancierte Stil- und Registerwechsel',
      'Kritisches Analysieren und Bewerten',
    ],
    reading: {
      textLength: { min: 700, max: 1200, unit: 'words' },
      lexicalRange: 'vielfältige Register inkl. Idiome, Ironie, Anspielungen',
      grammarFocus: ['stilistische Variation, elliptische Strukturen, rhetorische Mittel'],
      taskDescriptors: ['Leitartikel, Essays, Kolumnen mit Untertönen'],
      register: 'flexibel (journalistisch, akademisch, literarisch)',
    },
    listening: {
      textLength: { min: 240, max: 360, unit: 'seconds' },
      speed: 'native',
      speakerConfig: 'Mehrere Sprecher/innen, Überschneidungen, Dialekt-/Akzentspuren möglich',
      lexicalRange: 'Metaphern, Ironie, kulturbezogene Referenzen',
      taskDescriptors: ['Podiumsdiskussionen', 'satirische Beiträge'],
    },
    writing: {
      targetWords: 350,
      textLength: { min: 280, max: 380, unit: 'words' },
      lexicalRange: 'gehobene, idiomatische Sprache, Fachtermini je nach Thema',
      grammarFocus: ['Stilistische Variation, komplexe Syntax, rhetorische Mittel'],
      taskDescriptors: ['Essay mit kritischer Bewertung', 'Stellungnahme mit Synthese mehrerer Quellen'],
      register: 'adressatenspezifisch (akademisch, feuilletonistisch, fachlich)',
      cohesionExpectations: ['Fein abgestufte Konnektoren, variierte Satzrhythmen'],
    },
    speaking: {
      discourseMoves: ['spontan paraphrasieren', 'subtile Ironie erkennen/verwenden', 'Intertextualität'],
      register: 'flexibel (von akademisch bis idiomatisch)',
      taskDescriptors: ['Freie Diskussion mit Fokus auf Nuancen', 'Impulsvortrag mit kritischer Analyse'],
    },
    aiDirectives: {
      registerHint: 'Nutze nahezu muttersprachliche Präzision mit Registerwechseln.',
      lexicalControls: 'Arbeite mit idiomatischen Wendungen, kulturspezifischen Referenzen und präzisen Fachtermini.',
      grammarControls: 'Variiere Satzlängen, nutze Ellipsen, Chiasmus, indirekte Rede und Modalpartikeln.',
      errorTolerance: 'Praktisch fehlerfrei, Nuancen gehen vor Vereinfachung.',
    },
    layouts: {
      [SessionTypeEnum.READING]: READING_LAYOUTS[LevelId.C2],
      [SessionTypeEnum.LISTENING]: LISTENING_LAYOUTS[LevelId.C2],
      [SessionTypeEnum.WRITING]: WRITING_LAYOUTS[LevelId.C2],
    },
  },
};

export const DEFAULT_LEVEL_ID = LevelId.C1;

export function getLevelProfile(levelId?: LevelId | null): LevelProfile {
  if (!levelId) {
    return LEVEL_PROFILE_REGISTRY[DEFAULT_LEVEL_ID];
  }
  return LEVEL_PROFILE_REGISTRY[levelId] ?? LEVEL_PROFILE_REGISTRY[DEFAULT_LEVEL_ID];
}

export { LevelId, type LevelProfile } from './types';
export { mapLevelToQuestionDifficulty } from './utils';
export { buildLevelDirective } from './directives';
