'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useChat as useAiChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { DefaultChatTransport } from 'ai';
import { generateUUID } from '@/lib/utils';
import { toast } from 'sonner';
import { unstable_serialize, useSWRConfig } from 'swr';
import { getChatHistoryPaginationKey } from '@/components/sidebar-history';
import { getAgentTypeFromModel, getAgentTools, getAgentFeatures, getAgentConfig, getAgentSuggestedActions } from '@/lib/ai/agents';
import type { SuggestedAction, AgentConfig } from '@/lib/ai/agents';
import { TOOL_METADATA } from '@/lib/ai/tools/tool-registry';
import type { ToolName } from '@/lib/ai/tools/tool-registry';
import type { FeatureName } from '@/lib/ai/features/feature-registry';
export enum AttachmentStatus {
  ERROR = 'error',
  UPLOADING = 'uploading',
  SENT = 'sent',
  READY = 'ready'
}

export enum AttachmentType {
  USER_FILE = 'user_file',  // Files uploaded by user (local files)
  KB_FILE = 'kb_file'        // Files from knowledge base (SharePoint/search)
}

type Attachment = {
  url?: string;
  name?: string;
  contentType?: string;
  size?: number;
  status?: AttachmentStatus;
  type?: AttachmentType;
  messageId?: string;        // Track which message this attachment belongs to
  // Additional metadata for KB files
  content?: string;          // Extracted text content for KB files
  thumbnailUrl?: string;     // Thumbnail for KB files
  metadata?: {
    isPdf?: boolean;
    contentLength?: number;
    isImage?: boolean;
    verified?: boolean;
    contentEmbedded?: boolean;
    [key: string]: any;
  };
};

// Tool and feature state management
export type AgentTools = Record<string, { active: boolean; metadata?: any }>;
export type AgentFeatures = Record<string, { active: boolean; metadata?: any }>;

interface ChatContextValue {
  id: string;
  messages: UIMessage[];
  setMessages: (messages: UIMessage[] | ((messages: UIMessage[]) => UIMessage[])) => void;
  status: 'ready' | 'submitted' | 'streaming' | 'error';
  error: Error | undefined;
  
  input: string;
  setInput: (input: string) => void;
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  
  sendMessage: () => void;
  regenerate: () => Promise<void>;
  stop: () => Promise<void>;
  abort: () => void;
  
  selectedModel: AgentConfig;
  setSelectedModel: (modelId: string) => void;
  agentTools: AgentTools;
  agentFeatures: AgentFeatures;
  setAgentTools: (tool: string, active: boolean) => void;
  setAgentFeatures: (feature: string, active: boolean) => void;
  
  systemQueue: string[];
  addToSystemQueue: (message: string) => void;
  clearSystemQueue: () => void;
  
