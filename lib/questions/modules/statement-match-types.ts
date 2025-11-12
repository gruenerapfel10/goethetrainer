import type { QuestionModuleSourceConfig } from './types';

export interface StatementMatchSourceConfig extends QuestionModuleSourceConfig {
  type: 'statement_matching';
  theme?: string;
  constructionMode?: 'auto' | 'planned_authors' | 'planned_sentence_pool';
  topicHint?: string;
  authorCount?: number;
  statementCount?: number;
  unmatchedCount?: number;
  startingStatementNumber?: number;
  workingTimeMinutes?: number;
  teilLabel?: string;
  gapCount?: number;
  sentencePoolSize?: number;
  includeZeroOption?: boolean;
}
