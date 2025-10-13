import type { UIMessage } from 'ai';
import type { AppNotification } from './types';

export interface AnalysisResult {
  shouldNotify: boolean;
  notifications: Omit<AppNotification, 'id' | 'timestamp' | 'read'>[];
}

export class SmartNotificationAnalyzer {
  private static instance: SmartNotificationAnalyzer;
  
  // Keywords that indicate important messages
  private urgentKeywords = [
    'urgent', 'asap', 'emergency', 'critical', 'important', 'deadline',
    'help', 'error', 'failed', 'breaking', 'alert', 'warning'
  ];

  private questionWords = [
    'what', 'how', 'when', 'where', 'why', 'who', 'which', 'can you',
    'could you', 'would you', 'should', 'need', '?'
  ];

  private taskKeywords = [
    'todo', 'task', 'reminder', 'schedule', 'plan', 'due', 'deadline',
    'complete', 'finish', 'do', 'need to', 'should', 'must'
  ];

  private mentionPatterns = [
    /@\w+/g, // @username
    /\b(you|your|yours)\b/gi, // Direct address
  ];

  static getInstance(): SmartNotificationAnalyzer {
    if (!SmartNotificationAnalyzer.instance) {
      SmartNotificationAnalyzer.instance = new SmartNotificationAnalyzer();
    }
    return SmartNotificationAnalyzer.instance;
  }

  analyzeMessage(message: UIMessage, chatId: string, context?: {
    userName?: string;
    isUserMentioned?: boolean;
    previousMessages?: UIMessage[];
  }): AnalysisResult {
    const notifications: Omit<AppNotification, 'id' | 'timestamp' | 'read'>[] = [];
    
    // Extract text content from message
    const textContent = this.extractTextFromMessage(message);
    if (!textContent) {
      return { shouldNotify: false, notifications: [] };
    }

    const lowerText = textContent.toLowerCase();

    // Check for mentions
    if (this.containsMention(textContent) || context?.isUserMentioned) {
      notifications.push({
        type: 'mention',
        title: `${message.role === 'assistant' ? 'AI Assistant' : 'User'} mentioned you`,
        message: this.truncateText(textContent, 100),
        priority: 'high',
        source: {
          type: 'chat',
          id: chatId,
          name: message.role === 'assistant' ? 'AI Assistant' : 'User',
        },
        actions: [
          {
            label: 'View',
            action: 'navigate',
            primary: true,
            data: { url: `/chat/${chatId}` },
          },
        ],
      });
    }

    // Check for urgent messages
    const urgencyScore = this.calculateUrgencyScore(lowerText);
    if (urgencyScore > 0.5) {
      const urgentWords = this.urgentKeywords.filter(word => lowerText.includes(word));
      notifications.push({
        type: 'warning',
        title: 'Urgent Message Detected',
        message: `Contains urgent keywords: ${urgentWords.join(', ')}`,
        priority: urgencyScore > 0.8 ? 'urgent' : 'high',
        source: {
          type: 'chat',
          id: chatId,
        },
        metadata: {
          urgencyScore,
          urgentKeywords: urgentWords,
        },
        actions: [
          {
            label: 'View',
            action: 'navigate',
            primary: true,
            data: { url: `/chat/${chatId}` },
          },
        ],
      });
    }

    // Check for questions
    if (this.containsQuestion(textContent) && message.role === 'user') {
      notifications.push({
        type: 'info',
        title: 'Question Asked',
        message: this.truncateText(textContent, 100),
        priority: 'medium',
        source: {
          type: 'chat',
          id: chatId,
        },
        actions: [
          {
            label: 'Answer',
            action: 'navigate',
            primary: true,
            data: { url: `/chat/${chatId}` },
          },
        ],
      });
    }

    // Check for task-related content
    const taskScore = this.calculateTaskScore(lowerText);
    if (taskScore > 0.4) {
      const taskKeywords = this.taskKeywords.filter(word => lowerText.includes(word));
      notifications.push({
        type: 'task',
        title: 'Task Identified',
        message: this.extractPotentialTask(textContent),
        priority: 'medium',
        source: {
          type: 'chat',
          id: chatId,
        },
        metadata: {
          taskScore,
          taskKeywords,
        },
        actions: [
          {
            label: 'View Task',
            action: 'navigate',
            primary: true,
            data: { url: `/chat/${chatId}` },
          },
          {
            label: 'Add to Calendar',
            action: 'callback',
            data: { handler: 'addToCalendar' },
          },
        ],
      });
    }

    // Check for errors in assistant responses
    if (message.role === 'assistant' && this.containsError(textContent)) {
      notifications.push({
        type: 'error',
        title: 'AI Assistant Error',
        message: 'The AI assistant encountered an error in its response',
        priority: 'high',
        source: {
          type: 'chat',
          id: chatId,
          name: 'AI Assistant',
        },
        actions: [
          {
            label: 'View Error',
            action: 'navigate',
            primary: true,
            data: { url: `/chat/${chatId}` },
          },
          {
            label: 'Retry',
            action: 'callback',
            data: { handler: 'retryMessage' },
          },
        ],
      });
    }

    // Check for code or attachments
    /* FIXME(@ai-sdk-upgrade-v5): The `experimental_attachments` property has been replaced with the parts array. Please manually migrate following https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0#attachments--file-parts */
    if (this.containsCode(textContent) || message.experimental_attachments?.length) {
      /* FIXME(@ai-sdk-upgrade-v5): The `experimental_attachments` property has been replaced with the parts array. Please manually migrate following https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0#attachments--file-parts */
      notifications.push({
        type: 'info',
        title: 'Content with Code/Files',
        message: message.experimental_attachments?.length 
          ? `Message contains ${message.experimental_attachments.length} attachment(s)`
          : 'Message contains code',
        priority: 'low',
        source: {
          type: 'chat',
          id: chatId,
        },
        actions: [
          {
            label: 'View',
            action: 'navigate',
            primary: true,
            data: { url: `/chat/${chatId}` },
          },
        ],
      });
    }

    return {
      shouldNotify: notifications.length > 0,
      notifications,
    };
  }

