'use client';

import type { UIMessage } from 'ai';
import { useState, useEffect, useMemo } from 'react';
// Auth removed - no sessions needed
// import { useSession } from 'next-auth/react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Badge } from './ui/badge';
import { CoinsIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { chatModels } from '@/lib/ai/models';

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
  shouldFetch = false,
}: {
  message: UIMessage;
  shouldFetch?: boolean;
}) {
  // Auth removed - no sessions needed
  const session = null;
  const [costData, setCostData] = useState<CostData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations();

  const models = useMemo(() => chatModels(t), [t]);

  useEffect(() => {
    let isCancelled = false;

    const fetchCost = async () => {
      // Set initial state for the fetch attempt.
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/message-cost?messageId=${message.id}`,
        );

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
  }, [shouldFetch, session?.user, message.id]); // Added message.id as dependency

  if (!costData) {
    return null;
  }

  if (error || !costData || costData.cost === 0) {
    return null;
  }

  // Get the user-friendly agent name from chatModels
  const getAgentDisplayName = (agentType?: string) => {
    if (!agentType) return '';

    const model = models.find((m) => m.id === agentType);
    return model?.name || agentType;
  };

  // If data was successfully fetched on the first try, display the cost.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className="text-xs font-mono p-1 cursor-help bord rounded-md"
        >
          <CoinsIcon className="h-3 w-3 mr-1" />
          {costData.formattedCost}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-1 text-xs">
          {costData.agentType && (
            <div className="font-medium">{getAgentDisplayName(costData.agentType)}</div>
          )}
          <div className="text-muted-foreground">{costData.modelId}</div>
          <div className="flex justify-between gap-2">
            <span>In: {costData.inputTokens.toLocaleString()}</span>
            <span>Out: {costData.outputTokens.toLocaleString()}</span>
          </div>
          <div className="font-mono font-semibold border-t pt-1">
            {costData.formattedCost}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
