import { ChevronDown, ChevronRight } from 'lucide-react';
import type { FlaggedMessage } from '@/types/dashboard';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface FlaggedMessagesTableProps {
  messages: FlaggedMessage[];
}

export function FlaggedMessagesTable({ messages }: FlaggedMessagesTableProps) {
  const t = useTranslations('dashboard.tables.flaggedMessages.columns');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (rowId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (expandedRows.has(rowId)) {
      newExpandedRows.delete(rowId);
    } else {
      newExpandedRows.add(rowId);
    }
    setExpandedRows(newExpandedRows);
  };

  const formatParts = (content: string) => {
    try {
      const parsed = JSON.parse(content);

      // If parsed is an array
      if (Array.isArray(parsed)) {
        // Find the first item with type "text"
        const textItem = parsed.find((item) => item.type === 'text');
        if (textItem?.text) {
          return textItem.text;
        }
        // If no text item found but there's a string in the array
        if (typeof parsed[0] === 'string') {
          return parsed[0];
        }
      }

      // If parsed is just a string
      if (typeof parsed === 'string') {
        return parsed;
      }

      // Fallback
      return content;
    } catch {
      // If parsing fails, return the original content
      return content;
    }
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full">
        <colgroup>
          {[
            <col key="arrow" className="w-[24px]" />,
            <col key="message" className="w-[60%]" />,
            <col key="chat" className="w-[20%]" />,
            <col key="user" className="w-[20%]" />,
          ]}
        </colgroup>
        <thead>
          <tr className="border-b border-border">
            <th className="p-3" />
            <th className="text-left p-3 text-xs font-medium text-muted-foreground">
              {t('message')}
            </th>
            <th className="text-left p-3 text-xs font-medium text-muted-foreground">
              {t('chat')}
            </th>
            <th className="text-left p-3 text-xs font-medium text-muted-foreground">
              {t('user')}
            </th>
          </tr>
        </thead>
        <tbody>
          {messages.flatMap((message) => {
            const rowId = `${message.messageId}-${message.createdAt}`;
            const isExpanded = expandedRows.has(rowId);

            const mainRow = (
              <tr
                key={rowId}
                className="cursor-pointer hover:bg-muted/20 border-b border-border"
                onClick={() => toggleRow(rowId)}
              >
                <td className="p-3 text-center">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground inline-block" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground inline-block" />
                  )}
                </td>
                <td className="p-3 font-medium text-sm">
                  <div className="line-clamp-2">
                    {formatParts(message.userQuery)}
                  </div>
                </td>
                <td className="p-3 text-sm text-muted-foreground">
                  {message.chatTitle}
                </td>
                <td className="p-3 text-sm text-muted-foreground">
                  {message.userEmail}
                </td>
              </tr>
            );
            const expandedRow = isExpanded ? (
              <tr key={`${rowId}-expanded`} className="border-b border-border">
                <td className="p-3" />
                <td colSpan={3} className="p-3">
                  <div className="bg-muted/20 p-3 rounded-md">
                    <div className="mb-2 text-xs flex justify-between text-muted-foreground">
                      <div>{message.userEmail}</div>
                      <div>
                        {new Date(message.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">
                          User Query:
                        </div>
                        <div className="text-xs whitespace-pre-wrap break-words">
                          {formatParts(message.userQuery)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">
                          Assistant Response:
                        </div>
                        <div className="text-xs whitespace-pre-wrap break-words">
                          {formatParts(message.content)}
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            ) : null;

            return [mainRow, expandedRow];
          })}
        </tbody>
      </table>
    </div>
  );
}
