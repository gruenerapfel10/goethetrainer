export enum ReadingAssessmentCategory {
  CONNECTOR_LOGIC = 'connector_logic',
  LEXICAL_NUANCE = 'lexical_nuance',
  COLLOCATION_CONTROL = 'collocation_control',
  GRAMMAR_AGREEMENT = 'grammar_agreement',
  IDIOMATIC_EXPRESSION = 'idiomatic_expression',
  REGISTER_TONE = 'register_tone',
  DISCOURSE_REFERENCE = 'discourse_reference',
  INSTITUTIONAL_CONTEXT = 'institutional_context',
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
    [ReadingAssessmentCategory.CONNECTOR_LOGIC]: {
      id: ReadingAssessmentCategory.CONNECTOR_LOGIC,
      label: 'Connector Logic',
      description:
        'Tests whether the learner can restore the correct logical connector (cause, contrast, concession, addition) within a paragraph.',
      generationHint:
        'Provide one correct connector that fits the sentence logic and distractors that are grammatically valid but express other logical relations (e.g., causal vs. contrastive).',
    },
    [ReadingAssessmentCategory.LEXICAL_NUANCE]: {
      id: ReadingAssessmentCategory.LEXICAL_NUANCE,
      label: 'Lexical Nuance',
      description:
        'Targets fine-grained vocabulary choices among near-synonymous verbs, adjectives oder Substantiven.',
      generationHint:
        'Use options that share Wortart und Register. Nur eine Option darf die semantische Nuance treffen, die der Text verlangt (z. B. Konnotation, Wertung).',
    },
    [ReadingAssessmentCategory.COLLOCATION_CONTROL]: {
      id: ReadingAssessmentCategory.COLLOCATION_CONTROL,
      label: 'Collocation Control',
      description:
        'Checks idiomatic use of prepositions oder feste Wendungen, die mit einem konkreten Verb/Nomen verbunden sind.',
      generationHint:
        'Alle Optionen sollten grammatisch möglich wirken, aber nur eine bildet die kanonische deutsche Kollokation mit dem umgebenden Ausdruck.',
    },
    [ReadingAssessmentCategory.GRAMMAR_AGREEMENT]: {
      id: ReadingAssessmentCategory.GRAMMAR_AGREEMENT,
      label: 'Grammar Agreement',
      description:
        'Verifies mastery of case, gender, and number in Artikeln, Pronomen oder Adjektivendungen.',
      generationHint:
        'Biete Formen an, die sich ausschließlich durch Kasus/Genus/Numerus unterscheiden. Nur die korrekte Form erfüllt die durch das Satzgefüge vorgegebene Kongruenz.',
    },
    [ReadingAssessmentCategory.IDIOMATIC_EXPRESSION]: {
      id: ReadingAssessmentCategory.IDIOMATIC_EXPRESSION,
      label: 'Idiomatic Expression',
      description:
        'Prüft, ob feste Redewendungen oder metaphorische Formeln präzise wiederhergestellt werden können.',
      generationHint:
        'Alle Optionen sollen idiomatisch klingen, aber nur eine fügt sich in die bekannte Redewendung (z. B. „etwas auf die lange Bank schieben“). Distraktoren verändern einen Kernbestandteil der Wendung.',
    },
    [ReadingAssessmentCategory.REGISTER_TONE]: {
      id: ReadingAssessmentCategory.REGISTER_TONE,
      label: 'Register & Tone',
      description:
        'Überprüft, ob der Sprachstil (formal, umgangssprachlich, ironisch) zum Kontext passt.',
      generationHint:
        'Liefer Optionen gleicher Bedeutungsebene, aber unterschiedlicher Register. Nur eine Option darf stilistisch mit dem vorangehenden Text harmonieren.',
    },
    [ReadingAssessmentCategory.DISCOURSE_REFERENCE]: {
      id: ReadingAssessmentCategory.DISCOURSE_REFERENCE,
      label: 'Discourse Reference',
      description:
        'Fokussiert auf Pronomen oder Bezugsausdrücke, die auf vorherige Inhalte verweisen und Kohärenz sichern.',
      generationHint:
        'Stelle Optionen bereit, die sich alle auf unterschiedliche Referenten beziehen könnten. Nur eine Option darf gemäß Textlogik das korrekte Bezugswort wieder aufnehmen.',
    },
    [ReadingAssessmentCategory.INSTITUTIONAL_CONTEXT]: {
      id: ReadingAssessmentCategory.INSTITUTIONAL_CONTEXT,
      label: 'Institutional Context',
      description:
        'Testet Wissen über gesellschaftliche oder institutionelle Begriffe (z. B. juristische, politische Strukturen) im Kontext.',
      generationHint:
        'Die Optionen sollen thematisch verwandt sein, aber nur ein Begriff darf sachlich korrekt zum beschriebenen institutionellen Rahmen passen.',
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
    let assigned = provisional.reduce((sum, entry) => sum + entry.count, 0);
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
