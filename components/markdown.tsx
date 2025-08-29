'use client';

import Link from 'next/link';
import React, { memo, useState, } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './code-block';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  Copy,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  ExternalLink,
  FileCode,
  FileSpreadsheet,
  FileImage,
  Globe,
  Link as LinkIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, } from 'framer-motion';

interface Reference {
  id: string;
  source: string;
  url?: string;
}

const Citation = ({
  id,
  references,
}: {
  id: string;
  references: Reference[];
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const reference = references.find((ref) => ref.id === id);
  if (!reference) return null;

  // Get file type icon based on source name or URL
  const getFileIcon = (source?: string, url?: string) => {
    const fileName = source?.toLowerCase() || url?.toLowerCase() || '';
    if (fileName.endsWith('.pdf')) return <FileText size={12} />;
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return <FileText size={12} />;
    if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) return <FileSpreadsheet size={12} />;
    if (fileName.match(/\.(jpg|jpeg|png|gif)$/)) return <FileImage size={12} />;
    if (fileName.match(/\.(js|ts|py|java|cpp|cs)$/)) return <FileCode size={12} />;
    if (url?.startsWith('http')) return <Globe size={12} />;
    return <LinkIcon size={12} />;
  };

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

  const sourceUrl = createDownloadUrl(reference.url, reference.source);

  return (
    <Link href={sourceUrl} target="_blank" rel="noopener noreferrer">
      <motion.span
        className="inline-flex items-center gap-0.5 text-sm font-medium text-orange-600/90 hover:text-orange-600 transition-colors relative -top-0.5 cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={false}
        animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
        whileHover={{ y: -1 }}
      >
        <span className="opacity-80">[</span>
        <span className="flex items-center gap-1">
          {getFileIcon(reference.source, reference.url)}
          {id}
        </span>
        <span className="opacity-80">]</span>
        {isHovered && reference && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-50 w-max max-w-xs"
          >
            <div className="bg-background/95 backdrop-blur-sm px-2 py-1 rounded-md text-xs border shadow-sm whitespace-nowrap">
              {reference.source}
            </div>
          </motion.div>
        )}
      </motion.span>
    </Link>
  );
};

