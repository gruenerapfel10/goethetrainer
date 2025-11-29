// Global assessment/focus palette (cross-skill capable, currently used in Reading Teil 1).
// Keep this stable; map per-skill/module as needed.
export enum ReadingAssessmentCategory {
  FORM_GRAMMAR = 'form_grammar',
  COHESION_CONNECTORS = 'cohesion_connectors',
  LEXIS_REGISTER = 'lexis_register',
  GIST_STRUCTURE = 'gist_structure',
  DETAIL_EVIDENCE = 'detail_evidence',
  INFERENCE_STANCE = 'inference_stance',
}

export interface ReadingAssessmentCategoryDefinition {
  id: ReadingAssessmentCategory;
  label: string;
  description: string;
  generationHint: string;
}

export type ReadingCategoryAllocationStrategy = 'even' | 'weighted';

export interface ReadingCategoryAllocationOptions {
  categories?: ReadingAssessmentCategory[];
  strategy?: ReadingCategoryAllocationStrategy;
  weights?: Partial<Record<ReadingAssessmentCategory, number>>;
  randomizeOrder?: boolean;
}

const READING_CATEGORY_DEFINITIONS: Record<ReadingAssessmentCategory, ReadingAssessmentCategoryDefinition> =
  {
    [ReadingAssessmentCategory.FORM_GRAMMAR]: {
      id: ReadingAssessmentCategory.FORM_GRAMMAR,
      label: 'Form & Grammar',
      description:
        'Morphosyntax and agreement: case, gender, number, tense/aspect, word order.',
      generationHint:
        'Options differ only in grammatical form (case/number/gender/tense). Only one fits the sentence-level agreement and syntax.',
    },
    [ReadingAssessmentCategory.COHESION_CONNECTORS]: {
      id: ReadingAssessmentCategory.COHESION_CONNECTORS,
      label: 'Cohesion & Connectors',
      description:
        'Logical links and discourse markers: cause, contrast, concession, addition, reference.',
      generationHint:
        'Provide one connector/reference that preserves logic; distractors must be grammatical but express wrong relations.',
    },
    [ReadingAssessmentCategory.LEXIS_REGISTER]: {
      id: ReadingAssessmentCategory.LEXIS_REGISTER,
      label: 'Lexical Precision & Register',
      description:
        'Nuanced word choice, collocation, and appropriate formality/tone.',
      generationHint:
        'All options same part of speech; only one matches nuance/register and collocational fit in context.',
    },
    [ReadingAssessmentCategory.GIST_STRUCTURE]: {
      id: ReadingAssessmentCategory.GIST_STRUCTURE,
      label: 'Gist & Structure',
      description:
        'Main idea and macro-organization (topic vs. support, section purpose).',
      generationHint:
        'Anchor the option to the main idea/section role; distractors reflect subordinate or unrelated ideas.',
    },
    [ReadingAssessmentCategory.DETAIL_EVIDENCE]: {
      id: ReadingAssessmentCategory.DETAIL_EVIDENCE,
      label: 'Detail & Evidence',
      description:
        'Concrete facts: numbers, dates, entities, factual statements.',
      generationHint:
        'Options should vary subtly in factual detail; only one matches the precise detail given.',
    },
    [ReadingAssessmentCategory.INFERENCE_STANCE]: {
      id: ReadingAssessmentCategory.INFERENCE_STANCE,
      label: 'Inference & Stance',
      description:
        'Implied meaning, attitude, intent, and beyond-the-text reasoning.',
      generationHint:
        'Distractors are plausible literal readings; the correct option captures implied attitude/intent or logical inference.',
    },
  };

export function listReadingAssessmentCategories(): ReadingAssessmentCategory[] {
  return Object.values(ReadingAssessmentCategory);
}

export function getReadingAssessmentCategoryDefinition(
  id?: ReadingAssessmentCategory | null
): ReadingAssessmentCategoryDefinition | null {
  if (!id) {
    return null;
  }
  return READING_CATEGORY_DEFINITIONS[id] ?? null;
}

