import 'server-only';

import type { UIMessage } from 'ai';
import { generateUUID } from '@/lib/utils';
import { 
  getChatById, 
  getMessagesByChatId, 
  saveMessages,
  withinContext,
  getAttachmentsFromDb
} from '@/lib/db/queries';
import type { DBMessage, Chat } from '@/lib/db/queries';

export type Attachment = {
  url?: string;
  name?: string;
  contentType?: string;
  size?: number;
};

export type AttachmentWithContent = Attachment & {
  content?: string;
  error?: string;
};

interface ChatSettings {
  selectedModel: string;
  isDeepResearchEnabled: boolean;
  isFileSearchEnabled: boolean;
  isWebSearchEnabled: boolean;
  isImageGenerationEnabled: boolean;
}

export class ChatManager {
  private chatId: string;
  private userId: string | null = null;
  private messages: UIMessage[] = [];
  private settings: ChatSettings;
  private chat: Chat | null = null;
  private contextInfo: { messageIds: string[]; totalTokens: number; maxTokens?: number } | null = null;
  private contextWindow = 150000; // Default context window

  constructor(chatId: string) {
    this.chatId = chatId;
    this.settings = {
      selectedModel: 'eu.anthropic.claude-sonnet-4-20250514-v1:0',
      isDeepResearchEnabled: false,
      isFileSearchEnabled: false,
      isWebSearchEnabled: true,
      isImageGenerationEnabled: false,
    };
  }

  async initialize(userId?: string): Promise<void> {
    this.userId = userId ?? null;
    this.chat = await getChatById({ id: this.chatId });
    if (!this.chat) {
      // Chat not found in Firestore - this is expected after migration from PostgreSQL
      // Create a new chat with this ID to maintain compatibility
      const { saveChat } = await import('../db/queries');
      await saveChat({
        id: this.chatId,
        userId: userId || 'unknown-user',
        title: 'Migrated Chat'
      });
      this.chat = await getChatById({ id: this.chatId });
      if (!this.chat) {
        throw new Error(`Failed to create chat ${this.chatId}`);
      }
    }
    if (!this.userId && this.chat?.userId) {
      this.userId = this.chat.userId;
    }

    const dbMessages = await getMessagesByChatId({ id: this.chatId });
    this.messages = this.convertDBMessagesToUI(dbMessages);
  }

  private convertDBMessagesToUI(dbMessages: DBMessage[]): UIMessage[] {
    return dbMessages.map((message, idx) => {
      const attachments = (message.attachments as Array<Attachment>) ?? [];
      
      let parts = message.parts;
      
      if (!parts) {
        parts = [{ type: 'text', text: '' }];
      } else if (typeof parts === 'string') {
        parts = [{ type: 'text', text: parts }];
      } else if (!Array.isArray(parts)) {
        parts = [{ type: 'text', text: '' }];
      } else if (parts.length === 0) {
        parts = [{ type: 'text', text: '' }];
      }
      
      if (Array.isArray(parts)) {
        parts = parts.filter(Boolean).map((part: any, partIdx: number) => {
          if (!part) return null;
          
          if (part.type?.startsWith('tool-') && !part.type.includes('call') && !part.type.includes('result')) {
            if (!part.state) {
              part.state = part.output ? 'output-available' : 'input-available';
            }
          }
          return part;
        }).filter(Boolean);
      }
      
      // Convert attachments to file parts and add to parts
      if (attachments.length > 0 && Array.isArray(parts)) {
        const fileParts = attachments.map(att => ({
          type: 'file' as const,
          filename: att.name || 'file',
          mediaType: att.contentType || 'application/octet-stream',
          url: att.url || '',
          size: att.size
        }));
        parts = [...parts, ...fileParts];
      }

      const uiMessage: UIMessage = {
        id: message.id,
        role: message.role as 'user' | 'assistant',
        parts: parts as any,
      };
      
      // Add createdAt as a custom property
      (uiMessage as any).createdAt = message.createdAt;
      
      // Include token counts for debug mode
      (uiMessage as any).inputTokens = message.inputTokens || 0;
      (uiMessage as any).outputTokens = message.outputTokens || 0;
      
      // Include agentType and modelId for cost calculation
      (uiMessage as any).agentType = message.agentType || 'general-bedrock-agent';
      (uiMessage as any).modelId = message.modelId || '';
      
      return uiMessage;
    });
    
  }

