import { generateObject } from 'ai';
import { z } from 'zod';
import { SessionTypeEnum } from '@/lib/sessions/session-registry';
import {
  QuestionDifficulty,
  QuestionType,
  QuestionInputType,
  type Question,
  type QuestionResult,
  type UserAnswer,
} from '@/lib/sessions/questions/question-types';
import {
  QuestionModuleId,
  type QuestionModule,
  type QuestionModulePromptConfig,
  type QuestionModuleRenderConfig,
  type QuestionModuleSourceConfig,
  type ModelUsageRecord,
} from './types';
import { ModelId } from '@/lib/ai/model-registry';
import { customModel } from '@/lib/ai/models';
import { getNewsTopicFromPool, type NewsTopic } from '@/lib/news/news-topic-pool';

interface StatementMatchPromptConfig extends QuestionModulePromptConfig {
  instructions: string;
}

interface StatementMatchRenderConfig extends QuestionModuleRenderConfig {
  layout: 'statement_match';
  showSourceToggle: boolean;
}

interface StatementMatchSourceConfig extends QuestionModuleSourceConfig {
  type: 'statement_matching';
  theme?: string;
  topicHint?: string;
  authorCount?: number;
  statementCount?: number;
  unmatchedCount?: number;
  startingStatementNumber?: number;
  workingTimeMinutes?: number;
  teilLabel?: string;
}

type StatementMatchAnswer = Record<string, string> | null;

const DEFAULT_STATEMENT_MODEL = ModelId.CLAUDE_HAIKU_4_5;
const STATEMENT_RETRY_ATTEMPTS = 3;
const STATEMENT_RETRY_DELAY_MS = 1_200;

async function generateWithRetry<T>(operation: () => Promise<T>): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;
      if (attempt >= STATEMENT_RETRY_ATTEMPTS) {
        throw error;
      }
      await new Promise(resolve =>
        setTimeout(resolve, STATEMENT_RETRY_DELAY_MS * attempt)
      );
    }
  }
}

function mapNewsTopicToSourceReference(topic?: NewsTopic | null) {
  if (!topic) {
    return undefined;
  }
  return {
    title: topic.headline,
    summary: topic.summary,
    url: topic.url,
    provider: topic.source,
    publishedAt: topic.publishedAt,
  };
}

const StatementMatchSchema = z.object({
  theme: z.string(),
  title: z.string(),
  subtitle: z.string(),
  intro: z.string(),
  authors: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        role: z.string(),
        summary: z.string(),
        excerpt: z.string(),
      })
    )
    .min(2),
  statements: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        authorId: z.string().nullable(),
      })
    )
    .min(5),
  example: z.object({
    text: z.string(),
    authorId: z.string(),
    explanation: z.string().optional(),
  }),
});

function resolveQuestionType(sessionType: SessionTypeEnum): QuestionType {
  switch (sessionType) {
    case SessionTypeEnum.READING:
      return QuestionType.READING_COMPREHENSION;
    default:
      return QuestionType.READING_COMPREHENSION;
  }
}

function normaliseAnswer(value: unknown, question: Question): StatementMatchAnswer {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    const allowedIds = new Set(
      question.statements?.map(statement => statement.id) ?? []
    );
    const allowedOptions = new Set(
      (question.options ?? []).map(option => option.id ?? option.text)
    );

    const entries = Object.entries(value as Record<string, unknown>).reduce<
      Record<string, string>
    >((acc, [statementId, rawValue]) => {
      if (
        typeof rawValue === 'string' &&
        rawValue.trim().length > 0 &&
        (allowedIds.size === 0 || allowedIds.has(statementId)) &&
        (allowedOptions.size === 0 || allowedOptions.has(rawValue.trim()))
      ) {
        acc[statementId] = rawValue.trim();
      }
      return acc;
    }, {});

    return Object.keys(entries).length > 0 ? entries : null;
  }
  return null;
}

async function markStatementMatch(
  question: Question,
  answer: StatementMatchAnswer,
  userAnswer: UserAnswer
): Promise<QuestionResult> {
  const statements = question.statements ?? [];
  const correctMatches = question.correctMatches ?? {};
  const response = answer ?? {};
  let correctCount = 0;

  statements.forEach(statement => {
    const expected = correctMatches[statement.id];
    if (expected && response[statement.id] === expected) {
      correctCount += 1;
    }
  });

  return {
    questionId: question.id,
    question,
    userAnswer,
    score: correctCount,
    maxScore: statements.length,
    isCorrect: correctCount === statements.length,
    feedback:
      correctCount === statements.length
        ? 'Alle Aussagen wurden korrekt zugeordnet.'
        : `Du hast ${correctCount} von ${statements.length} Aussagen korrekt zugeordnet.`,
    markedBy: 'automatic',
  };
}