export function pickReadingAssessmentCategory(
  index: number
): ReadingAssessmentCategory {
  const categories = listReadingAssessmentCategories();
  if (!categories.length) {
    throw new Error('No reading assessment categories registered');
  }
  const normalisedIndex =
    ((index % categories.length) + categories.length) % categories.length;
  return categories[normalisedIndex];
}

export function allocateReadingAssessmentCategories(
  count: number,
  options?: ReadingCategoryAllocationOptions
): ReadingAssessmentCategory[] {
  if (count <= 0) {
    return [];
  }
  const basePool =
    options?.categories?.length && options.categories
      ? dedupe(options.categories)
      : listReadingAssessmentCategories();
  if (!basePool.length) {
    throw new Error('No reading assessment categories registered');
  }

  const randomize = options?.randomizeOrder ?? true;
  const strategyHint = options?.strategy;
  const weightEntries = basePool.map(category => ({
    category,
    weight: Math.max(options?.weights?.[category] ?? 0, 0),
  }));
  const hasPositiveWeights = weightEntries.some(entry => entry.weight > 0);
  const useWeighted = strategyHint === 'weighted' ? true : strategyHint === 'even' ? false : hasPositiveWeights;

  let allocation: ReadingAssessmentCategory[] = [];

  if (useWeighted) {
    const totalWeight = weightEntries.reduce(
      (sum, entry) => sum + entry.weight,
      0
    );
    if (totalWeight === 0) {
      return allocateReadingAssessmentCategories(count, {
        ...options,
        strategy: 'even',
        weights: undefined,
      });
    }
    const provisional = weightEntries.map(entry => {
      const exact = (entry.weight / totalWeight) * count;
      const base = Math.floor(exact);
      const remainder = exact - base;
      return {
        category: entry.category,
        count: base,
        remainder,
      };
    });
    const assigned = provisional.reduce((sum, entry) => sum + entry.count, 0);
    let remaining = count - assigned;
    const remainderQueue = shuffleForRemainder(provisional.slice(), randomize).sort(
      (a, b) => b.remainder - a.remainder
    );
    for (let idx = 0; idx < remainderQueue.length && remaining > 0; idx += 1) {
      remainderQueue[idx].count += 1;
      remaining -= 1;
    }
    allocation = flattenAllocation(remainderQueue);
  } else {
    const order = randomize ? shuffleArray(basePool) : basePool.slice();
    const baseShare = Math.floor(count / order.length);
    let remainder = count % order.length;
    const sized = order.map(category => {
      const bonus = remainder > 0 ? 1 : 0;
      if (remainder > 0) {
        remainder -= 1;
      }
      return {
        category,
        count: baseShare + bonus,
        remainder: bonus,
      };
    });
    allocation = flattenAllocation(sized);
  }

  if (allocation.length < count) {
    const padding = [...allocation];
    while (padding.length < count) {
      padding.push(basePool[padding.length % basePool.length]);
    }
    allocation = padding;
  } else if (allocation.length > count) {
    allocation = allocation.slice(0, count);
  }

  return randomize ? shuffleArray(allocation) : allocation;
}

function dedupe<T>(list: T[]): T[] {
  const seen = new Set<T>();
  const result: T[] = [];
  list.forEach(item => {
    if (seen.has(item)) {
      return;
    }
    seen.add(item);
    result.push(item);
  });
  return result;
}

function shuffleArray<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function shuffleForRemainder<T>(input: T[], randomize: boolean): T[] {
  if (!randomize) {
    return input;
  }
  return shuffleArray(input);
}

function flattenAllocation(
  entries: Array<{ category: ReadingAssessmentCategory; count: number }>
): ReadingAssessmentCategory[] {
  const result: ReadingAssessmentCategory[] = [];
  entries.forEach(entry => {
    for (let i = 0; i < entry.count; i += 1) {
      result.push(entry.category);
    }
  });
  return result;
}