  async getMessages(): Promise<UIMessage[]> {
    // Get IDs of messages that fit within context window
    const contextData = await withinContext(this.chatId, this.contextWindow);
    const validIdSet = new Set(contextData.messageIds);
    
    // Store the context info for later retrieval
    this.contextInfo = contextData;
    
    // If no messages in DB yet (new chat), return all messages
    if (validIdSet.size === 0) {
      return this.messages;
    }
    
    // Filter messages to only include those within context window
    const filteredMessages = this.messages.filter(msg => validIdSet.has(msg.id));
    
    return filteredMessages;
  }

  getContextInfo(): { messageIds: string[]; totalTokens: number; maxOutputTokens: number } | null {
    if (!this.contextInfo) return null;
    return {
      messageIds: this.contextInfo.messageIds,
      totalTokens: this.contextInfo.totalTokens,
      maxOutputTokens: this.contextInfo.maxTokens || this.contextWindow
    };
  }

  async addMessage(message: UIMessage, metadata?: { inputTokens?: number; outputTokens?: number, agentType?: string }): Promise<void> {
    const { inputTokens, outputTokens, agentType } = metadata || {};
    const messageParts = (message as any).parts || (message as any).content;

    if (Array.isArray(messageParts)) {
      const fileParts = messageParts.filter((p: any) => p.type === 'file');
    }
    
    this.messages.push(message);
    
    // Extract attachments from file parts in parts array (AI SDK v5)
    let attachments: any[] = [];
    let contentWithoutFiles = messageParts;
    
    // Handle undefined or invalid content
    if (!messageParts) {
      contentWithoutFiles = [{ type: 'text', text: '' }];
    } else if (Array.isArray(messageParts)) {
      // Filter out undefined and invalid parts
      const validParts = (messageParts as any[]).filter(part => part?.type);
      const fileParts = validParts.filter(part => part.type === 'file');
      const nonFileParts = validParts.filter(part => part.type !== 'file');
      
      // Add file parts to attachments
      if (fileParts.length > 0) {
        const fileAttachments = fileParts.map(part => ({
          url: part.url || part.data, // Some files might have data instead of URL
          name: part.filename || part.name || 'file',
          contentType: part.mediaType || part.contentType || part.mimeType || 'application/octet-stream',
          size: part.size
        }));
        attachments = fileAttachments;
      }
      
      // Keep only non-file parts in content, ensure at least one text part exists
      contentWithoutFiles = nonFileParts.length > 0 ? nonFileParts : [{ type: 'text', text: '' }];
    } else if (typeof messageParts === 'string') {
      // Handle string content
      contentWithoutFiles = [{ type: 'text', text: messageParts }];
    } else {
      // Fallback for any other content type
      contentWithoutFiles = [{ type: 'text', text: '' }];
    }

    // Convert UIMessage to DBMessage format - save content without file parts
    const dbMessage: DBMessage = {
      id: message.id || generateUUID(),
      chatId: this.chatId,
      userId: this.userId ?? this.chat?.userId ?? null,
      role: message.role as 'user' | 'assistant',
      parts: contentWithoutFiles as any, // Save content without file parts
      attachments: attachments, // Save extracted attachments separately
      createdAt: (message as any).createdAt instanceof Date ? (message as any).createdAt : new Date((message as any).createdAt || Date.now()),
      useCaseId: null,
      agentType: agentType || 'standard',
      modelId: this.settings.selectedModel,
      inputTokens: inputTokens || 0,
      outputTokens: outputTokens || 0,
      processed: false,
    };
    
    await saveMessages({ messages: [dbMessage] });
  }

