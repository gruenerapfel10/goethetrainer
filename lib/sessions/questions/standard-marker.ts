import { generateObject } from 'ai';
import { z } from 'zod';
import { customModel } from '@/lib/ai/models';
import { ModelId } from '@/lib/ai/model-registry';
import { Question, QuestionResult, UserAnswer } from './question-types';

interface QuestionMetadata {
  defaultPoints?: number;
}

interface AIMarkingContext {
  question: Question;
  answer: UserAnswer;
  metadata: QuestionMetadata;
}

interface KeywordAnalysis {
  keywordsFound: number;
  keywordsTotal: number;
  coverage: number;
}

const AI_MARKING_MODEL = customModel(ModelId.GPT_5);

const MarkingDecisionSchema = z.object({
  summary: z.string(),
  nextStep: z.string(),
  criteria: z
    .array(
      z.object({
        id: z.string(),
        awardedPoints: z.number(),
        reasoning: z.string(),
        decisions: z
          .array(
            z.object({
              markNumber: z.number().int().min(1),
              source: z.string(),
              justification: z.string(),
              outcome: z.enum(['award', 'reject']),
            })
          )
          .nonempty(),
      })
    )
    .nonempty(),
  languageNotes: z.array(z.string()).max(6).optional(),
  detectedWordCount: z.number().optional(),
});

function analyseKeywords(answerText: string, keywords?: string[]): KeywordAnalysis {
  if (!keywords || keywords.length === 0) {
    return { keywordsFound: 0, keywordsTotal: 0, coverage: 0 };
  }

  const lowerAnswer = answerText.toLowerCase();
  const matches = keywords.filter(keyword =>
    lowerAnswer.includes(keyword.toLowerCase())
  );

  return {
    keywordsFound: matches.length,
    keywordsTotal: keywords.length,
    coverage: matches.length / keywords.length,
  };
}

function scoreByLength(answerText: string, minWords: number, targetWords: number): number {
  const words = answerText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  if (wordCount === 0) return 0;

  if (wordCount < minWords) {
    return 0.3;
  }

  if (wordCount >= targetWords) {
    return 1;
  }

  const ratio = (wordCount - minWords) / (targetWords - minWords);
  return 0.3 + ratio * 0.7;
}

function resolveRubric(question: Question, basePoints: number) {
  if (question.scoringRubric && question.scoringRubric.length > 0) {
    return question.scoringRubric;
  }

  return [
    {
      id: 'overall',
      label: 'Gesamtleistung',
      description: 'Gesamteindruck hinsichtlich Inhalt, Struktur, Sprache und Aufgabenbezug.',
      maxPoints: basePoints || 1,
      guidance: 'Nutze die volle Punktzahl nur, wenn alle Kriterien erfüllt sind.',
    },
  ];
}

function formatRubricForPrompt(rubric: Question['scoringRubric']): string {
  return (
    rubric
      ?.map(
        criterion =>
          `- ${criterion.id}: ${criterion.label} (max. ${criterion.maxPoints} Punkte) – ${criterion.description ?? ''}`
      )
      .join('\n') ?? ''
  );
}

function buildSourceSummary(question: Question): string {
  const parts: string[] = [];
  if (question.writingPrompt?.scenario) {
    parts.push(`Szenario: ${question.writingPrompt.scenario}`);
  }
  if (question.writingPrompt?.goal) {
    parts.push(`Ziel: ${question.writingPrompt.goal}`);
  }
  if (question.writingPrompt?.audience) {
    parts.push(`Adressat: ${question.writingPrompt.audience}`);
  }
  if (question.writingPrompt?.tasks?.length) {
    parts.push(
      `Aufgaben:\n${question.writingPrompt.tasks
        .map((task, index) => `  ${index + 1}. ${task}`)
        .join('\n')}`
    );
  }
  if (question.sourceSections?.length) {
    const sectionPreview = question.sourceSections
      .map(section => `${section.title ? `${section.title}: ` : ''}${section.body}`)
      .join('\n\n');
    parts.push(`Quelle:\n${sectionPreview}`);
  }
  return parts.join('\n\n');
}

function clampIntegerPoints(value: number, maxPoints: number) {
  if (!Number.isFinite(value)) return 0;
  const rounded = Math.round(value);
  return Math.min(maxPoints, Math.max(0, rounded));
}

function buildFeedback({
  summary,
  rubricDecision,
  rubricDefinition,
  languageNotes,
}: {
  summary: string;
  rubricDecision: z.infer<typeof MarkingDecisionSchema>['criteria'];
  rubricDefinition: Question['scoringRubric'];
  languageNotes?: string[];
}) {
  const rubricMap = new Map(
    rubricDefinition?.map(criterion => [criterion.id, criterion]) ?? []
  );

  const details = rubricDecision
    .map(decision => {
      const descriptor = rubricMap.get(decision.id);
      const label = descriptor?.label ?? decision.id;
      const maxPoints = descriptor?.maxPoints ?? 0;
      const decisionsBlock = decision.decisions
        ?.map(entry => {
          const status = entry.outcome === 'award' ? '✔︎' : '✘';
          return `    ${status} Mark ${entry.markNumber}: „${entry.source}“ — ${entry.justification}`;
        })
        .join('\n');
      return `${label}: ${decision.awardedPoints}/${maxPoints} – ${decision.reasoning}${
        decisionsBlock ? `\n${decisionsBlock}` : ''
      }`;
    })
    .join('\n');

  const languageBlock =
    languageNotes && languageNotes.length > 0
      ? `\n\nSprachhinweise:\n${languageNotes.map(note => `• ${note}`).join('\n')}`
      : '';

  return `${summary}\n\n${details}${languageBlock}`;
}

