import type { SessionType } from './types';

export enum SessionTypeEnum {
  READING = 'reading',
  LISTENING = 'listening',
  WRITING = 'writing',
  SPEAKING = 'speaking',
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
  };
  
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

export function validateSessionData(
  type: SessionTypeEnum | SessionType,
  data: Record<string, any>
): { valid: boolean; errors?: string[] } {
  const config = getSessionConfig(type);
  const errors: string[] = [];
  
  // Check required fields
  Object.entries(config.schema.fields).forEach(([fieldName, fieldDef]) => {
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
  const data: Record<string, any> = {};
  
  Object.entries(config.schema.fields).forEach(([fieldName, fieldDef]) => {
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