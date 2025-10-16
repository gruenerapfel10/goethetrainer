'use client';

import React, { memo, useMemo } from 'react';
import type { UIMessage } from 'ai';
import { extractSourcesFromMessage } from '@/lib/sources';
import { detectXMLTags, processXMLContent } from '../XML/XMLHandler';
import { ToolHandler } from '../tools/ToolHandler';
import { TextRenderer } from './TextRenderer';
import type { MessageContentProps } from './types';

const generateStableKey = (
  messageId: string,
  partType: string,
  index: number,
): string => {
  return `${messageId}-${partType}-${index}`;
};

export const MessageContentOrchestrator = memo<MessageContentProps>(
  ({
    message,
    mode,
    isReadonly,
    setMode,
    setMessages,
    regenerate,
    messages,
    selectedFiles,
    isLoading = false,
    allAttachmentsMap,
  }) => {
    const sources = useMemo(
      () => extractSourcesFromMessage(message as any),
      [message],
    );

    const fileMap = useMemo(() => {
      if (allAttachmentsMap && allAttachmentsMap.size > 0) {
        return allAttachmentsMap;
      }

      const map = new Map<string, { url: string }>();

      if (messages) {
        messages.forEach((msg: UIMessage) => {
          const content = (msg as any).content;
          if (Array.isArray(content)) {
            content.forEach((part: any) => {
              if (part.type === 'file' && part.name) {
                map.set(part.name, { url: part.url || '' });
              }
            });
          }
        });
      }

      if (selectedFiles) {
        selectedFiles.forEach((file: any) => {
          if (file.name) {
            map.set(file.name, { url: file.url || '' });
          }
        });
      }

      return map;
    }, [allAttachmentsMap, messages, selectedFiles, message]);

    const messageParts = (message as any).content || message.parts || [];
    const partsArray = Array.isArray(messageParts) ? messageParts : [];

    if (partsArray.length === 0) return null;

    const isTimelinePart = (part: any): boolean => {
      if (!part) return false;
      
      if (part.type?.startsWith('tool-')) return true;
      
      if (part.type === 'text' && 
          part.text && 
          typeof part.text === 'string' && 
          part.text.length > 0 &&
          message.role === 'assistant' &&
          detectXMLTags(part.text).size > 0) {
        return true;
      }
      
      return false;
    };

    const getTimelinePosition = (index: number): "first" | "middle" | "last" | "only" | undefined => {
      const currentPart = partsArray[index];
      if (!isTimelinePart(currentPart)) return undefined;
      
      let hasPrevTimeline = false;
      for (let i = index - 1; i >= 0; i--) {
        if (partsArray[i].type === 'file') continue;
        if (isTimelinePart(partsArray[i])) {
          hasPrevTimeline = true;
          break;
        }
      }
      
      let hasNextTimeline = false;
      for (let i = index + 1; i < partsArray.length; i++) {
        if (partsArray[i].type === 'file') continue;
        if (isTimelinePart(partsArray[i])) {
          hasNextTimeline = true;
          break;
        }
      }
      
      if (!hasPrevTimeline && !hasNextTimeline) return "only";
      if (!hasPrevTimeline && hasNextTimeline) return "first";
      if (hasPrevTimeline && !hasNextTimeline) return "last";
      if (hasPrevTimeline && hasNextTimeline) return "middle";
      
      return undefined;
    };

    const processedElements: JSX.Element[] = [];

    for (let index = 0; index < partsArray.length; index++) {
      const part = partsArray[index];
      const key = generateStableKey(
        message.id,
        part.type || 'unknown',
        index,
      );

      if (part.type === 'file') {
        continue;
      }

      const isXmlPart = part.type === 'text' && 
                        part.text && 
                        typeof part.text === 'string' && 
                        part.text.length > 0 &&
                        message.role === 'assistant' &&
                        detectXMLTags(part.text).size > 0;
      
      const timelinePosition = getTimelinePosition(index);

      let element: JSX.Element | null = null;
      
      if (isXmlPart) {
        const { xmlComponents, processedContent } = processXMLContent(
          part.text,
          isLoading && index === partsArray.length - 1,
          timelinePosition
        );
        
        xmlComponents.forEach((component, i) => {
          processedElements.push(
            <React.Fragment key={`${key}-xml-${i}`}>
              {component}
            </React.Fragment>
          );
        });
        
        if (processedContent.trim()) {
          element = (
            <TextRenderer
              key={key}
              message={message}
              text={processedContent}
              sources={sources}
              mode={mode}
              isReadonly={isReadonly}
              isStreaming={isLoading && index === partsArray.length - 1}
              fileMap={fileMap}
              setMode={setMode}
              setMessages={setMessages}
              regenerate={regenerate}
            />
          );
        }
      } else if (
        part.type === 'text' &&
        part.text &&
        typeof part.text === 'string' &&
        part.text.length > 0
      ) {
        element = (
          <TextRenderer
            key={key}
            message={message}
            text={part.text}
            sources={sources}
            mode={mode}
            isReadonly={isReadonly}
            isStreaming={isLoading && index === partsArray.length - 1}
            fileMap={fileMap}
            setMode={setMode}
            setMessages={setMessages}
            regenerate={regenerate}
          />
        );
      } else if (part.type?.startsWith('tool-')) {
        const toolName = part.type.replace('tool-', '');

        element = (
          <ToolHandler
            key={key}
            toolName={toolName}
            toolCallId={part.toolCallId || `${toolName}-${key}`}
            state={part.state || 'output-available'}
            input={part.input}
            output={part.output}
            error={part.error}
            message={message}
            position={timelinePosition}
          />
        );
      }

      if (element) {
        processedElements.push(element);
      }
    }

    return <>{processedElements}</>;
  },
);

MessageContentOrchestrator.displayName = 'MessageContentOrchestrator';