  async updateMessages(messages: UIMessage[]): Promise<void> {
    this.messages = messages;
    
    const dbMessages: DBMessage[] = messages.map(msg => {
      // Extract file parts as attachments and keep non-file parts
      let attachments: any[] = [];
      const messageParts = (msg as any).parts || (msg as any).content;
      let contentWithoutFiles = messageParts;
      
      if (Array.isArray(messageParts)) {
        const validParts = (messageParts as any[]).filter(part => part?.type);
        const fileParts = validParts.filter(part => part.type === 'file');
        const nonFileParts = validParts.filter(part => part.type !== 'file');
        
        if (fileParts.length > 0) {
          attachments = fileParts.map(part => ({
            url: part.url || part.data,
            name: part.filename || part.name || 'file',
            contentType: part.mediaType || part.contentType || part.mimeType || 'application/octet-stream',
            size: part.size
          }));
        }
        
        contentWithoutFiles = nonFileParts.length > 0 ? nonFileParts : [{ type: 'text', text: '' }];
      }
      
      return {
        id: msg.id || generateUUID(),
        chatId: this.chatId,
        userId: this.userId ?? this.chat?.userId ?? null,
        role: msg.role as 'user' | 'assistant',
        parts: contentWithoutFiles as any, // Save content without file parts
        attachments: attachments,
        createdAt: (msg as any).createdAt || new Date(),
        useCaseId: null,
        agentType: 'standard',
        modelId: this.settings.selectedModel,
        inputTokens: 0,
        outputTokens: 0,
        processed: false,
      };
    });
    
    await saveMessages({ messages: dbMessages });
  }

  async appendMessage(role: 'user' | 'assistant', content: string, attachments?: Attachment[]): Promise<string> {
    const messageId = generateUUID();
    const messageParts: any[] = [{ type: 'text', text: content }];
    
    if (attachments && attachments.length > 0) {
      const fileParts = attachments.map(att => ({
        type: 'file' as const,
        filename: att.name || 'file',
        mediaType: att.contentType || 'application/octet-stream',
        url: att.url || '',
        size: att.size
      }));
      messageParts.push(...fileParts);
    }
    
    const message: UIMessage = {
      id: messageId,
      role,
      parts: messageParts,
      createdAt: new Date(),
    } as any;
    
    await this.addMessage(message);
    return messageId;
  }

  getSettings(): ChatSettings {
    return { ...this.settings };
  }

  getChatId(): string {
    return this.chatId;
  }

  getChat(): Chat | null {
    return this.chat;
  }

  isReadonly(): boolean {
    return this.chat?.visibility === 'public' || false;
  }

  async deleteMessage(messageId: string): Promise<void> {
    this.messages = this.messages.filter(m => m.id !== messageId);
    await this.updateMessages(this.messages);
  }

  async clearMessages(): Promise<void> {
    this.messages = [];
    await this.updateMessages(this.messages);
  }

  getLastUserMessage(): UIMessage | undefined {
    const userMessages = this.messages.filter(m => m.role === 'user');
    return userMessages[userMessages.length - 1];
  }

  getLastAssistantMessage(): UIMessage | undefined {
    const assistantMessages = this.messages.filter(m => m.role === 'assistant');
    return assistantMessages[assistantMessages.length - 1];
  }

  /**
   * Unified message saving for streaming responses
   * @param id - Message ID
   * @param content - Message content (can be text string or array of parts including tool calls)
   * @param isPartial - Whether this is a partial save (aborted stream)
   * @param usage - Token usage statistics
   */
  async saveStreamMessage(
    id: string,
    content: string | any[],
    isPartial = false,
    usage?: { inputTokens?: number; outputTokens?: number }
  ): Promise<void> {
    let messageContent: any[];
    
    if (typeof content === 'string') {
      // Simple text content
      messageContent = [{ type: 'text', text: content }];
    } else if (Array.isArray(content)) {
      // Already formatted content with potential tool calls
      messageContent = content;
    } else {
      // Fallback to empty text block (ensures at least one ContentBlock)
      messageContent = [{ type: 'text', text: '' }];
    }
    
    // Ensure we always have at least one ContentBlock for AI SDK v5
    if (messageContent.length === 0) {
      messageContent = [{ type: 'text', text: '' }];
    }
    
    const message: UIMessage = {
      id,
      role: 'assistant',
      parts: messageContent,
      createdAt: new Date(),
    } as any;

    await this.addMessage(message, usage);
    
  }

  async getAttachments(): Promise<any[]> {
    return await getAttachmentsFromDb(this.chatId);
  }
}

export async function getChatContext(chatId: string, userId?: string): Promise<ChatManager> {
  const context = new ChatManager(chatId);
  await context.initialize(userId);
  return context;
}

export async function getAttachments(chatId: string): Promise<any[]> {
  return await getAttachmentsFromDb(chatId);
}