function reportUsage(
  recordUsage: ((record: ModelUsageRecord) => void) | undefined,
  modelId: string,
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    outputTokens?: number;
    inputTokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
  } | null
): void {
  if (!recordUsage || !usage) {
    return;
  }
  const inputTokens =
    usage.promptTokens ??
    usage.inputTokens ??
    usage.prompt_tokens ??
    0;
  const outputTokens =
    usage.completionTokens ??
    usage.outputTokens ??
    usage.completion_tokens ??
    0;
  if (!inputTokens && !outputTokens) {
    return;
  }
  recordUsage({
    modelId,
    inputTokens,
    outputTokens,
  });
}

async function generateStatementMatchQuestion(
  sessionType: SessionTypeEnum,
  difficulty: QuestionDifficulty,
  sourceConfig: StatementMatchSourceConfig,
  promptConfig: StatementMatchPromptConfig,
  userId?: string,
  recordUsage?: (record: ModelUsageRecord) => void
): Promise<Question> {
  const newsTopic = await getNewsTopicFromPool(userId);
  const {
    authorCount = 3,
    statementCount = 7,
    unmatchedCount = 0,
    startingStatementNumber = 24,
    workingTimeMinutes = 15,
    theme = newsTopic?.theme ?? 'Digitale Gesellschaft',
    topicHint = newsTopic?.headline ?? 'Privatsphäre und Datenkultur in der digitalen Welt',
    teilLabel,
  } = sourceConfig;
  if (newsTopic) {
    const labelSuffix = teilLabel ? ` (${teilLabel})` : '';
    console.log(`[NewsPool] Using headline${labelSuffix}:`, newsTopic.headline);
  }
  const optionZeroEnabled = unmatchedCount > 0;
  if (!optionZeroEnabled && unmatchedCount > 0) {
    throw new Error('Statement matching no longer supports unmatched statements (Option 0).');
  }

  const model = customModel(DEFAULT_STATEMENT_MODEL);
const newsBlock = newsTopic
  ? `Aktuelle Meldung:
- Schlagzeile: ${newsTopic.headline}
- Quelle: ${newsTopic.source ?? 'unbekannt'}
- Zusammenfassung: ${newsTopic.summary}`
  : '';

const optionZeroBlock = optionZeroEnabled
  ? `Davon ohne passenden Autor (Antwort \"0\"): ${unmatchedCount}`
  : 'Jede Aussage muss genau einer Person aus der Autorenliste zugeordnet werden.';

const userPrompt = `
Erstelle eine Aufgabe im Stil des Goethe-Zertifikats C1 Lesen, Teil 4.

Thema: ${theme}
Inhaltlicher Fokus: ${topicHint}
Sprachlevel: ${difficulty}
Autorenanzahl: ${authorCount}
Anzahl Aussagen: ${statementCount}
${optionZeroBlock}

${newsBlock}

WICHTIG:
- Verwende KEINE eigenen Buchstabenpräfixe für Autor*innen (keine "A", "B", ...).
- Das Feld "name" soll nur den Namen/Titel enthalten.
- Das Feld "authorId" in jeder Aussage muss exakt einem "id" aus der Autorenliste entsprechen.

Liefere JSON, das exakt zum Schema passt.
`;

  const result = await generateWithRetry(() =>
    generateObject({
      model,
      schema: StatementMatchSchema,
      system: `Du bist Sprachexperte für das Goethe-Zertifikat C1. Erstelle anspruchsvolle Lesetexte mit prägnanten Aussagen vergleichbar mit Teil 4. Achte auf glaubwürdige wissenschaftliche Rollen (Professor*innen, Expert*innen) und eindeutige Zuordenbarkeit.`,
      prompt: userPrompt,
      temperature: 0.6,
    })
  );
  reportUsage(recordUsage, DEFAULT_STATEMENT_MODEL, result.usage);

  const data = result.object;
  if (data.authors.length < authorCount) {
    throw new Error(`Zu wenige Autor*innen generiert (${data.authors.length}/${authorCount}).`);
  }
  if (data.statements.length < statementCount) {
    throw new Error(`Zu wenige Aussagen generiert (${data.statements.length}/${statementCount}).`);
  }

  const authors = data.authors.slice(0, authorCount).map((author, index) => {
    const letter = String.fromCharCode(65 + index);
    const name = author.name.replace(new RegExp(`^${letter}\\s+`, 'i'), '').trim();
    return {
      internalId: author.id || `author_${index + 1}`,
      letter,
      role: author.role,
      name,
      summary: author.summary,
      excerpt: author.excerpt,
    };
  });

  const statements = data.statements.slice(0, statementCount);
  const actualUnmatched = statements.filter(entry => !entry.authorId || entry.authorId === '0').length;
  if (!optionZeroEnabled && actualUnmatched > 0) {
    throw new Error(
      'Das Modell lieferte Aussagen ohne gültige Autorenzuordnung, Option 0 ist deaktiviert.'
    );
  }

  const statementEntries = statements.map((statement, index) => {
    const number = startingStatementNumber + index;
    return {
      id: `S${index + 1}`,
      text: statement.text,
      number,
      authorId: statement.authorId,
    };
  });

  const correctMatches = statementEntries.reduce<Record<string, string>>((acc, entry) => {
    const author = authors.find(
      candidate =>
        candidate.internalId === entry.authorId ||
        candidate.letter === entry.authorId
    );
    if (!author) {
      throw new Error('Unbekannte Autorenzuordnung in einer Aussage.');
    }
    acc[entry.id] = author.letter;
    return acc;
  }, {});

  const options = authors.map(author => ({
    id: author.letter,
    text: author.letter,
  }));

  return {
    id: `statement-match-${Date.now()}`,
    type: resolveQuestionType(sessionType),
    sessionType,
    difficulty,
    inputType: QuestionInputType.MATCHING,
    prompt:
      promptConfig.instructions ??
      'Sie lesen in einer Fachzeitschrift Beiträge von Wissenschaftlerinnen und Wissenschaftlern. Wählen Sie bei jeder Aussage: Wer äußert das? Zwei Aussagen passen nicht. Markieren Sie in diesem Fall 0.',
    context: `${data.title} — ${data.subtitle}`,
    title: data.title,
    subtitle: data.subtitle,
    theme: data.theme,
    options,
    texts: authors.map(author => ({
      id: author.letter,
      label: author.name,
      content: `${author.summary}\n\n${author.excerpt}`,
      role: author.role,
    })),
    statements: statementEntries.map(entry => ({
      id: entry.id,
      text: entry.text,
      number: entry.number,
    })),
    correctMatches,
    points: statementEntries.length,
    layoutVariant: 'statement_match',
    moduleId: QuestionModuleId.STATEMENT_MATCH,
    moduleLabel: 'Statement Matching',
    sourceReference: mapNewsTopicToSourceReference(newsTopic),
    presentation: {
      workingTimeMinutes,
      intro: data.intro,
      example: {
        statement: data.example.text,
        answer:
          authors.find(
            author =>
              author.internalId === data.example.authorId ||
              author.letter === data.example.authorId
          )?.letter ?? '0',
        explanation: data.example.explanation,
      },
      newsTopic,
    },
  } as Question;
}

