'use client';

import type { UIMessage } from 'ai';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Badge } from './ui/badge';
import { CoinsIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CostData {
  messageId: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  formattedCost: string;
  agentType?: string;
  agentName?: string;
}

// Check if debug mode is enabled
const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

export function MessageCost({
  message,
  shouldFetch = false 
}: { 
  message: UIMessage;
  shouldFetch?: boolean;
}) {
  const { data: session } = useSession();
  const [costData, setCostData] = useState<CostData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('message.cost');

  useEffect(() => {
    let isCancelled = false;

    const fetchCost = async () => {
      // Set initial state for the fetch attempt.
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/message-cost?messageId=${message.id}`);

        if (!response.ok) {
          // Treat any non-successful response (e.g., 404, 500) as a final error.

          // If 404 gracefully handle, not found yet.

          if (response.status === 404) {
            setIsLoading(false);
            return;
          }

          throw new Error(`API error: ${response.status}`);
        }

        const data: CostData = await response.json();
        setCostData(data);
      } catch (err) {
        if (!isCancelled) {
          console.error(`Failed to fetch cost for message ${message.id}:`, err);
          setError(err instanceof Error ? err.message : 'Failed to fetch cost');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchCost();

    return () => {
      isCancelled = true;
    };
  }, [shouldFetch, session?.user?.isAdmin, message.id]); // Added message.id as dependency


  if (!costData) {
    return null;
  }

  if (error || !costData || costData.cost === 0) {
    return null;
  }

  // If data was successfully fetched on the first try, display the cost.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="text-xs font-mono p-1 cursor-help">
          <CoinsIcon className="h-3 w-3 mr-1" />
          {costData.formattedCost}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <div className="text-sm p-1 space-y-2">
          <p className="font-bold">💰 {t('breakdown')}</p>
          <div className="space-y-1">
            {costData.agentName && (
              <p><strong>{t('assistant')}:</strong> {costData.agentName}</p>
            )}
            <p><strong>{t('model')}:</strong> {costData.modelId}</p>
            <p><strong>{t('inputTokens')}:</strong> {costData.inputTokens.toLocaleString()}</p>
            <p><strong>{t('outputTokens')}:</strong> {costData.outputTokens.toLocaleString()}</p>
            <p><strong>{t('totalCost')}:</strong> {costData.formattedCost}</p>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
