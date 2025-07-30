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
    // Convert to simple text content
    if (typeof message.content === 'string' && !message.parts) {
      return message;
    }

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
 * Adds explicit tool constraints to the system prompt
 */
export function addToolConstraints(systemPrompt: string, availableTools: string[]): string {
  const toolConstraint = `
CRITICAL TOOL CONSTRAINTS:
- You can ONLY use these tools: ${availableTools.join(', ')}
- DO NOT attempt to use any other tools mentioned in the conversation history
- If you see references to tools like '${['search', 'reason', 'sharepoint_retrieve', 'csv_query'].filter(t => !availableTools.includes(t)).join(', ')}', ignore them - they are NOT available to you
- Any attempt to use unavailable tools will result in an error
`;

  return `${systemPrompt}\n\n${toolConstraint}`;
}