'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Bug, Clock, MessageSquare, Zap, Database, BarChart3 } from 'lucide-react';

export interface ContextDebugInfo {
  totalMessages: number;
  includedMessages: number;
  excludedMessages: number;
  totalTokens: number;
  contextWindow: number;
  tokenUtilization: number;
  messageIds: string[];
  maxOutputTokens: number;
  oldestIncludedMessage?: Date;
  newestIncludedMessage?: Date;
}

interface ContextDebugProps {
  chatId: string;
  enabled?: boolean;
}

export function ContextDebug({ chatId, enabled = process.env.NODE_ENV === 'development' }: ContextDebugProps) {
  const [debugInfo, setDebugInfo] = useState<ContextDebugInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchDebugInfo = async () => {
    if (!chatId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/debug/context-window?chatId=${chatId}`);
      if (response.ok) {
        const data = await response.json();
        setDebugInfo(data);
      }
    } catch (error) {
      console.error('Failed to fetch context debug info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && chatId) {
      fetchDebugInfo();
    }
  }, [isOpen, chatId]);

  if (!enabled) {
    return null;
  }

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization < 60) return 'text-green-600 dark:text-green-400';
    if (utilization < 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getUtilizationBadgeVariant = (utilization: number) => {
    if (utilization < 60) return 'default';
    if (utilization < 80) return 'secondary';
    return 'destructive';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
          title="Context Window Debug"
        >
          <Bug className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Context Window Debug
            {debugInfo && (
              <Badge 
                variant={getUtilizationBadgeVariant(debugInfo.tokenUtilization)}
                className="ml-2"
              >
                {debugInfo.tokenUtilization.toFixed(1)}% utilized
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : debugInfo ? (
            <>
              {/* Token Utilization */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <h3 className="font-semibold">Token Utilization</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {debugInfo.totalTokens.toLocaleString()} / {debugInfo.contextWindow.toLocaleString()} tokens
                    </span>
                    <span className={`text-sm font-medium ${getUtilizationColor(debugInfo.tokenUtilization)}`}>
                      {debugInfo.tokenUtilization.toFixed(2)}%
                    </span>
                  </div>
                  <Progress 
                    value={debugInfo.tokenUtilization} 
                    className="h-2"
                  />
                  {debugInfo.tokenUtilization > 90 && (
                    <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 p-2 rounded">
                      ⚠️ Context window is nearly full. Older messages may be excluded.
                    </p>
                  )}
                </div>
              </div>

              {/* Message Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <h3 className="font-semibold">Messages</h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-medium">{debugInfo.totalMessages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Included:</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {debugInfo.includedMessages}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Excluded:</span>
                      <span className="font-medium text-red-600 dark:text-red-400">
                        {debugInfo.excludedMessages}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <h3 className="font-semibold">Capacity</h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Context Window:</span>
                      <span className="font-medium">{debugInfo.contextWindow.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Output:</span>
                      <span className="font-medium">{debugInfo.maxOutputTokens.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Available:</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {(debugInfo.contextWindow - debugInfo.totalTokens).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Range */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <h3 className="font-semibold">Included Message Range</h3>
                </div>
                <div className="space-y-1 text-sm bg-muted/50 p-3 rounded">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Oldest:</span>
                    <span className="font-mono text-xs">
                      {formatDate(debugInfo.oldestIncludedMessage)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Newest:</span>
                    <span className="font-mono text-xs">
                      {formatDate(debugInfo.newestIncludedMessage)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Message IDs */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Included Message IDs</h3>
                <div className="max-h-32 overflow-y-auto bg-muted/50 p-3 rounded">
                  <div className="space-y-1">
                    {debugInfo.messageIds.map((id, index) => (
                      <div key={id} className="text-xs font-mono flex items-center gap-2">
                        <span className="text-muted-foreground w-6">#{index + 1}</span>
                        <span className="break-all">{id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Refresh Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button 
                  onClick={fetchDebugInfo} 
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                >
                  {isLoading ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No debug information available</p>
              <Button onClick={fetchDebugInfo} className="mt-4" variant="outline">
                Load Debug Info
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}