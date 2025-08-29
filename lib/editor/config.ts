import { textblockTypeInputRule } from 'prosemirror-inputrules';
import { Schema } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { Selection, } from 'prosemirror-state';
import type { Transaction } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { MutableRefObject } from 'react';

import { buildContentFromDocument } from './functions';

export const documentSchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
  marks: schema.spec.marks,
});

export function headingRule(level: number) {
  return textblockTypeInputRule(
    new RegExp(`^(#{1,${level}})\\s$`),
    documentSchema.nodes.heading,
    () => ({ level }),
  );
}

export const handleTransaction = ({
  transaction,
  editorRef,
  saveContent,
}: {
  transaction: Transaction;
  editorRef: MutableRefObject<EditorView | null>;
  saveContent: (updatedContent: string, debounce: boolean) => void;
}) => {
  if (!editorRef || !editorRef.current) return;

  // Store current selection information before applying transaction
  const oldState = editorRef.current.state;
  const oldSelection = oldState.selection;
  
  // Apply the transaction to get new state
  const newState = oldState.apply(transaction);

  // If this is a content update from external source (no-save meta), preserve selection
  if (transaction.getMeta('no-save')) {
    try {
      // Calculate the cursor position relative to the document length
      const oldDocLength = oldState.doc.content.size;
      const newDocLength = newState.doc.content.size;
      
      // If the document is empty, set cursor at start
      if (newDocLength === 0) {
        newState.selection = Selection.atStart(newState.doc);
      } else {
        // Try to preserve the relative position
        const oldPos = oldSelection.head;
        const oldPosRatio = oldDocLength > 0 ? oldPos / oldDocLength : 0;
        
        // Calculate new position, ensuring it's within bounds
        let newPos = Math.round(oldPosRatio * newDocLength);
        newPos = Math.max(0, Math.min(newPos, newDocLength));
        
        // Try to create a selection at the calculated position
        try {
          const $pos = newState.doc.resolve(newPos);
          newState.selection = Selection.near($pos);
        } catch (e) {
          // If that fails, try to find the nearest valid position
          if (newPos > newDocLength) {
            // If position is beyond document, go to end
            newState.selection = Selection.atEnd(newState.doc);
          } else {
            // Otherwise, find the nearest text position
            let validPos = newPos;
            while (validPos > 0) {
              try {
                const $validPos = newState.doc.resolve(validPos);
                newState.selection = Selection.near($validPos);
                break;
              } catch {
                validPos--;
              }
            }
            // If we couldn't find any valid position, go to start
            if (validPos === 0) {
              newState.selection = Selection.atStart(newState.doc);
            }
          }
        }
      }
    } catch (error) {
      // If all else fails, set selection at document end
      console.warn('Failed to preserve cursor position:', error);
      newState.selection = Selection.atEnd(newState.doc);
    }
  }

  // Update editor state
  editorRef.current.updateState(newState);

  // Only trigger save if this was a user-initiated change
  if (transaction.docChanged && !transaction.getMeta('no-save')) {
    const updatedContent = buildContentFromDocument(newState.doc);

    if (transaction.getMeta('no-debounce')) {
      saveContent(updatedContent, false);
    } else {
      saveContent(updatedContent, true);
    }
  }
};
