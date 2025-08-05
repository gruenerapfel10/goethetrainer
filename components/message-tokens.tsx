'use client';

/**
 * MessageTokens and MessagePrompt Components
 * 
 * These components provide debugging information for AI chat messages:
 * - MessageTokens: Shows token count breakdown for user messages
 * - MessagePrompt: Shows the complete raw prompt sent to the AI
 * 
 * VISIBILITY REQUIREMENTS:
 * - Only visible to authenticated users (TODO: add admin check with Firebase custom claims)
 * - Only visible when debug mode is enabled (NEXT_PUBLIC_DEBUG_MODE=true in .env)
 * 
 * To enable debug mode:
 * 1. Add NEXT_PUBLIC_DEBUG_MODE=true to your .env file
 * 2. Ensure the user is an admin in the database
 * 3. Restart the application
 */

import type { UIMessage } from 'ai';
import { useMemo } from 'react';
// Auth removed - no sessions needed
// import { useSession } from 'next-auth/react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Badge } from './ui/badge';
import { FileTextIcon, AlertTriangleIcon, CodeIcon } from 'lucide-react';
import type { FileSearchResult } from '@/components/chat-header';
import { toast } from 'sonner';

interface MessageTokensProps {
  message: UIMessage;
  systemPrompt?: string;
  attachedFiles?: FileSearchResult[];
}

interface MessagePromptProps {
  message: UIMessage;
  systemPrompt?: string;
  attachedFiles?: FileSearchResult[];
}

const calculateTokensFromWords = (text: string) => {
  if (!text) return 0;
  const wordCount = text.trim().split(/\s+/).length;
  return Math.ceil(wordCount / 3);
}

// Check if debug mode is enabled
const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

export function MessagePrompt({ message, systemPrompt = '', attachedFiles }: MessagePromptProps) {
  // Auth removed - no sessions needed
  const session = null;
  
  const fullPrompt = useMemo(() => {
    const totalTokens = calculateTokensFromWords(systemPrompt) + 
      calculateTokensFromWords(typeof message.content === 'string' ? message.content : '') +
      (attachedFiles?.reduce((sum, file) => sum + calculateTokensFromWords(file.content), 0) || 0);
    
    const isOverThreshold = totalTokens > 150000;
    const mode = isOverThreshold ? 'retrieval' : 'direct inclusion';

    console.log(attachedFiles);
    
    let prompt = `=== COMPLETE RAW PROMPT ===\n\n`;
    prompt += `[SYSTEM PROMPT]\n${systemPrompt}\n\n`;
    
    if (attachedFiles && attachedFiles.length > 0) {
      prompt += `[ATTACHED FILES - ${mode.toUpperCase()} MODE]\n`;
      if (isOverThreshold) {
        prompt += `Files over 200k token threshold - using retrieval tool:\n`;
        attachedFiles.forEach((file, index) => {
          prompt += `${index + 1}. ${file.title} (${calculateTokensFromWords(file.content)} tokens)\n   URL: ${file.url}\n`;
        });
      } else {
        prompt += `Files under 200k token threshold - analyze directly:\n\n`;
        attachedFiles.forEach((file, index) => {
          prompt += `--- FILE ${index + 1}: ${file.title} ---\n`;
          prompt += `URL: ${file.url}\n`;
          prompt += `Content:\n${file.content}\n\n`;
        });
      }
      prompt += `\n`;
    }
    
    prompt += `[USER MESSAGE]\n${typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}\n\n`;
    prompt += `=== PROMPT STATS ===\n`;
    prompt += `Total Tokens: ${totalTokens.toLocaleString()}\n`;
    prompt += `Mode: ${mode}\n`;
    prompt += `Threshold: 200,000 tokens`;
    
    return prompt;
  }, [message, systemPrompt, attachedFiles]);

  // Only show for admin users when debug mode is enabled
  // TODO: Implement Firebase custom claims for admin check
  if (!session?.user || !isDebugMode) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="text-xs font-mono p-1 w-fit cursor-pointer hover:bg-accent">
          <CodeIcon className="h-3 w-3 mr-1" />
          Raw Prompt
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-4xl max-h-96 overflow-auto">
        <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-3 rounded border max-w-full">
          {fullPrompt}
        </pre>
      </TooltipContent>
    </Tooltip>
  );
}

