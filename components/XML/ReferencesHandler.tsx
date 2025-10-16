'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  LinkIcon,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileCode,
  Globe,
  ExternalLink,
  Link as LinkIcon2
} from 'lucide-react';

export interface Reference {
  id: string;
  source: string;
  url?: string;
}

// Helper function to create proper download URL
const createDownloadUrl = (url?: string, source?: string) => {
  if (!url) {
    return `/api/knowledge-base/files/download?filename=${encodeURIComponent(source || '')}`;
  }

  if (url.startsWith('s3://')) {
    const s3Path = url.replace('s3://', '');
    const parts = s3Path.split('/');
    const bucket = parts[0];
    const key = parts.slice(1).join('/');
    return `/api/knowledge-base/files/download?path=${encodeURIComponent(`${bucket}/${key}`)}`;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `/api/knowledge-base/files/download?filename=${encodeURIComponent(source || '')}`;
};

// Get file type info
const getFileInfo = (source?: string, url?: string) => {
  const fileName = source?.toLowerCase() || url?.toLowerCase() || '';
  if (fileName.endsWith('.pdf')) return { icon: <FileText size={12} />, type: 'PDF' };
  if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return { icon: <FileText size={12} />, type: 'DOC' };
  if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) return { icon: <FileSpreadsheet size={12} />, type: 'XLS' };
  if (fileName.match(/\.(jpg|jpeg|png|gif)$/)) return { icon: <FileImage size={12} />, type: 'IMG' };
  if (fileName.match(/\.(js|ts|py|java|cpp|cs)$/)) return { icon: <FileCode size={12} />, type: 'CODE' };
  if (url?.startsWith('http')) return { icon: <Globe size={12} />, type: 'URL' };
  return { icon: <LinkIcon size={12} />, type: 'FILE' };
};

// Citation component for inline references
export const Citation = ({ id, references }: { id: string; references: Reference[] }) => {
  const [isHovered, setIsHovered] = useState(false);
  const reference = references.find((ref) => ref.id === id);
  if (!reference) return null;

  const getFileIcon = (source?: string, url?: string) => {
    const fileName = source?.toLowerCase() || url?.toLowerCase() || '';
    if (fileName.endsWith('.pdf')) return <FileText size={12} />;
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return <FileText size={12} />;
    if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) return <FileSpreadsheet size={12} />;
    if (fileName.match(/\.(jpg|jpeg|png|gif)$/)) return <FileImage size={12} />;
    if (fileName.match(/\.(js|ts|py|java|cpp|cs)$/)) return <FileCode size={12} />;
    if (url?.startsWith('http')) return <Globe size={12} />;
    return <LinkIcon2 size={12} />;
  };

  const sourceUrl = createDownloadUrl(reference.url, reference.source);

  return (
    <Link
      href={sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 text-sm font-medium text-orange-600/90 hover:text-orange-600 transition-colors relative -top-0.5 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.span
        initial={false}
        animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
        whileHover={{ y: -1 }}
        className="flex items-center gap-0.5"
      >
        <span className="opacity-80">[</span>
        <span className="flex items-center gap-1">
          {getFileIcon(reference.source, reference.url)}
          {id}
        </span>
        <span className="opacity-80">]</span>
      </motion.span>
      
      {isHovered && reference && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-50 w-max max-w-xs pointer-events-none"
        >
          <div className="bg-background/95 backdrop-blur-sm px-2 py-1 rounded-md text-xs border shadow-sm whitespace-nowrap">
            {reference.source}
          </div>
        </motion.div>
      )}
    </Link>
  );
};

