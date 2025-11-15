import type { SchedulingStrategy } from './base';
import { sm2Strategy } from './sm2';
import { fsrsStrategy } from './fsrs';

const registry = new Map<string, SchedulingStrategy>();

export const registerDefaultSchedulingStrategies = () => {
  [sm2Strategy, fsrsStrategy].forEach(strategy => {
    registry.set(strategy.id, strategy);
  });
};

export const getSchedulingStrategy = (id: string): SchedulingStrategy => {
  const strategy = registry.get(id);
  if (!strategy) {
    throw new Error(`Scheduling strategy ${id} not found`);
  }
  return strategy;
};

export const listSchedulingStrategies = () => Array.from(registry.values());
