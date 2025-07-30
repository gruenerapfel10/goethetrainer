/**
 * @ Mention processing utilities
 * Handles detection and styling of @filename mentions in text
 */

import React from 'react';

export interface FileMention {
  text: string;
  fileName: string;
  start: number;
  end: number;
}

/**
 * Extract @ mentions from text
 * Matches @filename patterns (@ followed by non-whitespace until space or end)
 */
export function extractMentions(text: string): FileMention[] {
  const mentions: FileMention[] = [];
  const regex = /@([^\s]+)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    mentions.push({
      text: match[0],
      fileName: match[1],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return mentions;
}

/**
 * Process text with @ mentions and return HTML with styled mentions
 * @param text - The text to process
 * @param availableFiles - Map of filename to file info (url, etc)
 * @param className - CSS classes for mention styling
 */
export function processTextWithMentions(
  text: string,
  availableFiles: Map<string, { url?: string }>,
  className = 'bg-orange-200/50 dark:bg-orange-800/50 rounded-md px-1 cursor-pointer hover:underline'
): string {
  const mentions = extractMentions(text);
  
  if (mentions.length === 0) {
    return escapeHtml(text);
  }

  let result = '';
  let lastIndex = 0;

  mentions.forEach((mention) => {
    // Add text before mention
    result += escapeHtml(text.slice(lastIndex, mention.start));

    // Check if this is a valid file mention
    const fileInfo = availableFiles.get(mention.fileName);
    
    if (fileInfo) {
      // Create styled mention
      result += `<span class="${className}" data-mention="${escapeHtml(mention.text)}"${
        fileInfo.url ? ` title="${escapeHtml(fileInfo.url)}"` : ''
      }>${escapeHtml(mention.text)}</span>`;
    } else {
      // Not a valid file, render as plain text
      result += escapeHtml(mention.text);
    }

    lastIndex = mention.end;
  });

  // Add remaining text
  result += escapeHtml(text.slice(lastIndex));

  return result;
}

/**
 * Convert internal @[filename] format to display @filename format
 */
export function convertMentionFormat(text: string): string {
  return text.replace(/@\[([^\]]+)\]/g, '@$1');
}

/**
 * Check if a filename matches a mention (handles both @filename and @[filename] formats)
 */
export function isMentionMatch(mention: string, fileName: string): boolean {
  // Remove @ and brackets if present
  const cleanMention = mention.replace(/^@\[?/, '').replace(/\]$/, '');
  return cleanMention === fileName;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Create React component for rendering text with mentions
 * This is for use in React components that need to handle click events
 */
export function createMentionElements(
  text: string,
  availableFiles: Map<string, { url?: string }>,
  onMentionClick?: (fileName: string, url?: string) => void
): React.ReactNode[] {
  const mentions = extractMentions(text);
  
  if (mentions.length === 0) {
    return [text];
  }

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;

  mentions.forEach((mention, index) => {
    // Add text before mention
    if (mention.start > lastIndex) {
      elements.push(text.slice(lastIndex, mention.start));
    }

    // Check if this is a valid file mention
    const fileInfo = availableFiles.get(mention.fileName);
    
    if (fileInfo) {
      // Create styled mention element
      elements.push(
        <span
          key={`mention-${index}`}
          className="bg-orange-200/50 dark:bg-orange-800/50 rounded-md px-1 cursor-pointer hover:underline inline-block"
          data-mention={mention.text}
          title={fileInfo.url}
          onClick={() => onMentionClick?.(mention.fileName, fileInfo.url)}
        >
          {mention.text}
        </span>
      );
    } else {
      // Not a valid file, render as plain text
      elements.push(mention.text);
    }

    lastIndex = mention.end;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements;
} 