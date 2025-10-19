import { SessionTypeEnum } from './session-registry';

/**
 * Unified session update handler
 * Centralizes all session type updates into a single, type-safe function
 */
export function createUnifiedUpdateHandler(
  updateEndpoint: string,
  sessionId: string | null,
  sessionType: SessionTypeEnum | null
) {
  return async function updateSessionProgress(
    data: Record<string, any>
  ): Promise<Response | null> {
    // Validate session exists
    if (!sessionId || !sessionType) {
      console.warn('Cannot update session: No active session');
      return null;
    }

    try {
      const response = await fetch(`${updateEndpoint}/${sessionId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data,
          type: sessionType // Include type for validation
        })
      });

      if (!response.ok) {
        throw new Error(`Update failed: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error(`Failed to update ${sessionType} progress:`, error);
      throw error;
    }
  };
}

/**
 * Type guards for session data
 */
export const sessionDataValidators = {
  [SessionTypeEnum.READING]: (data: any) => {
    const validKeys = [
      'wordsRead', 'pagesRead', 'comprehensionScore', 
      'highlights', 'lookups', 'notes'
    ];
    return Object.keys(data).every(key => validKeys.includes(key));
  },
  
  [SessionTypeEnum.LISTENING]: (data: any) => {
    const validKeys = [
      'audioPlayed', 'totalAudioDuration', 'replays',
      'comprehensionScore', 'transcriptViews'
    ];
    return Object.keys(data).every(key => validKeys.includes(key));
  },
  
  [SessionTypeEnum.WRITING]: (data: any) => {
    const validKeys = [
      'wordCount', 'characterCount', 'finalText',
      'grammarErrors', 'spellingErrors', 'drafts'
    ];
    return Object.keys(data).every(key => validKeys.includes(key));
  },
  
  [SessionTypeEnum.SPEAKING]: (data: any) => {
    const validKeys = [
      'recordingDuration', 'transcription', 'wordCount',
      'fluencyScore', 'pronunciationScore', 'speechRate'
    ];
    return Object.keys(data).every(key => validKeys.includes(key));
  }
};

/**
 * Batch update handler for multiple field updates
 */
export interface BatchUpdate {
  field: string;
  value: any;
  timestamp?: number;
}

export class SessionUpdateBatcher {
  private updates: Map<string, any> = new Map();
  private updateTimer: NodeJS.Timeout | null = null;
  private readonly batchDelay: number;
  private readonly onFlush: (updates: Record<string, any>) => Promise<void>;

  constructor(
    onFlush: (updates: Record<string, any>) => Promise<void>,
    batchDelay: number = 1000
  ) {
    this.onFlush = onFlush;
    this.batchDelay = batchDelay;
  }

  add(field: string, value: any) {
    this.updates.set(field, value);
    this.scheduleBatch();
  }

  addMultiple(updates: Record<string, any>) {
    Object.entries(updates).forEach(([field, value]) => {
      this.updates.set(field, value);
    });
    this.scheduleBatch();
  }

  private scheduleBatch() {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    this.updateTimer = setTimeout(() => {
      this.flush();
    }, this.batchDelay);
  }

  async flush() {
    if (this.updates.size === 0) return;

    const updates = Object.fromEntries(this.updates);
    this.updates.clear();

    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }

    await this.onFlush(updates);
  }

  clear() {
    this.updates.clear();
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
  }
}