const References = ({ references }: { references: Reference[] }) => {
  if (!references.length) return null;

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

  // Get file type info (reusing from Citation component)
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 text-sm"
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-2 px-2">
        <LinkIcon size={14} />
        <span className="font-medium">Sources</span>
        <span className="text-xs opacity-50">({references.length})</span>
      </div>
      <div className="space-y-1">
        {references.map((ref) => {
          const sourceUrl = createDownloadUrl(ref.url, ref.source);
          const fileInfo = getFileInfo(ref.source, ref.url);
          
          return (
            <motion.div
              key={ref.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 px-2 py-0.5 hover:bg-accent/30 rounded-sm group transition-colors"
            >
              <span className="opacity-50 text-xs">{ref.id}.</span>
              <div className="flex-1 truncate">
                <Link
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-orange-600 transition-colors flex items-center gap-2"
                >
                  <span className="truncate">{ref.source}</span>
                  <span className="flex items-center gap-1 text-xs opacity-50">
                    {fileInfo.icon}
                    <span className="font-medium">{fileInfo.type}</span>
                  </span>
                  <ExternalLink size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

// Enhanced table component with proper React-based sorting
const EnhancedTable = ({ children, ...props }: any) => {
  const { toast } = useToast();

  const exportToCSV = () => {
    // Use a more reliable approach to get table data
    const tableElement = document.querySelector('.enhanced-table table');
    if (!tableElement) return;
    
    const rows = Array.from(tableElement.querySelectorAll('tr'));
    const csvContent = rows.map(row => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      return cells.map(cell => `"${cell.textContent?.trim() || ''}"`).join(',');
    }).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'table-data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    const tableElement = document.querySelector('.enhanced-table table');
    if (!tableElement) return;
    
    const rows = Array.from(tableElement.querySelectorAll('tr'));
    let markdownTable = '';
    let headerRowCount = 0;
    
    rows.forEach((row, rowIndex) => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      const isHeaderRow = cells.some(cell => cell.tagName === 'TH');
      
      // Build the row
      const rowContent = cells.map(cell => {
        const text = cell.textContent?.trim() || '';
        // Escape pipe characters in cell content
        return text.replace(/\|/g, '\\|');
      }).join(' | ');
      
      markdownTable += `| ${rowContent} |\n`;
      
      // Add separator after header row(s)
      if (isHeaderRow) {
        headerRowCount++;
        // Check if next row is also a header or if this is the last header row
        const nextRow = rows[rowIndex + 1];
        const nextRowIsHeader = nextRow && Array.from(nextRow.querySelectorAll('th, td')).some(cell => cell.tagName === 'TH');
        
        if (!nextRowIsHeader) {
          // Add separator row after headers
          const separatorRow = cells.map(() => '---').join(' | ');
          markdownTable += `| ${separatorRow} |\n`;
        }
      }
    });
    
    // If no header rows found, add separator after first row
    if (headerRowCount === 0 && rows.length > 0) {
      const lines = markdownTable.split('\n');
      const firstRowCellCount = rows[0] ? rows[0].querySelectorAll('th, td').length : 0;
      const separatorRow = Array(firstRowCellCount).fill('---').join(' | ');
      lines.splice(1, 0, `| ${separatorRow} |`);
      markdownTable = lines.join('\n');
    }
    
    try {
      await navigator.clipboard.writeText(markdownTable.trim());
      toast({
        title: "Copied as Markdown",
        description: "Table has been copied in Markdown format.",
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: "Copy failed",
        description: "Failed to copy table to clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="my-4 w-full group">
      {/* Floating action buttons */}
      <div className="relative">
        <div className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm border border-border rounded-md p-1 shadow-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="h-7 w-7 p-0 hover:bg-muted"
              title="Copy as Markdown table"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={exportToCSV}
              className="h-7 w-7 p-0 hover:bg-muted"
              title="Export as CSV"
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="enhanced-table overflow-x-auto w-full rounded-lg border border-border">
          <table className="border-collapse bg-transparent table-auto min-w-full" {...props}>
            {children}
          </table>
        </div>
      </div>
    </div>
  );
};

// Sortable table header component
const SortableTableHead = ({ children, ...props }: any) => {
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  
  const handleSort = (event: React.MouseEvent) => {
    const clickedHeader = event.currentTarget as HTMLElement;
    const table = clickedHeader.closest('table');
    if (!table) return;
    
    // Find column index
    const headerRow = clickedHeader.parentElement;
    if (!headerRow) return;
    
    const headers = Array.from(headerRow.children);
    const columnIndex = headers.indexOf(clickedHeader);
    
    if (columnIndex === -1) return;
    
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    // Toggle sort direction
    const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    setSortDirection(newDirection);
    
    // Sort rows
    rows.sort((a, b) => {
      const aCell = a.children[columnIndex] as HTMLElement;
      const bCell = b.children[columnIndex] as HTMLElement;
      
      if (!aCell || !bCell) return 0;
      
      const aText = aCell.textContent?.trim() || '';
      const bText = bCell.textContent?.trim() || '';
      
      // Try to parse as numbers first
      const aNum = Number.parseFloat(aText.replace(/[,%]/g, ''));
      const bNum = Number.parseFloat(bText.replace(/[,%]/g, ''));
      
      let comparison = 0;
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        comparison = aNum - bNum;
      } else {
        comparison = aText.localeCompare(bText, undefined, { numeric: true });
      }
      
      return newDirection === 'asc' ? comparison : -comparison;
    });
    
    // Re-append sorted rows
    rows.forEach(row => tbody.appendChild(row));
  };
   
  const getSortIcon = () => {
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-3 w-3 text-white dark:text-black" />;
    } else if (sortDirection === 'desc') {
      return <ArrowDown className="h-3 w-3 text-white dark:text-black" />;
    }
    return <ArrowUpDown className="h-3 w-3 text-white/50 dark:text-black/50" />;
  };

  return (
    <th 
      className="px-4 py-3 text-left font-semibold break-words text-white dark:text-black bg-black dark:bg-white cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors select-none border-r border-border/50 last:border-r-0" 
      onClick={handleSort}
      {...props}
    >
      <div className="flex items-center gap-2">
        {children}
        {getSortIcon()}
      </div>
    </th>
  );
};

// Helper function to extract text from React elements
const extractTextFromElement = (element: any): string => {
  if (typeof element === 'string') return element;
  if (typeof element === 'number') return element.toString();
  if (Array.isArray(element)) {
    return element.map(extractTextFromElement).join('');
  }
  if (element?.props?.children) {
    return extractTextFromElement(element.props.children);
  }
  return '';
};

// Helper function to format cell content
const formatCellContent = (content: string) => {
  // Check if it's a large number (but not percentage)
  if (!content.includes('%')) {
    const num = Number.parseFloat(content.replace(/,/g, ''));
    if (!Number.isNaN(num) && num > 1000) {
      return (
        <span className="font-mono tabular-nums">
          {num.toLocaleString()}
        </span>
      );
    }
  }
  
  return <span className="tabular-nums">{content}</span>;
};

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  const { content, references } = React.useMemo(() => {
    const refs: Reference[] = [];

    console.log('=== CITATION DEBUG ===');
    console.log('Raw children:', children);

    // Extract references section
    const refsMatch = children.match(/<references>(.*?)<\/references>/s);
    if (refsMatch) {
      console.log('Found references section:', refsMatch[1]);
      const refsContent = refsMatch[1];
      // Updated regex to properly capture the url attribute with better handling of quotes and spaces
      const refMatches = Array.from(
        refsContent.matchAll(
          /<reference\s+id="(\d+)"\s+source="([^"]*)"(?:\s+url="([^"]*)")?\s*\/>/g,
        ),
      );

      console.log('Reference matches:', refMatches);

      refs.push(
        ...refMatches.map((match) => ({
          id: match[1],
          source: match[2],
          url: match[3], // This will now properly capture the S3 URI or other URLs
        })),
      );
    } else {
      console.log('No <references> section found, checking for **Sources**');
      
      if (children.includes('**Sources**')) {
        // Handle the plain text sources format (fallback for older formats)
        const sourcesMatch = children.match(/\*\*Sources\*\*\s+(.+)$/s);
        if (sourcesMatch) {
          const sourceText = sourcesMatch[1].trim();

          // Extract citation numbers from the source text if they exist
          const citationNumbers = sourceText.match(/\[(\d+)\]/g);
          if (citationNumbers && citationNumbers.length > 0) {
            // Extract unique numbers
            const uniqueIds = Array.from(
              new Set(
                citationNumbers.map((num) =>
                  num.replace('[', '').replace(']', ''),
                ),
              ),
            );

            // Remove the citation numbers from the source
            const cleanSource = sourceText.replace(/\[\d+\]/g, '');

            // Create a reference for each unique ID
            uniqueIds.forEach((id) => {
              refs.push({
                id: id,
                source: cleanSource.trim(),
              });
            });
          } else {
            // If no citation numbers found, create a single reference
            refs.push({
              id: '1',
              source: sourceText,
            });
          }
        }
      }
    }

    console.log('Extracted references:', refs);

    // Process content - remove references section but keep citations
    const processedContent = children
    .replace(/<references>.*?<\/references>/s, '')
    .replace(/\*\*Sources\*\*\s+(.+)$/s, '')
    .replace(/<Citation id="(\d+)".*?\/>/g, (_, id) => `[${id}]`)
    .replace(/<citation>(\d+)<\/citation>/g, (_, id) => `[${id}]`)
    .trim();

    console.log('Processed content:', processedContent);
    console.log('=== END CITATION DEBUG ===');

    return { content: processedContent, references: refs };
  }, [children]);

  const enhanceText = (text: any): string | React.ReactNode | React.ReactNode[] => {
    console.log("text: ", text);
    
    // Handle React elements
    if (text && typeof text === 'object') {
      if (Array.isArray(text)) {
        return text.map((item, i) => enhanceText(item));
      }
      if (text.props?.children) {
        return enhanceText(text.props.children);
      }
      return text;
    }
    
    if (typeof text !== 'string') return text;

    // Process citation numbers [1], [2], etc.
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, i) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        return <Citation key={i} id={match[1]} references={references} />;
      }
      return part;
    });
  };

  const components: Partial<Components> = {
    code: ({ node, inline, className, children, ...props }: any) => (
      <CodeBlock inline={inline} className={className} {...props}>
        {children}
      </CodeBlock>
    ),
    pre: ({ children }: any) => <>{children}</>,
    p: ({ children }: any) => <p>{enhanceText(children as string)}</p>,
    ol: ({ node, children, ...props }: any) => (
      <ol className="list-decimal list-outside ml-6" {...props}>
        {children}
      </ol>
    ),
    ul: ({ node, children, ...props }: any) => (
      <ul className="list-disc list-outside ml-6" {...props}>
        {children}
      </ul>
    ),
    li: ({ node, children, ...props }: any) => (
      <li className="py-1" {...props}>
        {enhanceText(children as string)}
      </li>
    ),
    strong: ({ node, children, ...props }: any) => (
      <span className="font-semibold" {...props}>
        {children}
      </span>
    ),
    a: ({ node, children, href, ...props }: any) => (
      <Link
        href={(href || '#') as string}
        className="text-blue-500 hover:underline"
        target="_blank"
        rel="noreferrer"
        {...props}
      >
        {children}
      </Link>
    ),
    h1: ({ node, children, ...props }: any) => (
      <h1 className="text-3xl font-semibold mt-6 mb-2" {...props}>
        {enhanceText(children as string)}
      </h1>
    ),
    h2: ({ node, children, ...props }: any) => (
      <h2 className="text-2xl font-semibold mt-6 mb-2" {...props}>
        {enhanceText(children as string)}
      </h2>
    ),
    h3: ({ node, children, ...props }: any) => (
      <h3 className="text-xl font-semibold mt-6 mb-2" {...props}>
        {enhanceText(children as string)}
      </h3>
    ),
    h4: ({ node, children, ...props }: any) => (
      <h4 className="text-lg font-semibold mt-6 mb-2" {...props}>
        {enhanceText(children as string)}
      </h4>
    ),
    h5: ({ node, children, ...props }: any) => (
      <h5 className="text-base font-semibold mt-6 mb-2" {...props}>
        {enhanceText(children as string)}
      </h5>
    ),
    h6: ({ node, children, ...props }: any) => (
      <h6 className="text-sm font-semibold mt-6 mb-2" {...props}>
        {enhanceText(children as string)}
      </h6>
    ),
    table: ({ node, children, ...props }) => {
      return <EnhancedTable {...props}>{children}</EnhancedTable>;
    },
    thead: ({ node, children, ...props }) => (
      <thead {...props}>
        {children}
      </thead>
    ),
    tbody: ({ node, children, ...props }) => (
      <tbody {...props}>
        {children}
      </tbody>
    ),
    tr: ({ node, children, ...props }) => (
      <tr className="border-b border-border hover:bg-muted/50 transition-colors" {...props}>
        {children}
      </tr>
    ),
    th: ({ node, children, ...props }) => (
      <SortableTableHead {...props}>
        {children}
      </SortableTableHead>
    ),
    td: ({ node, children, ...props }) => (
      <td 
        className="px-4 py-3 break-words border-r border-border/50 last:border-r-0" 
        {...props}
      >
        {formatCellContent(typeof children === 'string' ? children : extractTextFromElement(children))}
      </td>
    ),
  };

  return (
    <div>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components as any}>
        {content}
      </ReactMarkdown>
      <References references={references} />
    </div>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);