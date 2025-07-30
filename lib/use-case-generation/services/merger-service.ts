import type { IUseCaseMerger } from '../interfaces';
import type { MessageMergeInfo } from '../types';
import { mergeMessagesIntoUseCase } from '../../db/queries';

export class UseCaseMergerService implements IUseCaseMerger {
  async mergeMessagesIntoUseCases(messagesToMerge: MessageMergeInfo[]): Promise<number> {
    
    const messagesToMergeCount = messagesToMerge.reduce((sum, item) => sum + item.messages.length, 0);
    
    if (messagesToMerge.length === 0) {
      return 0;
    }
    
    // Transform MessageMergeInfo to the format expected by mergeMessagesIntoUseCase
    const mergeData = messagesToMerge.map(item => ({
      useCaseId: item.useCaseId,
      messageIds: item.messages.map(m => m.id)
    }));
    
    // Use the existing function from queries.ts
    const actualMergedCount = await mergeMessagesIntoUseCase(mergeData);
    
    return actualMergedCount;
  }
} 