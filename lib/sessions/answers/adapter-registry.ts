import { QuestionModuleId } from '@/lib/questions/modules/types';
import type { Question } from '@/lib/sessions/questions/question-types';
import type { AnswerValue } from '@/lib/sessions/types';

export type AnswerType =
  | 'mcq'
  | 'gap'
  | 'match'
  | 'text'
  | 'audio'
  | 'speech';

export interface AnswerEnvelope {
  questionId: string;
  type: AnswerType;
  value: AnswerValue;
  updatedAt: number;
  revision: number;
}

export interface AnswerAdapter {
  type: AnswerType;
  normalise: (raw: unknown, question: Question) => AnswerValue;
  hydrate: (stored: AnswerValue, question: Question) => AnswerValue;
  isComplete: (value: AnswerValue) => boolean;
}

type AdapterKey = AnswerType | QuestionModuleId | 'gaps' | 'long_text';

const registry = new Map<AdapterKey, AnswerAdapter>();

function hasGapStructure(question: Question) {
  return Array.isArray(question.gaps) && question.gaps.length > 0;
}

function normaliseObjectRecord(
  question: Question,
  value: unknown
): Record<string, string> | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const fallbackId =
      question.gaps?.[0]?.id ??
      (Array.isArray(question.gaps) && question.gaps.length > 0
        ? question.gaps[0]?.id
        : null) ??
      'GAP_0';
    return { [fallbackId]: trimmed };
  }
  if (typeof value === 'object') {
    const allowedIds = new Set(
      (question.gaps ?? [])
        .map(gap => gap.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    );
    const result: Record<string, string> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
      if (typeof raw !== 'string') return;
      const trimmed = raw.trim();
      if (!trimmed) return;
      if (allowedIds.size === 0 || allowedIds.has(key)) {
        result[key] = trimmed;
      }
    });
    return Object.keys(result).length > 0 ? result : null;
  }
  return null;
}

function registerAdapter(key: AdapterKey, adapter: AnswerAdapter) {
  registry.set(key, adapter);
}

registerAdapter('mcq', {
  type: 'mcq',
  normalise: value => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return null;
  },
  hydrate: value => value,
  isComplete: value => typeof value === 'string' && value.length > 0,
});

registerAdapter('gap', {
  type: 'gap',
  normalise: (value, question) => normaliseObjectRecord(question, value),
  hydrate: (value, question) => normaliseObjectRecord(question, value),
  isComplete: value =>
    !!value &&
    typeof value === 'object' &&
    Object.keys(value as Record<string, string>).length > 0,
});

registerAdapter('match', {
  type: 'match',
  normalise: (value, question) => {
    if (!value || typeof value !== 'object') return null;
    const statements = question.statements ?? [];
    const allowedIds = new Set(statements.map(statement => statement.id));
    const allowedOptions = new Set(
      (question.options ?? []).map(option => option.id ?? option.text)
    );
    const entries = Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
      (acc, [statementId, rawValue]) => {
        if (
          typeof rawValue === 'string' &&
          rawValue.trim().length > 0 &&
          (allowedIds.size === 0 || allowedIds.has(statementId)) &&
          (allowedOptions.size === 0 || allowedOptions.has(rawValue.trim()))
        ) {
          acc[statementId] = rawValue.trim();
        }
        return acc;
      },
      {}
    );
    return Object.keys(entries).length > 0 ? entries : null;
  },
  hydrate: (value, question) => {
    if (!value) return null;
    return registry.get('match')!.normalise(value, question);
  },
  isComplete: value =>
    !!value &&
    typeof value === 'object' &&
    Object.keys(value as Record<string, string>).length > 0,
});

registerAdapter('text', {
  type: 'text',
  normalise: value => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && 'text' in (value as any)) {
      const extracted = (value as any).text;
      return typeof extracted === 'string' ? extracted : null;
    }
    return null;
  },
  hydrate: value => (typeof value === 'string' ? value : null),
  isComplete: value => typeof value === 'string' && value.trim().length > 0,
});

export function resolveAnswerAdapter(question: Question): AnswerAdapter {
  const moduleId = (question.moduleId ??
    (question as any).registryType ??
    QuestionModuleId.MULTIPLE_CHOICE) as QuestionModuleId;

  if (moduleId === QuestionModuleId.STATEMENT_MATCH) {
    return registry.get('match')!;
  }

  if (moduleId === QuestionModuleId.WRITTEN_RESPONSE || question.inputType === 'long_text') {
    return registry.get('text')!;
  }

  if (hasGapStructure(question)) {
    return registry.get('gap')!;
  }

  return registry.get('mcq')!;
}

export function buildEnvelope(
  question: Question,
  value: AnswerValue,
  revision: number
): AnswerEnvelope {
  const adapter = resolveAnswerAdapter(question);
  return {
    questionId: question.id,
    type: adapter.type,
    value,
    updatedAt: Date.now(),
    revision,
  };
}

export function isEnvelopeMoreRecent(a?: AnswerEnvelope, b?: AnswerEnvelope) {
  if (!a) return false;
  if (!b) return true;
  return (a.revision ?? 0) > (b.revision ?? 0) || (a.revision === b.revision && (a.updatedAt ?? 0) > (b.updatedAt ?? 0));
}
