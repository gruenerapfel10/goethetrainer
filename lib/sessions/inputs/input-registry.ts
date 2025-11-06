import { QuestionInputType, type RegisteredQuestionInputDefinition } from './types';

const registry = new Map<QuestionInputType, RegisteredQuestionInputDefinition>();

export function registerInputDefinition(definition: RegisteredQuestionInputDefinition): void {
  if (registry.has(definition.id)) {
    const existing = registry.get(definition.id);
    console.warn(
      `[inputs] Question input "${definition.id}" is already registered. ` +
        `Existing definition "${existing?.label}" will be overwritten.`,
    );
  }
  registry.set(definition.id, Object.freeze({ ...definition }));
}

export function getInputDefinition(inputType: QuestionInputType): RegisteredQuestionInputDefinition {
  const definition = registry.get(inputType);
  if (!definition) {
    throw new Error(`Question input "${inputType}" has not been registered`);
  }
  return definition;
}

export function hasInputDefinition(inputType: QuestionInputType): boolean {
  return registry.has(inputType);
}

export function listInputDefinitions(): RegisteredQuestionInputDefinition[] {
  return Array.from(registry.values());
}

/**
 * Clear the registry — exposed for testing to allow isolated setups.
 */
export function resetInputRegistry(): void {
  registry.clear();
}
