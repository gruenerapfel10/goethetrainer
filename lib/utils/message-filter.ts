import type { UIMessage } from 'ai';

/**
 * Filters out tool-related messages from conversation history to prevent tool inheritance
 * between different agents. This includes tool calls and tool results.
 */
export function filterToolMessages(messages: UIMessage[]): UIMessage[] {
  return messages.map(message => {
    // If the message doesn't have parts, return as-is
    if (!message.parts || !Array.isArray(message.parts)) {
      return message;
    }

    // Filter out tool-call and tool-result parts
    const filteredParts = message.parts.filter(part => {
      if (typeof part === 'object' && part !== null && 'type' in part) {
        // Remove tool-call and tool-result parts
        const partType = (part as any).type;
        if (partType === 'tool-call' || partType === 'tool-result') {
          return false;
        }
      }
      return true;
    });

    // If all parts were filtered out, keep at least a text part
    if (filteredParts.length === 0) {
      return {
        ...message,
        parts: [{ type: 'text', text: '' }]
      };
    }

    return {
      ...message,
      parts: filteredParts
    };
  });
}

/**
 * Filters messages to only include text content, removing all tool-related information
 * This is a more aggressive filter that only preserves text parts
 */
export function filterToTextOnly(messages: UIMessage[]): UIMessage[] {
  return messages.map(message => {
    // In AI SDK v5, UIMessage always uses parts
    // If message has parts, extract only text parts
    if (message.parts && Array.isArray(message.parts)) {
      const textContent = message.parts
        .filter(part => typeof part === 'string' || (typeof part === 'object' && part !== null && 'type' in part && (part as any).type === 'text'))
        .map(part => typeof part === 'string' ? part : (part as any).text || '')
        .join(' ');

      return {
        ...message,
        content: textContent,
        parts: [{ type: 'text' as const, text: textContent }], // Keep parts but only with text
      };
    }

    return message;
  });
}

/**
 * Cleans up orphaned tool calls by adding error results for incomplete tool-use blocks
 * This prevents the "tool_use without tool_result" error when conversations are interrupted
 * Also ensures input field is present to satisfy AWS Bedrock API requirements
 */
export function cleanupOrphanedToolCalls(messages: UIMessage[]): UIMessage[] {
  return messages.map(message => {
    if (message.role !== 'assistant' || !message.parts || !Array.isArray(message.parts)) {
      return message;
    }
    
    const fixedParts = message.parts.map(part => {
      if (!part || typeof part !== 'object') return part;
      const partType = (part as any).type;
      if (partType?.startsWith('tool-') && partType !== 'tool-result' && !(part as any).output) {
        return { 
          ...part, 
          // Ensure input field exists (preserve existing or provide empty object)
          input: (part as any).input || {},
          state: 'output-available', 
          output: { error: 'Tool call interrupted', success: false }
        } as any;
      }
      return part;
    });
    
    return { ...message, parts: fixedParts } as UIMessage;
  }) as UIMessage[];
}

/**
 * Removes messages with empty content or adds default text content to prevent API errors
 */
export function cleanupEmptyMessages(messages: UIMessage[]): UIMessage[] {
  return messages.filter(message => {
    // Remove messages with no parts
    if (!message.parts || !Array.isArray(message.parts) || message.parts.length === 0) {
      return false;
    }
    
    // Check if all parts are empty text
    const hasAnyContent = message.parts.some(part => {
      if (!part || typeof part !== 'object') return false;
      
      // For text parts, check if text is not empty
      if ((part as any).type === 'text') {
        return (part as any).text && (part as any).text.trim().length > 0;
      }
      
      // For non-text parts (tool calls, etc.), consider them as having content
      return true;
    });
    
    // Keep message only if it has some non-empty content
    return hasAnyContent;
  }).filter(message => message != null); // Remove any null/undefined messages
}

/**
 * Adds explicit tool constraints to the system prompt
 */
export function addToolConstraints(systemPrompt: string, availableTools: string[]): string {
  const toolConstraint = `
CRITICAL TOOL CONSTRAINTS:
- You can ONLY use these tools: ${availableTools.join(', ')}
- DO NOT attempt to use any other tools mentioned in the conversation history
- If you see references to tools like '${['web_search', 'reason', 'sharepoint_retrieve', 'csv_query'].filter(t => !availableTools.includes(t)).join(', ')}', ignore them - they are NOT available to you
- Any attempt to use unavailable tools will result in an error
`;

  return `${systemPrompt}\n\n${toolConstraint}`;
}