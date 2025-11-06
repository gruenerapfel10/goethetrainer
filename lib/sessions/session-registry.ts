import type { SessionType } from './types';
import { QuestionTypeName } from './questions/question-registry';
import { mergeSessionDataDefaults } from './session-blueprint';

export enum SessionTypeEnum {
  READING = 'reading',
  LISTENING = 'listening',
  WRITING = 'writing',
  SPEAKING = 'speaking',
}

export interface AIGenerationOverrides {
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  userPrompt?: string;
  sessionSystemPrompt?: string;
  sessionUserPrompt?: string;
}

export interface SessionLayoutQuestionDefaults {
  points?: number;
  timeLimit?: number;
}

export interface SessionLayoutQuestionOverrides {
  /**
   * Presentation hint consumed by the UI (e.g., 'single_line', 'grid').
   */
  layoutVariant?: string;
  /**
   * Arbitrary metadata forwarded to question renderers.
   */
  metadata?: Record<string, unknown>;
  /**
   * Runtime overrides for AI generation prompts and settings.
   */
  aiGeneration?: AIGenerationOverrides;
  /**
   * Override default scoring/time-limit values.
   */
  defaults?: SessionLayoutQuestionDefaults;
}

export interface SessionSourceOptions {
  /**
   * Source content type (e.g., 'gapped_text', 'transcript').
   */
  type?: string;
  /**
   * Customisation for the raw source generation pass.
   */
  raw?: {
    theme?: string;
    systemPrompt?: string;
    userPrompt?: string;
  };
  /**
   * Customisation for post-processing/identification (e.g., gap extraction).
   */
  gaps?: {
    requiredCount?: number;
    systemPrompt?: string;
    userPrompt?: string;
  };
  /**
   * Additional implementation-specific configuration.
   */
  config?: Record<string, unknown>;
}

export interface SessionLayoutEntryConfig {
  id?: string;
  label?: string;
  questionType: QuestionTypeName;
  questionCount?: number;
  question?: SessionLayoutQuestionOverrides;
  source?: SessionSourceOptions;
}

export type SessionLayoutDefinition = Array<QuestionTypeName | SessionLayoutEntryConfig>;

export interface NormalisedSessionLayoutEntry {
  id: string;
  label?: string;
  questionType: QuestionTypeName;
  questionCount?: number;
  question?: SessionLayoutQuestionOverrides;
  source?: SessionSourceOptions;
}

export interface SessionFieldDefinition {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'array' | 'object';
  required?: boolean;
  defaultValue?: any;
  description?: string;
}

export interface SessionMetrics {
  primary: string; // Primary metric field name
  secondary?: string[]; // Secondary metric field names
  calculated?: Array<{
    name: string;
    formula: string; // e.g., "wordsRead / (duration / 60)"
  }>;
}

export interface SessionConfig {
  type: SessionTypeEnum;
  metadata: {
    displayName: string;
    displayNameKey: string;
    description: string;
    descriptionKey: string;
    icon: string;
    color?: string;
  };
  
  // Schema definition for session data
  schema: {
    fields: Record<string, SessionFieldDefinition>;
    metrics: SessionMetrics;
  };
  
  // Supported question types for this session
  supportedQuestions: QuestionTypeName[];

  // Optional fixed layout (e.g., [{ questionType: GAP_TEXT, question: {...}}])
  // If provided, questions will be generated following this exact structure
  fixedLayout?: SessionLayoutDefinition;

  // Features and capabilities
  features: {
    supportsAudioRecording?: boolean;
    supportsTextInput?: boolean;
    supportsFileUpload?: boolean;
    supportsDictionary?: boolean;
    supportsHighlighting?: boolean;
    supportsNotes?: boolean;
  };
  
  // Default values for new sessions
  defaults: {
    targetDuration?: number; // in seconds
    targetMetrics?: Record<string, number>;
    questionCount?: number;
  };
  dataDefaults?: Record<string, any>;
  metadataDefaults?: Record<string, any>;
  
  // Validation rules
  validation?: {
    minDuration?: number;
    maxDuration?: number;
    customRules?: Array<{
      field: string;
      rule: string; // e.g., "value > 0"
      message: string;
    }>;
  };
}

// Central registry of all session types
export const SESSION_REGISTRY: Record<SessionTypeEnum, SessionConfig> = {
  [SessionTypeEnum.READING]: {} as SessionConfig, // Will be defined in reading-session.config.ts
  [SessionTypeEnum.LISTENING]: {} as SessionConfig, // Will be defined in listening-session.config.ts
  [SessionTypeEnum.WRITING]: {} as SessionConfig, // Will be defined in writing-session.config.ts
  [SessionTypeEnum.SPEAKING]: {} as SessionConfig, // Will be defined in speaking-session.config.ts
};

// Helper functions to access registry
export function getSessionConfig(type: SessionTypeEnum | SessionType): SessionConfig {
  const config = SESSION_REGISTRY[type as SessionTypeEnum];
  if (!config) {
    throw new Error(`Session type ${type} not found in registry`);
  }
  return config;
}

