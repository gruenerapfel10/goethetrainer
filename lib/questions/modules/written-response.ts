import { generateObject } from 'ai';
import { z } from 'zod';
import { SessionTypeEnum } from '@/lib/sessions/session-registry';
import {
  QuestionDifficulty,
  QuestionInputType,
  QuestionType,
  type Question,
} from '@/lib/sessions/questions/question-types';
import {
  QuestionModuleId,
  type QuestionModule,
  type QuestionModulePromptConfig,
  type QuestionModuleRenderConfig,
  type QuestionModuleSourceConfig,
} from './types';
import { customModel } from '@/lib/ai/models';
import { ModelId } from '@/lib/ai/model-registry';
import { markQuestionWithAI } from '@/lib/sessions/questions/standard-marker';

interface WritingPromptConfig extends QuestionModulePromptConfig {
  instructions?: string;
}

interface WritingRenderConfig extends QuestionModuleRenderConfig {
  layout: 'writing';
  showSourceToggle: boolean;
}

interface WritingSourceConfig extends QuestionModuleSourceConfig {
  type: 'writing_prompt';
  taskKind: 'formal_letter' | 'opinion_article';
  tone: 'formal' | 'neutral' | 'personal';
  contextTheme?: string;
  wordGuide: {
    min: number;
    target: number;
  };
}

interface WritingAnswerContext {
  question: Question;
  answer: string | null;
}

const DEFAULT_MODEL = customModel(ModelId.CLAUDE_HAIKU_4_5);

const DEFAULT_WRITING_RUBRIC = [
  {
    id: 'content',
    label: 'Inhalt & Aufgabenbezug',
    description: 'Alle Stichpunkte werden adressiert, klare Argumentation, kohärente Beispiele.',
    maxPoints: 6,
    guidance: 'Bewerte, ob die Antwort sämtliche Aufgabenbestandteile abdeckt und relevante Details bietet.',
  },
  {
    id: 'structure',
    label: 'Aufbau & Kohäsion',
    description: 'Logische Gliederung (Einleitung, Hauptteil, Schluss), sinnvolle Absätze, Verknüpfungen.',
    maxPoints: 4,
    guidance: 'Achte auf Übergänge, rote Faden und angemessene Länge der Abschnitte.',
  },
  {
    id: 'language',
    label: 'Sprache & Grammatik',
    description: 'Korrekte Grammatik, differenzierter Wortschatz, passende Register.',
    maxPoints: 3,
    guidance: 'Gewichte Fehler nach Schweregrad; wiederholte Fehler reduzieren Punkte.',
  },
  {
    id: 'register',
    label: 'Register & Format',
    description: 'Adressatengerechter Ton, passende Einleitungen/Schlussformeln, ggf. formale Elemente.',
    maxPoints: 2,
    guidance: 'Prüfe, ob der Text als Leserbrief bzw. Stellungnahme glaubwürdig wirkt.',
  },
] as const;

const WritingPromptSchema = z.object({
  theme: z.string(),
  contextTitle: z.string(),
  contextBody: z.string(),
  scenario: z.string(),
  communicationGoal: z.string(),
  audience: z.string(),
  tasks: z.array(z.string()).min(2),
  referenceNotes: z.array(z.string()).min(2).max(5),
  keywords: z.array(z.string()).max(8).optional(),
  closingRemark: z.string(),
});

function resolveQuestionType(sessionType: SessionTypeEnum): QuestionType {
  if (sessionType === SessionTypeEnum.WRITING) {
    return QuestionType.WRITING_PROMPT;
  }
  return QuestionType.WRITING_PROMPT;
}

function normaliseAnswer(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object' && 'text' in value) {
    const extracted = (value as Record<string, unknown>).text;
    return typeof extracted === 'string' ? extracted : null;
  }
  return null;
}

