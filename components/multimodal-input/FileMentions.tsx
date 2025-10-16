'use client';

import { useState, useEffect, useMemo } from 'react';
import { FileMentionList } from '@/components/ui/file-mention-list';
import { AnimatePresence, motion } from 'framer-motion';
import { useChat, AttachmentType } from '@/contexts/chat-context';

export function FileMentions() {
  const { input, attachments, messages } = useChat();
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  
  // Track if we just selected a file to hide the dropdown
  const [justSelected, setJustSelected] = useState(false);

  // Build list of all available files
  const allFiles = useMemo(() => {
    const files = new Set<string>();
    
    // Add current attachments (both user files and KB files)
    attachments.forEach(a => a.name && files.add(a.name));
    
    // Add historical attachments from messages
    messages.forEach(message => {
      (message as any).experimental_attachments?.forEach((attachment: any) => {
        if (attachment.name) files.add(attachment.name);
      });
    });
    
    return Array.from(files);
  }, [attachments, messages]);

  // Detect @ mention in input
  const mentionMatch = useMemo(() => {
    if (justSelected) return { isActive: false, query: '' };
    
    // Find the last @ followed by any characters (including spaces) until the end of input
    // This regex captures everything after @ until the end, allowing spaces
    const match = input.match(/@([^@]*)$/);
    
    // Only show dropdown if we're actively typing after @, not if @ is followed by a complete filename and space
    if (match) {
      const query = match[1];
      
      // Check if we have a complete filename match followed by additional text
      // Split by spaces and check if any prefix matches a complete filename
      const parts = query.split(' ');
      if (parts.length > 1) {
        // Try to build up the filename from parts
        for (let i = 1; i <= parts.length; i++) {
          const potentialFilename = parts.slice(0, i).join(' ');
          // Check if this is an exact match for a file in our list
          if (allFiles.some(file => file === potentialFilename)) {
            // We found a complete match, so the mention is complete
            return { isActive: false, query: '' };
          }
        }
      }
      
      return { isActive: true, query };
    }
    
    return { isActive: false, query: '' };
  }, [input, justSelected, allFiles]);

  // Reset justSelected when input changes (user starts typing again)
  useEffect(() => {
    if (justSelected) {
      const timer = setTimeout(() => setJustSelected(false), 100);
      return () => clearTimeout(timer);
    }
  }, [input, justSelected]);

  // Filter files based on mention query
  const filteredFiles = useMemo(() => {
    if (!mentionMatch.isActive) return [];
    
    const query = mentionMatch.query.trim();
    
    // If no query after @ or just spaces, show all files
    if (!query) return allFiles;
    
    // Smart matching that handles spaces and partial matches
    const lowerQuery = query.toLowerCase();
    return allFiles.filter(file => {
      const lowerFile = file.toLowerCase();
      
      // First try exact prefix match
      if (lowerFile.startsWith(lowerQuery)) return true;
      
      // Then try matching with spaces removed
      const queryNoSpaces = lowerQuery.replace(/\s+/g, '');
      const fileNoSpaces = lowerFile.replace(/\s+/g, '');
      if (fileNoSpaces.startsWith(queryNoSpaces)) return true;
      
      // Finally try word-by-word matching
      const queryWords = lowerQuery.split(/\s+/).filter(Boolean);
      return queryWords.every(word => lowerFile.includes(word));
    });
  }, [mentionMatch, allFiles]);

  // Reset highlight when filtered files change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredFiles]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!mentionMatch.isActive || filteredFiles.length === 0) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          e.stopPropagation();
          setHighlightedIndex(prev => (prev + 1) % filteredFiles.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          e.stopPropagation();
          setHighlightedIndex(prev => (prev - 1 + filteredFiles.length) % filteredFiles.length);
          break;
        case 'Enter':
        case 'Tab':
          if (filteredFiles[highlightedIndex]) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            setJustSelected(true); // Hide dropdown after selection
            // File selection will be handled by Input component listening to this event
            window.dispatchEvent(new CustomEvent('mention-select', { 
              detail: { fileName: filteredFiles[highlightedIndex] }
            }));
          }
          break;
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent('mention-cancel'));
          break;
      }
    };
    
    // Use capture phase (true) to intercept events before they reach the input
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [mentionMatch.isActive, filteredFiles, highlightedIndex]);

  const handleSelect = (fileName: string) => {
    setJustSelected(true); // Hide dropdown after selection
    window.dispatchEvent(new CustomEvent('mention-select', { 
      detail: { fileName }
    }));
  };

  return (
    <AnimatePresence>
      {mentionMatch.isActive && filteredFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 5, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 5, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="relative w-full mb-2 rounded-lg border border-border bg-background shadow-lg overflow-hidden"
        >
          <div className="max-h-60 overflow-y-auto">
            <FileMentionList
              files={filteredFiles}
              highlightedIndex={highlightedIndex}
              setHighlightedIndex={setHighlightedIndex}
              onSelect={handleSelect}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}