export function getSessionMetadata(type: SessionTypeEnum | SessionType) {
  return getSessionConfig(type).metadata;
}

export function getSessionSchema(type: SessionTypeEnum | SessionType) {
  return getSessionConfig(type).schema;
}

export function getSessionFeatures(type: SessionTypeEnum | SessionType) {
  return getSessionConfig(type).features;
}

export function getSessionDefaults(type: SessionTypeEnum | SessionType) {
  return getSessionConfig(type).defaults;
}

export function getSupportedQuestionTypes(type: SessionTypeEnum | SessionType) {
  const config = getSessionConfig(type);
  return config.supportedQuestions || [];
}

function normaliseSessionLayout(
  layout: SessionLayoutDefinition | undefined,
  supportedQuestions: QuestionTypeName[]
): NormalisedSessionLayoutEntry[] {
  const rawEntries = (layout && layout.length > 0 ? layout : supportedQuestions) ?? [];

  return rawEntries.map((entry, index) => {
    if (typeof entry === 'string') {
      return {
        id: `teil_${index + 1}`,
        label: `Teil ${index + 1}`,
        questionType: entry,
      };
    }

    const questionType = entry.questionType ?? (entry as any).type;
    if (!questionType) {
      throw new Error(`Session layout entry at index ${index} is missing questionType`);
    }

    return {
      id: entry.id ?? `teil_${index + 1}`,
      label: entry.label ?? entry.id ?? `Teil ${index + 1}`,
      questionType,
      questionCount: entry.questionCount,
      question: entry.question,
      source: entry.source,
    };
  });
}

export function getSessionLayout(type: SessionTypeEnum | SessionType): NormalisedSessionLayoutEntry[] {
  const config = getSessionConfig(type);
  return normaliseSessionLayout(config.fixedLayout, config.supportedQuestions);
}

export function validateSessionData(
  type: SessionTypeEnum | SessionType,
  data: Record<string, any>
): { valid: boolean; errors?: string[] } {
  const config = getSessionConfig(type);
  const errors: string[] = [];
  
  // Check required fields
  const fields = config.schema?.fields ?? {};
  Object.entries(fields).forEach(([fieldName, fieldDef]) => {
    if (fieldDef.required && !(fieldName in data)) {
      errors.push(`Missing required field: ${fieldName}`);
    }
  });
  
  // Apply custom validation rules
  config.validation?.customRules?.forEach(rule => {
    try {
      // This is a simplified validation - in production, use a proper expression evaluator
      const value = data[rule.field];
      if (!eval(rule.rule.replace('value', JSON.stringify(value)))) {
        errors.push(rule.message);
      }
    } catch (e) {
      console.error(`Validation error for rule ${rule.field}:`, e);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

// Initialize default session data based on schema
export function initializeSessionData(type: SessionTypeEnum | SessionType): Record<string, any> {
  const config = getSessionConfig(type);

  const data: Record<string, any> = mergeSessionDataDefaults(
    config.dataDefaults ?? {},
  );

  const fields = config.schema?.fields ?? {};
  Object.entries(fields).forEach(([fieldName, fieldDef]) => {
    if (fieldDef.defaultValue !== undefined) {
      data[fieldName] = fieldDef.defaultValue;
    } else {
      // Set type-appropriate defaults
      switch (fieldDef.type) {
        case 'number':
          data[fieldName] = 0;
          break;
        case 'string':
          data[fieldName] = '';
          break;
        case 'boolean':
          data[fieldName] = false;
          break;
        case 'array':
          data[fieldName] = [];
          break;
        case 'object':
          data[fieldName] = {};
          break;
      }
    }
  });

  // Ensure core collections exist for session flow
  if (!Array.isArray(data.questions)) {
    data.questions = [];
  }
  if (!Array.isArray(data.answers)) {
    data.answers = [];
  }
  if (!Array.isArray(data.results)) {
    data.results = [];
  }
  
  return data;
}

// Calculate metrics based on session data
export function calculateSessionMetrics(
  type: SessionTypeEnum | SessionType,
  data: Record<string, any>,
  duration: number
): Record<string, number> {
  const config = getSessionConfig(type);
  const metrics: Record<string, number> = {};
  
  // Add primary metric
  if (config.schema.metrics.primary) {
    metrics.primary = data[config.schema.metrics.primary] || 0;
  }
  
  // Add secondary metrics
  config.schema.metrics.secondary?.forEach(metricName => {
    metrics[metricName] = data[metricName] || 0;
  });
  
  // Calculate derived metrics
  config.schema.metrics.calculated?.forEach(calc => {
    try {
      // Simplified calculation - in production, use a proper expression evaluator
      let formula = calc.formula;
      Object.keys(data).forEach(key => {
        formula = formula.replace(new RegExp(key, 'g'), data[key]);
      });
      formula = formula.replace(/duration/g, duration.toString());
      metrics[calc.name] = eval(formula);
    } catch (e) {
      console.error(`Error calculating metric ${calc.name}:`, e);
      metrics[calc.name] = 0;
    }
  });
  
  return metrics;
}