// References Component
export const References = ({ references }: { references: Reference[] }) => {
  if (!references.length) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 text-sm w-full max-w-full overflow-hidden"
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-2 px-2">
        <LinkIcon size={14} />
        <span className="font-medium">Sources</span>
        <span className="text-xs opacity-50">({references.length})</span>
      </div>
      <div className="space-y-1 w-full max-w-full">
        {references.map((ref) => {
          const sourceUrl = createDownloadUrl(ref.url, ref.source);
          const fileInfo = getFileInfo(ref.source, ref.url);
          
          return (
            <motion.div
              key={ref.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 px-2 py-0.5 hover:bg-accent/30 rounded-sm group transition-colors w-full max-w-full min-w-0"
            >
              <span className="opacity-50 text-xs shrink-0">{ref.id}.</span>
              <div className="flex-1 min-w-0 max-w-full overflow-hidden">
                <Link
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-orange-600 transition-colors flex items-center gap-2 min-w-0 max-w-full"
                >
                  <span className="truncate min-w-0 flex-1">{ref.source}</span>
                  <span className="flex items-center gap-1 text-xs opacity-50 shrink-0">
                    {fileInfo.icon}
                    <span className="font-medium">{fileInfo.type}</span>
                  </span>
                  <ExternalLink size={12} className="opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

// Process citations in text
export const processCitations = (text: any, references: Reference[]): React.ReactNode => {
  if (text && typeof text === 'object') {
    if (Array.isArray(text)) {
      return text.map((item, i) => processCitations(item, references));
    }
    if (text.props?.children) {
      return processCitations(text.props.children, references);
    }
    return text;
  }
  
  if (typeof text !== 'string') return text;

  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/\[(\d+)\]/);
    if (match) {
      return <Citation key={i} id={match[1]} references={references} />;
    }
    return part;
  });
};

// Static handler class for processing references
export class ReferencesHandler {
  static process(content: string): {
    processedContent: string;
    references: Reference[];
    component: React.ReactNode | null;
  } {
    const refs: Reference[] = [];
    let processedContent = content;

    // Extract citations from content for backward compatibility
    const citationMatches = Array.from(content.matchAll(/\[(\d+)\]/g));
    citationMatches.forEach((match) => {
      if (!refs.find(r => r.id === match[1])) {
        refs.push({
          id: match[1],
          source: `Reference ${match[1]}`,
        });
      }
    });

    // Extract references section (complete or partial)
    const refsMatch = content.match(/<references>(.*?)(?:<\/references>|$)/s);
    if (refsMatch) {
      const refsContent = refsMatch[1];
      const refMatches = Array.from(
        refsContent.matchAll(
          /<reference\s+id="(\d+)"\s+source="([^"]*)\"(?:\s+url="([^"]*)")?\s*\/?>/g,
        ),
      );

      refMatches.forEach((match) => {
        // Override any existing reference with the same ID
        const existingIndex = refs.findIndex(r => r.id === match[1]);
        const ref = {
          id: match[1],
          source: match[2],
          url: match[3],
        };
        
        if (existingIndex >= 0) {
          refs[existingIndex] = ref;
        } else {
          refs.push(ref);
        }
      });

      // Remove references section from content
      processedContent = processedContent
        .replace(/<references>.*?<\/references>/s, '')
        .replace(/<references>.*$/s, '');
    } else {
      // Handle fallback plain text sources format
      if (content.includes('**Sources**')) {
        const sourcesMatch = content.match(/\*\*Sources\*\*\s+(.+)$/s);
        if (sourcesMatch) {
          const sourceText = sourcesMatch[1].trim();
          const citationNumbers = sourceText.match(/\[(\d+)\]/g);
          if (citationNumbers && citationNumbers.length > 0) {
            const uniqueIds = Array.from(
              new Set(
                citationNumbers.map((num) =>
                  num.replace('[', '').replace(']', ''),
                ),
              ),
            );
            const cleanSource = sourceText.replace(/\[\d+\]/g, '');
            uniqueIds.forEach((id) => {
              const existingIndex = refs.findIndex(r => r.id === id);
              const ref = {
                id: id,
                source: cleanSource.trim(),
              };
              
              if (existingIndex >= 0) {
                refs[existingIndex] = ref;
              } else {
                refs.push(ref);
              }
            });
          } else {
            refs.push({
              id: '1',
              source: sourceText,
            });
          }

          // Remove sources section from content
          processedContent = processedContent.replace(/\*\*Sources\*\*\s+(.+)$/s, '');
        }
      }
    }

    // Convert citations to proper format
    processedContent = processedContent
      .replace(/<Citation id="(\d+)".*?\/>/g, (_, id) => `[${id}]`)
      .replace(/<citation>(\d+)<\/citation>/g, (_, id) => `[${id}]`);

    // Generate component if we have references
    const component = refs.length > 0 ? <References references={refs} /> : null;

    return {
      processedContent,
      references: refs,
      component
    };
  }
}