  analyzeChatSession(messages: UIMessage[], chatId: string): AnalysisResult {
    const notifications: Omit<AppNotification, 'id' | 'timestamp' | 'read'>[] = [];

    // Analyze conversation patterns
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');

    // Check for long conversation without breaks
    if (messages.length > 20) {
      const firstMessage = messages[0];
      const lastMessage = messages[messages.length - 1];
      const duration = lastMessage.createdAt && firstMessage.createdAt
        ? new Date(lastMessage.createdAt).getTime() - new Date(firstMessage.createdAt).getTime()
        : 0;

      if (duration > 2 * 60 * 60 * 1000) { // More than 2 hours
        notifications.push({
          type: 'reminder',
          title: 'Long Chat Session',
          message: `You've been chatting for over 2 hours. Consider taking a break!`,
          priority: 'low',
          source: {
            type: 'system',
          },
        });
      }
    }

    // Check for repeated questions
    const recentUserMessages = userMessages.slice(-5);
    const questionMessages = recentUserMessages.filter(m => 
      this.containsQuestion(this.extractTextFromMessage(m))
    );

    if (questionMessages.length >= 3) {
      notifications.push({
        type: 'info',
        title: 'Multiple Questions',
        message: 'You\'ve asked several questions recently. The AI is ready to help!',
        priority: 'low',
        source: {
          type: 'system',
        },
      });
    }

    return {
      shouldNotify: notifications.length > 0,
      notifications,
    };
  }

  private extractTextFromMessage(message: UIMessage): string {
    if (!message.parts || !Array.isArray(message.parts)) {
      return typeof message.content === 'string' ? message.content : '';
    }

    return message.parts
      .filter((part: any) => part.type === 'text' && part.text)
      .map((part: any) => part.text)
      .join('\n\n');
  }

  private containsMention(text: string): boolean {
    return this.mentionPatterns.some(pattern => pattern.test(text));
  }

  private containsQuestion(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.questionWords.some(word => lowerText.includes(word)) || text.includes('?');
  }

  private containsError(text: string): boolean {
    const errorKeywords = ['error', 'failed', 'exception', 'unable to', 'cannot', 'sorry'];
    const lowerText = text.toLowerCase();
    return errorKeywords.some(keyword => lowerText.includes(keyword));
  }

  private containsCode(text: string): boolean {
    return text.includes('```') || text.includes('`') || /\b(function|class|const|let|var|if|else|for|while)\b/.test(text);
  }

  private calculateUrgencyScore(text: string): number {
    let score = 0;
    const words = text.split(/\s+/);
    
    for (const word of words) {
      if (this.urgentKeywords.includes(word)) {
        score += 0.2;
      }
    }

    // Check for urgency patterns
    if (text.includes('!!!') || text.includes('URGENT')) score += 0.3;
    if (text.includes('emergency')) score += 0.4;
    if (text.includes('asap') || text.includes('immediately')) score += 0.3;

    return Math.min(score, 1.0);
  }

  private calculateTaskScore(text: string): number {
    let score = 0;
    const words = text.split(/\s+/);
    
    for (const word of words) {
      if (this.taskKeywords.includes(word)) {
        score += 0.1;
      }
    }

    // Check for task patterns
    if (/\b(need to|should|must|have to)\b/.test(text)) score += 0.2;
    if (/\b(by|due|deadline)\s+\w+/.test(text)) score += 0.3;
    if (/\b(remind|schedule|plan)\b/.test(text)) score += 0.2;

    return Math.min(score, 1.0);
  }

  private extractPotentialTask(text: string): string {
    // Try to extract the task from the text
    const sentences = text.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase().trim();
      if (this.taskKeywords.some(keyword => lowerSentence.includes(keyword))) {
        return this.truncateText(sentence.trim(), 100);
      }
    }

    return this.truncateText(text, 100);
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }
}