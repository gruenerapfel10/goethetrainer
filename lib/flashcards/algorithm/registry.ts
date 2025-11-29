import type { FlashcardAlgorithmImpl } from './base';
import { sequentialAlgorithm } from './sequential';
import { faustAlgorithm } from './faust';

const registry = new Map<string, FlashcardAlgorithmImpl>();

export const registerDefaultAlgorithms = () => {
  [sequentialAlgorithm, faustAlgorithm].forEach(algo => {
    registry.set(algo.id, algo);
  });
};

export const getAlgorithm = (id: string): FlashcardAlgorithmImpl => {
  const algo = registry.get(id);
  if (!algo) {
    throw new Error(`Algorithm ${id} not found`);
  }
  return algo;
};

export const listAlgorithms = () => Array.from(registry.values());