function deriveHeuristicNextStep(answerText: string, question: Question): string {
  const trimmed = answerText.trim();
  const minWords = question.scoringCriteria?.rubric?.minimum_words ?? question.wordGuide?.min ?? 50;
  const wordCount = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;

  if (wordCount === 0) {
    return 'Schreibe zunächst einen vollständigen Text mit eigenen Inhalten statt nur Stichpunkten.';
  }

  if (wordCount < minWords) {
    return `Erweitere den Text auf mindestens ${minWords} Wörter und belege deine Aussagen mit Beispielen.`;
  }

  return 'Konzentriere dich als Nächstes auf eine klare Struktur mit Einleitung, Hauptteil und Schluss.';
}

async function tryAIMarking({
  question,
  userAnswer,
  answerText,
  basePoints,
}: {
  question: Question;
  userAnswer: UserAnswer;
  answerText: string;
  basePoints: number;
}): Promise<QuestionResult | null> {
  const rubric = resolveRubric(question, basePoints);
  const rubricWeights = new Map(
    rubric?.map(criterion => [criterion.id, criterion.maxPoints ?? 0]) ?? []
  );
  const rubricMeta = new Map(rubric?.map(criterion => [criterion.id, criterion]) ?? []);
  const maxScore =
    rubric?.reduce((sum, criterion) => sum + (criterion.maxPoints ?? 0), 0) || basePoints;
  const minWords = question.scoringCriteria?.rubric?.minimum_words ?? question.wordGuide?.min ?? 50;
  const targetWords =
    question.scoringCriteria?.rubric?.target_words ?? question.wordGuide?.target ?? minWords + 50;
  const detectedWordCount = answerText.trim().split(/\s+/).filter(Boolean).length;

  const systemPrompt = `Du bist erfahrener Prüfer für das Goethe-Zertifikat C1 (Schreiben).
Bewerte Texte ausschließlich anhand der vorgegebenen Kriterien.
Arbeite wie auf dem offiziellen Bewertungsbogen:
- Jede Marke (ein Punkt) muss einzeln mit Quelle und Begründung dokumentiert werden, bevor du sie vergibst oder verweigerst.
- Verwende ausschließlich ganze Punkte, keine Bruchteile.
- Beziehe dich bei jeder Entscheidung auf wörtliche Textstellen oder eindeutige Paraphrasen aus der Antwort.
- Formuliere zusätzlich ein einziges, sofort umsetzbares „nextStep“-Statement (max. 200 Zeichen), das den einfachsten Weg beschreibt, um die Punktzahl zu verbessern.
Antworte strikt im JSON-Format des Schemas.`;

  const promptSections = [
    `Maximale Punktzahl: ${maxScore}`,
    `Rubrik:\n${formatRubricForPrompt(rubric)}`,
    question.markingGuidelines?.length
      ? `Bewertungshinweise:\n${question.markingGuidelines.map(item => `- ${item}`).join('\n')}`
      : null,
    `Wortvorgabe: mindestens ${minWords} Wörter, ideal ${targetWords} Wörter.`,
    `Aufgabenbeschreibung:\n${question.prompt}\n\n${buildSourceSummary(question)}`,
    `Antwort des Kandidaten (${detectedWordCount} Wörter):\n"""${answerText.replace(/"""/g, '\"\"\"')}"""`,
    'Erstelle das Bewertungsobjekt. Die IDs der Kriterien müssen exakt den Rubrik-IDs entsprechen. Für jede Marke musst du einen "decisions"-Eintrag mit Quelle, Begründung und Ausgang (award/reject) liefern.',
  ]
    .filter(Boolean)
    .join('\n\n');

  const decision = await generateObject({
    model: AI_MARKING_MODEL,
    schema: MarkingDecisionSchema,
    temperature: 0.2,
    system: systemPrompt,
    prompt: promptSections,
  });

  const totalScore = decision.object.criteria.reduce((sum, criterion) => {
    const max = rubricWeights.get(criterion.id) ?? 0;
    return sum + clampIntegerPoints(criterion.awardedPoints, max);
  }, 0);

  const finalScore = clampIntegerPoints(totalScore, maxScore);
  const maxPoints = maxScore || basePoints;
  const isCorrect = finalScore >= maxPoints * 0.7;

  const breakdown = {
    summary: decision.object.summary,
    nextStep: decision.object.nextStep,
    detectedWordCount: decision.object.detectedWordCount,
    criteria: decision.object.criteria.map(criterion => {
      const descriptor = rubricMeta.get(criterion.id);
      const maxPoints = rubricWeights.get(criterion.id) ?? criterion.awardedPoints;
      return {
        id: criterion.id,
        label: descriptor?.label ?? criterion.id,
        awardedPoints: clampIntegerPoints(criterion.awardedPoints, maxPoints),
        maxPoints,
        reasoning: criterion.reasoning,
        decisions: criterion.decisions.map(entry => ({
          markNumber: entry.markNumber,
          source: entry.source,
          justification: entry.justification,
          outcome: entry.outcome,
        })),
      };
    }),
  };

  return {
    questionId: question.id,
    question,
    userAnswer: {
      questionId: userAnswer.questionId,
      answer: answerText,
      timeSpent: userAnswer.timeSpent,
      attempts: userAnswer.attempts,
      hintsUsed: userAnswer.hintsUsed,
      timestamp: userAnswer.timestamp,
    },
    score: finalScore,
    maxScore: maxPoints,
    isCorrect,
    feedback: buildFeedback({
      summary: decision.object.summary,
      rubricDecision: decision.object.criteria,
      rubricDefinition: rubric,
      languageNotes: decision.object.languageNotes,
    }),
    markedBy: 'ai',
    breakdown,
  };
}

