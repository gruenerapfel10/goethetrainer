'use client';

import { exampleSetup } from 'prosemirror-example-setup';
import { inputRules } from 'prosemirror-inputrules';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import React, { memo, useEffect, useRef, useCallback } from 'react';
import { useDebounceCallback } from 'usehooks-ts';

import type { Suggestion } from '@/lib/db/schema';
import {
  documentSchema,
  handleTransaction,
  headingRule,
} from '@/lib/editor/config';
import {
  buildContentFromDocument,
  buildDocumentFromContent,
  createDecorations,
} from '@/lib/editor/functions';
import {
  projectWithPositions,
  suggestionsPlugin,
  suggestionsPluginKey,
} from '@/lib/editor/suggestions';

type EditorProps = {
  content: string;
  onSaveContent: (updatedContent: string, debounce: boolean) => void;
  status: 'streaming' | 'idle';
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  suggestions: Array<Suggestion>;
};

function PureEditor({
  content,
  onSaveContent,
  suggestions,
  status,
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const lastContentRef = useRef<string>('');
  const saveContentRef = useRef(onSaveContent);

  // Keep saveContent ref up to date
  useEffect(() => {
    saveContentRef.current = onSaveContent;
  }, [onSaveContent]);

  // Create a stable debounced save function
  const debouncedSave = useDebounceCallback(
    useCallback((content: string) => {
      saveContentRef.current(content, false);
    }, []),
    2000
  );

  // Create the transaction handler
  const handleTransactionWithDebounce = useCallback((transaction: any, editorRef: any) => {
    handleTransaction({
      transaction,
      editorRef,
      saveContent: (updatedContent: string, debounce: boolean) => {
        // Update our cached content
        if (!transaction.getMeta('no-save')) {
          lastContentRef.current = updatedContent;
          
          if (debounce) {
            // Use the debounced version
            debouncedSave(updatedContent);
          } else {
            // Save immediately
            saveContentRef.current(updatedContent, false);
          }
        }
      },
    });
  }, [debouncedSave]);

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      const state = EditorState.create({
        doc: buildDocumentFromContent(content),
        plugins: [
          ...exampleSetup({ schema: documentSchema, menuBar: false }),
          inputRules({
            rules: [
              headingRule(1),
              headingRule(2),
              headingRule(3),
              headingRule(4),
              headingRule(5),
              headingRule(6),
            ],
          }),
          suggestionsPlugin,
        ],
      });

      editorRef.current = new EditorView(containerRef.current, {
        state,
      });
      
      // Store initial content
      lastContentRef.current = content;
    }

    return () => {
      if (editorRef.current) {
        // Cancel any pending saves
        debouncedSave.cancel();
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
    // NOTE: we only want to run this effect once
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setProps({
        dispatchTransaction: (transaction) => {
          handleTransactionWithDebounce(transaction, editorRef);
        },
      });
    }
  }, [handleTransactionWithDebounce]);

  useEffect(() => {
    if (editorRef.current && content !== lastContentRef.current) {
      const currentContent = buildContentFromDocument(
        editorRef.current.state.doc,
      );

      // Only update if content actually changed
      if (currentContent !== content) {
        try {
          const oldState = editorRef.current.state;
          const newDocument = buildDocumentFromContent(content);

          // Validate the new document is not empty or invalid
          if (newDocument.content.size === 0 && content.trim().length > 0) {
            console.warn('Failed to parse content, skipping update');
            return;
          }

          // Create transaction to update content
          const transaction = oldState.tr.replaceWith(
            0,
            oldState.doc.content.size,
            newDocument.content,
          );

          // Mark as external update to preserve cursor
          transaction.setMeta('no-save', true);

          // Dispatch transaction
          editorRef.current.dispatch(transaction);
          
          // Update cached content
          lastContentRef.current = content;
        } catch (error) {
          console.error('Error updating editor content:', error);
        }
      }
    }
  }, [content, status]);

  useEffect(() => {
    if (editorRef.current?.state.doc && content) {
      try {
        const projectedSuggestions = projectWithPositions(
          editorRef.current.state.doc,
          suggestions,
        ).filter(
          (suggestion) => suggestion.selectionStart && suggestion.selectionEnd,
        );

        const decorations = createDecorations(
          projectedSuggestions,
          editorRef.current,
        );

        const transaction = editorRef.current.state.tr;
        transaction.setMeta(suggestionsPluginKey, { decorations });
        transaction.setMeta('no-save', true); // Mark as external update
        editorRef.current.dispatch(transaction);
      } catch (error) {
        console.error('Error updating suggestions:', error);
      }
    }
  }, [suggestions, content]);

  return (
    <div
      className="relative prose dark:prose-invert gilesta:prose-invert"
      ref={containerRef}
    />
  );
}

export default memo(PureEditor);