async function generateWritingQuestion(
  sessionType: SessionTypeEnum,
  difficulty: QuestionDifficulty,
  sourceConfig: WritingSourceConfig,
  promptConfig: WritingPromptConfig
): Promise<Question> {
  const model = DEFAULT_MODEL;

  const systemPrompt = `Du bist Aufgabenentwickler für das Goethe-Zertifikat C1 Schreiben.
Generiere eine Schreibaufgabe (Teil ${sourceConfig.taskKind === 'formal_letter' ? '1' : '2'}) mit klarer Situationsbeschreibung, Aufgabenstellung
und Stichpunkten, damit Kandidat*innen etwa ${sourceConfig.wordGuide.target} Wörter schreiben.
Sprache: Deutsch.`;

  const userPrompt = `Erstelle eine Aufgabe.
Aufgabentyp: ${sourceConfig.taskKind}
Ton: ${sourceConfig.tone}
Thema: ${sourceConfig.contextTheme ?? 'Arbeitswelt / Gesellschaft'}
Niveau: ${difficulty}

Liefere JSON entsprechend dem Schema.`;

  const result = await generateObject({
    model,
    schema: WritingPromptSchema,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.4,
  });

  const data = result.object;
  const questionType = resolveQuestionType(sessionType);

  return {
    id: `writing-${Date.now()}`,
    type: questionType,
    sessionType,
    difficulty,
    inputType: QuestionInputType.LONG_TEXT,
    prompt: data.scenario,
    context: `${data.contextTitle}\n\n${data.contextBody}`,
    writingPrompt: {
      scenario: data.scenario,
      goal: data.communicationGoal,
      audience: data.audience,
      tasks: data.tasks,
    },
    sourceSections: [
      { title: data.contextTitle, body: data.contextBody },
      { title: 'Hinweise', body: data.referenceNotes.map(note => `• ${note}`).join('\n') },
    ],
    instructions:
      promptConfig.instructions ??
      'Schreiben Sie einen strukturierten Text. Gehen Sie auf alle Stichpunkte ein und wählen Sie eine angemessene Anrede und Schlussformel.',
    wordGuide: {
      min: sourceConfig.wordGuide.min,
      target: sourceConfig.wordGuide.target,
    },
    scoringRubric: DEFAULT_WRITING_RUBRIC.map(criterion => ({ ...criterion })),
    markingGuidelines: [
      `Mindestlänge ${sourceConfig.wordGuide.min} Wörter, angestrebte Länge ${sourceConfig.wordGuide.target} Wörter.`,
      'Klarer Aufbau mit Einleitung, Hauptteil, Schluss sowie passenden Absätzen.',
      'Adressatengerechter Ton (formell bzw. sachlich) und Bezug auf alle Stichpunkte.',
    ],
    scoringCriteria: {
      requireExactMatch: false,
      rubric: {
        minimum_words: sourceConfig.wordGuide.min,
        target_words: sourceConfig.wordGuide.target,
      },
      keywords: data.keywords ?? [],
    },
    points: 15,
    moduleId: QuestionModuleId.WRITTEN_RESPONSE,
    moduleLabel: 'Schreiben',
    presentation: {
      referenceNotes: data.referenceNotes,
      closingRemark: data.closingRemark,
    },
  } as Question;
}

async function markWritingAnswer({ question, answer }: WritingAnswerContext) {
  const userAnswer = {
    questionId: question.id,
    answer,
    timeSpent: 0,
    attempts: 1,
    hintsUsed: 0,
    timestamp: new Date(),
  };

  return markQuestionWithAI({
    question,
    answer: userAnswer,
    metadata: { defaultPoints: question.points ?? 15 },
  });
}

export const writtenResponseModule: QuestionModule<
  WritingPromptConfig,
  WritingRenderConfig,
  WritingSourceConfig,
  string
> = {
  id: QuestionModuleId.WRITTEN_RESPONSE,
  label: 'Schreiben',
  description: 'Erstellt Schreibaufgaben für das Goethe-Zertifikat mit AI-Bewertung.',
  supportsSessions: [SessionTypeEnum.WRITING],
  defaults: {
    prompt: {
      instructions:
        'Planen Sie Ihren Text und achten Sie auf klare Struktur (Einleitung, Hauptteil, Schluss).',
    },
    render: {
      layout: 'writing',
      showSourceToggle: true,
    },
    source: {
      type: 'writing_prompt',
      taskKind: 'formal_letter',
      tone: 'formal',
      contextTheme: 'Arbeitswelt',
      wordGuide: {
        min: 200,
        target: 250,
      },
    },
    scoring: {
      maxPoints: 15,
      strategy: 'ai',
    },
  },
  clientRenderKey: 'WrittenResponse',
  async generate(context) {
    const question = await generateWritingQuestion(
      context.sessionType,
      context.difficulty,
      context.sourceConfig,
      context.promptConfig
    );

    return { questions: [question] };
  },
  normaliseAnswer(value) {
    return normaliseAnswer(value);
  },
  async mark({ question, answer }) {
    return markWritingAnswer({ question, answer: answer ?? '' });
  },
};