  completedMessageIds: Set<string>;
  isReadonly: boolean;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({
  chatId,
  initialMessages,
  initialModel,
  isReadonly,
  children,
  shouldUpdateUrl = true,
}: {
  chatId: string;
  initialMessages: UIMessage[];
  initialModel: string;
  isReadonly: boolean;
  children: React.ReactNode;
  shouldUpdateUrl?: boolean; 
}) {
  const { mutate } = useSWRConfig();
  
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // Create initial selectedModel object with config
  const getConfigFromModelId = useCallback((modelId: string): AgentConfig => {
    const agentType = getAgentTypeFromModel(modelId);
    return getAgentConfig(agentType);
  }, []);

  const [selectedModel, setSelectedModelState] = useState<AgentConfig>(
    () => getConfigFromModelId(initialModel)
  );
  
  // Helper function to initialize tools for an agent config
  const initializeToolsForConfig = (config: AgentConfig): AgentTools => {
    const toolStates: AgentTools = {};
    config.tools.forEach((toolName: string) => {
      const metadata = TOOL_METADATA[toolName as keyof typeof TOOL_METADATA];
      if (metadata) {
        // Default: search enabled if toggleable, all non-toggleable tools are active
        const defaultActive = metadata.toggle ? (toolName === 'web_search') : true;
        toolStates[toolName] = {
          active: defaultActive,
          metadata
        };
      }
    });
    return toolStates;
  };
  
  // Helper function to initialize features for an agent config
  const initializeFeaturesForConfig = (config: AgentConfig): AgentFeatures => {
    const featureStates: AgentFeatures = {};
    config.features.forEach((featureName: string) => {
      const metadata = require('@/lib/ai/features/feature-registry').FEATURE_METADATA[featureName];
      if (metadata) {
        featureStates[featureName] = {
          active: false, // Features default to disabled
          metadata
        };
      }
    });
    return featureStates;
  };
  
  const [agentTools, setAgentToolsState] = useState<AgentTools>(() => 
    initializeToolsForConfig(selectedModel)
  );
  const [agentFeatures, setAgentFeaturesState] = useState<AgentFeatures>(() => 
    initializeFeaturesForConfig(selectedModel)
  );
  
  // Custom setter that handles model changes properly
  const setSelectedModel = useCallback((modelId: string) => {
    const newConfig = getConfigFromModelId(modelId);
    
    setSelectedModelState(newConfig);
    
    // Reinitialize tools and features for the new agent
    setAgentToolsState(initializeToolsForConfig(newConfig));
    setAgentFeaturesState(initializeFeaturesForConfig(newConfig));
    
    // Clean up unsupported attachments based on new agent capabilities
    setAttachments((prev) => {
      return prev.filter((attachment) => {
        // Check if attachment type is supported by new agent
        if (attachment.type === AttachmentType.KB_FILE) {
          // KB files require fileSearch feature to be active
          const newFeatures = initializeFeaturesForConfig(newConfig);
          return newFeatures.fileSearch !== undefined;
        } else if (attachment.type === AttachmentType.USER_FILE) {
          // User files require supportsFileAttachments
          return newConfig.supportsFileAttachments ?? true;
        }
        // Keep attachment if type is unknown (defensive)
        return true;
      });
    });
  }, [getConfigFromModelId]);
  const [completedMessageIds, setCompletedMessageIds] = useState<Set<string>>(new Set());
  const [systemQueue, setSystemQueue] = useState<string[]>([]);
  
  // Compute if any files are uploading from attachment statuses
  const hasProcessingFiles = attachments.some(attachment => attachment.status === AttachmentStatus.UPLOADING);
  
  // Function to update tool states with exclusion logic
  const setAgentTools = useCallback((tool: string, active: boolean) => {
    setAgentToolsState(prev => {
      const newState = { ...prev };
      
      // If activating a tool, check for exclusions
      if (active && prev[tool]?.metadata?.exclusions) {
        const exclusions = prev[tool].metadata.exclusions;
        // Disable any conflicting tools
        exclusions.forEach((excludedTool: string) => {
          if (newState[excludedTool] && newState[excludedTool].active) {
            newState[excludedTool] = {
              ...newState[excludedTool],
              active: false
            };
          }
        });
      }
      
      // Update the target tool
      newState[tool] = {
        ...newState[tool],
        active
      };
      
      return newState;
    });
  }, []);
  
  // Function to update feature states
  const setAgentFeatures = useCallback((feature: string, active: boolean) => {
    setAgentFeaturesState(prev => ({
      ...prev,
      [feature]: {
        ...prev[feature],
        active
      }
    }));
  }, []);
  
  // Update tools/features when model changes
  useEffect(() => {
    // Reset tool states for new model, preserving values where possible
    setAgentToolsState(prev => {
      const newState: AgentTools = {};
      selectedModel.tools.forEach((toolName: string) => {
        const metadata = TOOL_METADATA[toolName as keyof typeof TOOL_METADATA];
        if (metadata) {
          // Preserve active state if tool exists in previous state and is toggleable
          const previousActive = prev[toolName]?.active;
          const defaultActive = metadata.toggle ? (toolName === 'web_search') : true;
          newState[toolName] = {
            active: previousActive !== undefined && metadata.toggle ? previousActive : defaultActive,
            metadata
          };
        }
      });
      return newState;
    });
    
    // Reset features for new model
    const { FEATURE_METADATA } = require('@/lib/ai/features/feature-registry');
    setAgentFeaturesState(prev => {
      const newState: AgentFeatures = {};
      selectedModel.features.forEach((featureName: string) => {
        const metadata = FEATURE_METADATA[featureName];
        if (metadata) {
          // Preserve active state if feature exists in previous state
          const previousActive = prev[featureName]?.active;
          newState[featureName] = {
            active: previousActive !== undefined ? previousActive : false,
            metadata
          };
        }
      });
      return newState;
    });
  }, [selectedModel]);
  
  
  
  const {
    messages: chatMessages,
    setMessages,
    sendMessage: aiSendMessage,
    regenerate: aiRegenerate,
    status,
    error,
    stop,
  } = useAiChat({
    id: chatId,
    generateId: generateUUID,
    resume: initialMessages.length > 0, // Only resume if there are existing messages
    transport: new DefaultChatTransport({
      // Configure how to prepare the reconnection request
      prepareReconnectToStreamRequest: ({ id }) => ({
        api: `/api/chat/${id}/stream`,
        credentials: 'include',
        headers: {
          'X-Chat-Reconnect': 'true',
          'X-Chat-Id': id,
        },
      }),
    }),
    onFinish: async ({ message }) => {
      
      // Server already saved the message - just update UI state
      
      // Refresh sidebar history
      mutate(unstable_serialize(getChatHistoryPaginationKey));
      
      // Mark message as completed for UI animations
      if (message?.id && message.role === 'assistant') {
        setTimeout(() => {
          setCompletedMessageIds(prev => new Set([...prev, message.id]));
        }, 1000);
      }
    },
    onError: (error: any) => {
      console.error('[Chat Error]', error);
      
      // Ignore 409 errors (duplicate resume connections)
      if (error?.message?.includes('409') || error?.message?.includes('Already resuming')) {
        console.log('[Chat] Ignoring 409 duplicate resume error');
        return;
      }
      
      // Parse error response if it's JSON
      if (error?.message) {
        try {
          const errorData = JSON.parse(error.message);
          if (errorData.code === 'FILE_ACCESS_ERROR') {
            toast.error('File Access Error', {
              description: errorData.error,
              duration: 5000
            });
          } else if (errorData.code === 'TOO_MANY_FILES') {
            toast.error('Too Many Files', {
              description: errorData.error,
              duration: 5000
            });
          } else if (errorData.code === 'FILE_SIZE_ERROR') {
            toast.error('File Size Error', {
              description: errorData.error,
              duration: 5000
            });
          } else {
            toast.error(errorData.error || 'An error occurred, please try again!');
          }
        } catch {
          // If not JSON, show the raw error message
          const errorMessage = error.message || 'An error occurred, please try again!';
          if (errorMessage.includes('4.5 MB') || errorMessage.includes('document size')) {
            toast.error('Document Size Limit Exceeded', {
              description: 'AWS Bedrock has a 4.5MB limit for all documents combined. Please reduce the number or size of attached files.',
              duration: 6000
            });
          } else {
            toast.error(errorMessage);
          }
        }
      } else {
        toast.error('An error occurred, please try again!');
      }
    },
  });
  
  // Initialize chat messages if they're empty but we have initial messages
  useEffect(() => {
    if (chatMessages.length === 0 && initialMessages.length > 0) {
      const timer = setTimeout(() => {
        setMessages(initialMessages);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [chatMessages.length, initialMessages, setMessages]);

  // Fetch attachments when chat loads
  useEffect(() => {
    async function fetchAttachments() {
      try {
        const response = await fetch(`/api/chat/${chatId}/attachments`);
        if (response.ok) {
          const data = await response.json();
          if (data.attachments && Array.isArray(data.attachments)) {
            setAttachments(data.attachments.map((att: any) => ({
              ...att,
              status: AttachmentStatus.SENT
            })));
          }
        }
      } catch (error) {
        console.error('Failed to fetch attachments:', error);
      }
    }
    
    fetchAttachments();
  }, [chatId]);
  
  // Show error toast when status changes to error
  useEffect(() => {
    if (status === 'error') {
      console.log("*** gotcha");
      console.log(error);
      toast.error('An error occurred. Please try again later.');
    }
  }, [status]);
  

  // Wrapper for sendMessage to handle our custom logic
  const sendMessage = useCallback(() => {
    // Use current input and apply form validation
    const messageContent = input;
    
    // Apply form validation
    if (status === 'streaming' || status === 'submitted') {
      toast.error('Please wait for the current message to complete.');
      return;
    }

    if (status === 'error') {
      toast.error('Cannot submit while there is an error. Please try again later.');
      return;
    }

    if (hasProcessingFiles) {
      toast.error('Files are still being verified. Please wait for all files to finish processing before sending.', {
        description: 'This ensures all attachments are valid and accessible.',
        duration: 4000
      });
      return;
    }

    if (shouldUpdateUrl) {
      window.history.replaceState({}, '', `/chat/${chatId}`);
    }
    
    // Ensure content is never empty to prevent AI SDK v5 errors
    const safeContent = messageContent.trim() || ' ';
    
    // Filter only READY attachments to send
    const finalAttachments = attachments.filter(a => a.status === AttachmentStatus.READY);
    
    // Generate a messageId for this message
    const messageId = generateUUID();
    
    // Use system queue from state and clear it after reading
    const currentSystemQueue = systemQueue.length > 0 ? [...systemQueue] : null;
    if (currentSystemQueue) {
      // Clear the queue after reading it
      setSystemQueue([]);
    }

    const messageData = {
      id: chatId,
      selectedChatModel: selectedModel.agentType,
      agentTools,
      agentFeatures,
      systemQueue: currentSystemQueue, // Include system queue messages if available
    };
    
    // Create message parts: text + file attachments
    const messageParts: any[] = [
      { type: 'text', text: safeContent }
    ];
    
    // Add file parts for each attachment
    finalAttachments.forEach((attachment) => {
      messageParts.push({
        type: 'file',
        filename: attachment.name || 'file',
        mediaType: attachment.contentType || 'application/octet-stream',
        url: attachment.url || '',
        size: attachment.size
      });
    });
    
    // AI SDK v5: Send message with processed parts
    const messageToSend = {
      id: messageId,
      parts: messageParts,
      // Also include experimental_attachments for display purposes
      experimental_attachments: finalAttachments
    };
    
    // Mark attachments as SENT and associate them with the message
    setAttachments(prev => prev.map(a => 
      a.status === AttachmentStatus.READY
        ? { ...a, status: AttachmentStatus.SENT, messageId }
        : a
    ));
    
    // Call AI SDK's sendMessage with the message and our custom data
    aiSendMessage(messageToSend, {
      body: { 
        data: {
          ...messageData,
          // Pass attachments in the data so the server can access them
          attachments: finalAttachments
        },
      },
    });
    
    setInput('');
  }, [
    aiSendMessage,
    chatId,
    selectedModel,
    agentTools,
    agentFeatures,
    attachments,
    systemQueue,
    input,
    status,
    hasProcessingFiles,
  ]);
  
  useEffect(() => {
    const handlePageHide = () => {
      if (status === 'streaming') {
        stop();
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [status, stop]);

  useEffect(() => {
    return () => {
      if (status === 'streaming') {
        fetch(`/api/chat/${chatId}/cancel-reader`, {
          method: 'POST',
          credentials: 'include',
        }).catch(console.error);
      }
    };
  }, [chatId, status]);
  
  
  const addToSystemQueue = useCallback((message: string) => {
    setSystemQueue(prev => {
      // Check if this is a working version change message
      if (message.includes('Working version changed by user')) {
        // Extract document title from the message
        const titleMatch = message.match(/for document "([^"]+)"/);
        if (titleMatch) {
          const docTitle = titleMatch[1];
          // Remove any existing working version messages for this document
          const filtered = prev.filter(msg => 
            !msg.includes('Working version changed by user') || 
            !msg.includes(`for document "${docTitle}"`)
          );
          return [...filtered, message];
        }
      }
      // For non-version messages, just append
      return [...prev, message];
    });
  }, []);
  
  const clearSystemQueue = useCallback(() => {
    setSystemQueue([]);
  }, []);
  
  const abort = useCallback(async () => {
    console.log('abort called');
    
    stop();
    
    try {
      await fetch(`/api/chat/${chatId}/abort`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Error aborting stream:', error);
    }
  }, [chatId, stop]);
  
  // Wrapper for regenerate to include our custom data
  const regenerate = useCallback(() => {
    // Use AI SDK's regenerate with our custom data
    return aiRegenerate({
      body: {
        data: {
          id: chatId,
          selectedChatModel: selectedModel.agentType,
          agentTools,
          agentFeatures,
        }
      }
    });
  }, [aiRegenerate, chatId, selectedModel, agentTools, agentFeatures]);
  

  const value: ChatContextValue = {
    id: chatId,
    messages: chatMessages,
    setMessages,
    status,
    error,
    
    input,
    setInput,
    attachments,
    setAttachments,
    
    sendMessage,
    regenerate,
    stop,
    abort,
    
    selectedModel,
    setSelectedModel,
    agentTools,
    agentFeatures,
    setAgentTools,
    setAgentFeatures,
    
    systemQueue,
    addToSystemQueue,
    clearSystemQueue,
    
    completedMessageIds,
    isReadonly,
  };
  
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}