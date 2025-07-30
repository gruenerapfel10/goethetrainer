// Enhanced cursor and mention management system
export class CursorManager {
  private element: HTMLElement | null = null;
  private mentionRegex = /(?:\s|^)@([^\s]*)$/;
  
  constructor(element: HTMLElement | null) {
    this.element = element;
  }

  setElement(element: HTMLElement | null) {
    this.element = element;
  }

  // Get current cursor position
  getCursorPosition(): number {
    if (!this.element) return 0;

    const selection = window.getSelection();
    if (!selection?.rangeCount) return 0;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(this.element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    return preCaretRange.toString().length;
  }

  // Set cursor position efficiently
  setCursorPosition(position: number): void {
    if (!this.element) return;

    const selection = window.getSelection();
    if (!selection) return;

    const { node, offset } = this.findNodeAtPosition(position);
    if (!node) return;

    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    
    selection.removeAllRanges();
    selection.addRange(range);
  }

  // Find node and offset for a given position
  private findNodeAtPosition(position: number): { node: Node | null; offset: number } {
    if (!this.element) return { node: null, offset: 0 };

    let currentPos = 0;
    const walker = document.createTreeWalker(
      this.element,
      NodeFilter.SHOW_TEXT,
      null,
    );

    let node;
    while ((node = walker.nextNode())) {
      const textLength = node.textContent?.length || 0;
      if (currentPos + textLength >= position) {
        return { node, offset: position - currentPos };
      }
      currentPos += textLength;
    }

    // Position beyond content - return last position
    const lastChild = this.element.lastChild;
    if (lastChild?.nodeType === Node.TEXT_NODE) {
      return { node: lastChild, offset: lastChild.textContent?.length || 0 };
    }
    return { node: this.element, offset: 0 };
  }

  // Get text content before cursor
  getTextBeforeCursor(): string {
    if (!this.element) return '';

    const selection = window.getSelection();
    if (!selection?.rangeCount) return '';

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(this.element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    return preCaretRange.toString();
  }

  // Check for @ mention at cursor
  getMentionContext(): { isTypingMention: boolean; query: string } {
    const textBefore = this.getTextBeforeCursor();
    const match = textBefore.match(this.mentionRegex);
    
    return {
      isTypingMention: !!match,
      query: match ? match[1] : ''
    };
  }

  // Insert mention pill efficiently
  insertMentionPill(fileName: string, fileUrl?: string): void {
    if (!this.element) return;

    const selection = window.getSelection();
    if (!selection?.rangeCount) return;

    const textBefore = this.getTextBeforeCursor();
    const atMatch = textBefore.match(this.mentionRegex);
    if (!atMatch) return;

    const atIndex = textBefore.lastIndexOf(atMatch[0]);
    
    // Create and configure mention pill
    const pill = this.createMentionPill(fileName, fileUrl);
    
    // Replace mention text with pill
    this.replaceTextWithNode(atIndex, atIndex + atMatch[0].length, pill);
    
    // Position cursor after pill
    this.positionCursorAfterNode(pill);
  }

  // Create mention pill element
  private createMentionPill(fileName: string, fileUrl?: string): HTMLElement {
    const pill = document.createElement('span');
    pill.className = 'bg-orange-200/50 dark:bg-orange-800/50 rounded-md px-1 cursor-pointer hover:underline';
    pill.setAttribute('data-mention', `@[${fileName}]`);
    pill.setAttribute('contenteditable', 'false');
    pill.textContent = `@${fileName}`;
    if (fileUrl) {
      pill.setAttribute('title', fileUrl);
    }
    return pill;
  }

  // Replace text range with node
  private replaceTextWithNode(startPos: number, endPos: number, node: Node): void {
    if (!this.element) return;

    const startInfo = this.findNodeAtPosition(startPos);
    const endInfo = this.findNodeAtPosition(endPos);
    
    if (!startInfo.node || !endInfo.node) return;

    const range = document.createRange();
    range.setStart(startInfo.node, startInfo.offset);
    range.setEnd(endInfo.node, endInfo.offset);
    range.deleteContents();
    range.insertNode(node);
  }

  // Position cursor after a node with space
  private positionCursorAfterNode(node: Node): void {
    const space = document.createTextNode(' ');
    node.parentNode?.insertBefore(space, node.nextSibling);

    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    range.setStartAfter(space);
    range.collapse(true);
    
    selection.removeAllRanges();
    selection.addRange(range);
  }

  // Get clean text content (without HTML)
  getTextContent(): string {
    return this.element?.innerText || '';
  }

  // Sync HTML content from text while preserving mentions
  syncHtmlFromText(text: string, fileMap: Map<string, { url: string }>): void {
    if (!this.element) return;

    const cursorPos = this.getCursorPosition();
    const html = this.generateHtmlFromText(text, fileMap);
    
    this.element.innerHTML = html;
    
    // Restore cursor position after HTML update
    requestAnimationFrame(() => {
      this.setCursorPosition(cursorPos);
    });
  }

  // Generate HTML from text with mention pills
  private generateHtmlFromText(text: string, fileMap: Map<string, { url: string }>): string {
    const parts = text.split(/(@\[[^\]]+\])/g);
    
    return parts.map(part => {
      const match = part.match(/@\[([^\]]+)\]/);
      if (match) {
        const fileName = match[1];
        const file = fileMap.get(fileName);
        const pill = this.createMentionPill(fileName, file?.url);
        return pill.outerHTML;
      }
      return this.escapeHtml(part);
    }).join('');
  }

  // Escape HTML special characters
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}