export function MessageTokens({ message, systemPrompt = '', attachedFiles }: MessageTokensProps) {
  // Auth removed - no sessions needed
  const session = null;
  
  const tokenDetails = useMemo(() => {
    // Calculate tokens for user message content
    let userMessageTokens = 0;
    if (typeof message.content === 'string') {
      userMessageTokens = calculateTokensFromWords(message.content);
    } else if (Array.isArray(message.parts)) {
      for (const part of message.parts) {
        if (typeof part === 'string') {
          userMessageTokens += calculateTokensFromWords(part);
        } else if (part.type === 'text' && part.text) {
          userMessageTokens += calculateTokensFromWords(part.text);
        }
      }
    }

    // Calculate tokens for system prompt
    const systemPromptTokens = calculateTokensFromWords(systemPrompt);

    // Calculate tokens for attached files using the accurate method
    const fileTokens = attachedFiles?.map(file => {
      const tokens = calculateTokensFromWords(file.content);

      return {
        title: file.title,
        url: file.url,
        content: file.content,
        sizeInBytes: file.sizeInBytes,
        tokens: tokens,
      };
    }) || [];

    const totalFileTokens = fileTokens.reduce((sum, file) => sum + file.tokens, 0);
    const totalTokens = userMessageTokens + systemPromptTokens + totalFileTokens;

    return {
      userMessageTokens,
      systemPromptTokens,
      fileTokens,
      totalFileTokens,
      totalTokens
    };
  }, [message, systemPrompt, attachedFiles]);

  // Only show for admin users when debug mode is enabled
  // TODO: Implement Firebase custom claims for admin check
  if (!session?.user || !isDebugMode) {
    return null;
  }

  const TOKEN_THRESHOLD = 150000; // 150k tokens
  const isOverThreshold = tokenDetails.totalTokens > TOKEN_THRESHOLD;

  const handleFileClick = async (s3Url: string) => {
    try {
      const response = await fetch('/api/files/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Url }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.presignedUrl) {
          window.open(data.presignedUrl, "_blank", "noopener,noreferrer");
        } else {
          toast.error("Failed to get presigned URL.");
        }
      } else {
        const errorData = await response.json();
        toast.error(`Error: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching presigned URL:', error);
      toast.error("Failed to fetch presigned URL.");
    }
  };

  return (
    <div className="flex items-center gap-2 mt-1">
      {/* Token count badge */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="text-xs font-mono p-1 w-fit cursor-pointer">
            <FileTextIcon className="h-3 w-3 mr-1" />
            {tokenDetails.totalTokens.toLocaleString()} tokens
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-md">
          <div className="space-y-2 text-sm">
            <div className="font-medium">Token Breakdown:</div>
            
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>User Message:</span>
                <span className="font-mono">{tokenDetails.userMessageTokens.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between">
                <span>System Prompt:</span>
                <span className="font-mono">{tokenDetails.systemPromptTokens.toLocaleString()}</span>
              </div>
              
              {tokenDetails.fileTokens.length > 0 && (
                <>
                  <div className="border-t pt-1 mt-1">
                    <div className="font-medium text-xs mb-1">Attached Files:</div>
                    {tokenDetails.fileTokens.map((file, index) => (
                      <div key={index} className="ml-2 space-y-1">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate" title={file.title}>
                              {file.title}
                            </div>
                            <div className="text-xs opacity-60">
                              {file.sizeInBytes ? 
                                `${(file.sizeInBytes / 1024).toFixed(2)} KB` : 
                                `Excerpt`}
                            </div>
                          </div>
                          <span className="font-mono text-xs whitespace-nowrap">
                            {file.tokens.toLocaleString()}
                          </span>
                        </div>
                        
                        {/* File actions */}
                        <div className="flex gap-1 ml-0">
                          {file.url.startsWith('s3://') && (
                            <button
                              onClick={() => handleFileClick(file.url)}
                              className="text-xs text-blue-500 hover:text-blue-700 underline"
                            >
                              Open File
                            </button>
                          )}
                          <details className="text-xs">
                            <summary className="cursor-pointer text-blue-500 hover:text-blue-700 underline">
                              View Raw Content
                            </summary>
                            <div className="mt-1 p-2 bg-muted rounded text-xs font-mono whitespace-pre-wrap max-h-32 overflow-auto border">
                              {file.content}
                            </div>
                          </details>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between border-t pt-1 font-medium">
                    <span>Total Files:</span>
                    <span className="font-mono">{tokenDetails.totalFileTokens.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex justify-between border-t pt-1 font-bold">
              <span>Total:</span>
              <span className="font-mono">{tokenDetails.totalTokens.toLocaleString()}</span>
            </div>
            
            <div className="border-t pt-2 mt-2 text-xs opacity-60">
              Estimation: 1 token ≈ 3 words
              {isOverThreshold && (
                <div className="text-destructive mt-1">
                  ⚠️ Over threshold - AI will use retrieval instead of direct file inclusion
                </div>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Warning badge if over threshold */}
      {isOverThreshold && (
        <Badge variant="destructive" className="text-xs font-mono p-1 w-fit">
          <AlertTriangleIcon className="h-3 w-3 mr-1" />
          Over 200k tokens - using retrieval mode
        </Badge>
      )}

      {/* Raw prompt debug badge */}
      <MessagePrompt 
        message={message} 
        systemPrompt={systemPrompt} 
        attachedFiles={attachedFiles} 
      />
    </div>
  );
} 