export const statementMatchModule: QuestionModule<
  StatementMatchPromptConfig,
  StatementMatchRenderConfig,
  StatementMatchSourceConfig,
  StatementMatchAnswer
> = {
  id: QuestionModuleId.STATEMENT_MATCH,
  label: 'Statement Matching',
  description:
    'Zuordnungsaufgaben nach Goethe C1 Teil 4: Aussagen werden Autor*innen oder 0 zugeordnet.',
  supportsSessions: [SessionTypeEnum.READING],
  defaults: {
    prompt: {
      instructions:
        'Sie lesen in einer Fachzeitschrift Beiträge von Wissenschaftlerinnen und Wissenschaftlern. Wählen Sie bei jeder Aussage: Wer äußert das? Zwei Aussagen passen nicht. Markieren Sie in diesem Fall 0.',
    },
    render: {
      layout: 'statement_match',
      showSourceToggle: true,
    },
    source: {
      type: 'statement_matching',
      authorCount: 3,
      statementCount: 7,
      unmatchedCount: 2,
      startingStatementNumber: 24,
      workingTimeMinutes: 15,
    },
    scoring: {
      maxPoints: 7,
      strategy: 'per_gap',
    },
  },
  clientRenderKey: 'StatementMatch',
  async generate(context) {
    const question = await generateStatementMatchQuestion(
      context.sessionType,
      context.difficulty,
      (context.sourceConfig as StatementMatchSourceConfig) ?? ({} as StatementMatchSourceConfig),
      context.promptConfig,
      context.userId,
      context.recordUsage
    );

    return {
      questions: [
        {
          ...question,
          points: question.statements?.length ?? 0,
        },
      ],
    };
  },
  normaliseAnswer(value, question) {
    return normaliseAnswer(value, question);
  },
  async mark({ question, answer, userAnswer }) {
    return markStatementMatch(question, answer, userAnswer);
  },
};
