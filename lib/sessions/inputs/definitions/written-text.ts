import { z } from 'zod';
import { registerInputDefinition } from '../input-registry';
import { QuestionInputType, type QuestionInputDefinition } from '../types';

const SHORT_TEXT_LIMIT = 500;
const LONG_TEXT_LIMIT = 1500;

const ShortTextAnswerSchema = z
  .union([
    z.string().max(SHORT_TEXT_LIMIT),
    z.literal(''),
    z.null(),
    z.undefined(),
  ])
  .transform(value => {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const LongTextAnswerSchema = z
  .union([
    z.string().max(LONG_TEXT_LIMIT),
    z.literal(''),
    z.null(),
    z.undefined(),
  ])
  .transform(value => {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

function createWrittenDefinition(
  id: QuestionInputType,
  schema: z.ZodType<string | null>,
  options: {
    label: string;
    description: string;
    maxLength: number;
    strategy: 'manual' | 'ai_assisted';
  },
): QuestionInputDefinition<string | null> {
  return {
    id,
    label: options.label,
    description: options.description,
    category: 'written',
    answerSchema: schema,
    normalise: value => {
      if (value === null || value === undefined) {
        return null;
      }
      if (typeof value !== 'string') {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    },
    createInitialValue: question =>
      typeof question.answer === 'string' ? question.answer : null,
    toPersist: value => value,
    fromPersist: value =>
      typeof value === 'string' && value.trim().length > 0 ? value.trim() : null,
    ui: {
      component: 'ShortAnswer',
      props: {
        maxLength: options.maxLength,
      },
    },
    marking: {
      strategy: options.strategy,
    },
    metadata: {
      maxLength: options.maxLength,
    },
  };
}

registerInputDefinition(
  createWrittenDefinition(QuestionInputType.SHORT_TEXT, ShortTextAnswerSchema, {
    label: 'Short Written Response',
    description: 'Freitextantwort mit kurzer Begründung.',
    maxLength: SHORT_TEXT_LIMIT,
    strategy: 'ai_assisted',
  }),
);

registerInputDefinition(
  createWrittenDefinition(QuestionInputType.LONG_TEXT, LongTextAnswerSchema, {
    label: 'Extended Written Response',
    description: 'Ausführliche Freitextantwort mit Bewertung durch Prüfer:in.',
    maxLength: LONG_TEXT_LIMIT,
    strategy: 'manual',
  }),
);