function markWithHeuristics({
  question,
  answer,
  metadata,
  answerText,
}: AIMarkingContext & { answerText: string }): QuestionResult {
  const basePoints = question.points ?? metadata.defaultPoints ?? 0;
  const minWords = question.scoringCriteria?.rubric?.minimum_words ?? 50;
  const targetWords = question.scoringCriteria?.rubric?.target_words ?? 120;
  const lengthScore = scoreByLength(answerText, minWords, targetWords);
  const keywordAnalysis = analyseKeywords(answerText, question.scoringCriteria?.keywords);

  let aggregateScore = lengthScore;
  if (keywordAnalysis.keywordsTotal > 0) {
    aggregateScore = aggregateScore * 0.7 + keywordAnalysis.coverage * 0.3;
  }
  if (question.scoringCriteria?.requireExactMatch) {
    const expected = String(question.correctAnswer ?? '').trim().toLowerCase();
    const isExactMatch = answerText.toLowerCase() === expected;
    aggregateScore = isExactMatch ? 1 : 0;
  }

  const finalScore = Math.round(Math.min(1, Math.max(0, aggregateScore)) * basePoints);
  const isCorrect = finalScore >= basePoints * 0.7;

  const feedbackSegments: string[] = [];
  if (lengthScore >= 0.9) {
    feedbackSegments.push('Umfang der Antwort ist sehr gut.');
  } else if (lengthScore >= 0.6) {
    feedbackSegments.push('Der Umfang passt, könnte aber noch ausführlicher sein.');
  } else {
    feedbackSegments.push(`Antwort ist zu kurz. Visierter Umfang: mindestens ${minWords} Wörter.`);
  }

  if (keywordAnalysis.keywordsTotal > 0) {
    if (keywordAnalysis.coverage === 1) {
      feedbackSegments.push('Alle geforderten Schlüsselbegriffe wurden verwendet.');
    } else if (keywordAnalysis.coverage >= 0.5) {
      feedbackSegments.push('Mehr als die Hälfte der Schlüsselbegriffe wurden verwendet.');
    } else {
      feedbackSegments.push('Es fehlen wichtige Schlüsselbegriffe in der Antwort.');
    }
  }

  if (question.scoringCriteria?.requireExactMatch && !isCorrect) {
    feedbackSegments.push('Die Antwort entspricht nicht exakt der erwarteten Lösung.');
  }

  const breakdown = {
    summary: 'Automatische heuristische Bewertung',
    nextStep: deriveHeuristicNextStep(answerText, question),
    criteria: [
      {
        id: 'aggregate',
        label: 'Gesamtscore',
        awardedPoints: finalScore,
        maxPoints: basePoints,
        reasoning: feedbackSegments.join(' '),
        decisions: [],
      },
    ],
  };

  return {
    questionId: question.id,
    question,
    userAnswer: answer,
    score: finalScore,
    maxScore: basePoints,
    isCorrect,
    feedback: feedbackSegments.join(' '),
    markedBy: 'ai',
    breakdown,
  };
}

export async function markQuestionWithAI({
  question,
  answer,
  metadata,
}: AIMarkingContext): Promise<QuestionResult> {
  const basePoints = question.points ?? metadata.defaultPoints ?? 0;
  const answerText = String(answer.answer ?? '').trim();

  if (!answerText) {
    return {
      questionId: question.id,
      question,
      userAnswer: answer,
      score: 0,
      maxScore: basePoints,
      isCorrect: false,
      feedback: 'Keine Antwort eingereicht. Bitte beantworte die Frage, um eine Bewertung zu erhalten.',
      markedBy: 'ai',
    };
  }

  try {
    const aiResult = await tryAIMarking({ question, userAnswer: answer, answerText, basePoints });
    if (aiResult) {
      return aiResult;
    }
  } catch (error) {
    console.error('AI marking failed, falling back to heuristic scoring', error);
  }

  return markWithHeuristics({ question, answer, metadata, answerText });
}
