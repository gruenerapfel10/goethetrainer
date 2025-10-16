'use client';

import type { UIMessage } from 'ai';
import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Badge } from './ui/badge';
import { CoinsIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { chatModels } from '@/lib/ai/models';
import { calculateCost, getModelId } from '@/lib/costs';
import { AgentType, getAgentDisplayName as getAgentDisplay, getAgentModelId } from '@/lib/ai/agents';

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

// Debug logging can be enabled via env variable
const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

export function MessageCost({
  message,
  shouldFetch = false,
}: {
  message: UIMessage;
  shouldFetch?: boolean;
}) {
  const { data: session } = useSession();
  const [costData, setCostData] = useState<CostData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations();

  const models = useMemo(() => chatModels(t), [t]);

  useEffect(() => {
    // Try to get token data from message or metadata
    let inputTokens = 0;
    let outputTokens = 0;
    let agentType = AgentType.GENERAL_AGENT; // Use enum value as default
    let providedModelId = '';
    let cost = 0;
    let formattedCost = '';

    // Check direct message properties first
    if ((message as any).inputTokens !== undefined && (message as any).outputTokens !== undefined) {
      inputTokens = (message as any).inputTokens || 0;
      outputTokens = (message as any).outputTokens || 0;
      agentType = (message as any).agentType || AgentType.GENERAL_AGENT;
      providedModelId = (message as any).modelId || '';
      cost = (message as any).cost;
      formattedCost = (message as any).formattedCost;
    }
    
    // Check metadata
    else if ((message as any).metadata) {
      const metadata = (message as any).metadata;
      inputTokens = metadata.inputTokens || 0;
      outputTokens = metadata.outputTokens || 0;
      agentType = metadata.agentType || AgentType.GENERAL_AGENT;
      providedModelId = metadata.modelId || '';
      cost = metadata.cost;
      formattedCost = metadata.formattedCost;
    }
    
    // Skip if no token data
    if (inputTokens === 0 && outputTokens === 0) {
      setCostData(null);
      setIsLoading(false);
      return;
    }

    console.log("**** cost " + cost)
    
    // If cost wasn't provided, calculate it
    if (!cost || cost === 0) {
      const modelId = getModelId(agentType);
      const calculatedCost = calculateCost(modelId, inputTokens, outputTokens);
      console.log('***** agent', agentType, inputTokens, outputTokens);
      console.log(agentType, modelId);
      cost = calculatedCost || 0;
      formattedCost = `$${parseFloat(cost.toFixed(4))}`;
    }
    
    // If formatted cost wasn't provided, format it
    if (!formattedCost) {
      formattedCost = `$${parseFloat(cost.toFixed(4))}`;
    }
    
    setCostData({
      messageId: message.id,
      modelId: providedModelId || getModelId(agentType),
      inputTokens: inputTokens,
      outputTokens: outputTokens,
      cost: cost,
      formattedCost: formattedCost,
      agentType: agentType,
      agentName: (message as any).agentName || (message as any).metadata?.agentName
    });
    setIsLoading(false);
  }, [message]); // Simplified dependencies

  // Debug logging
  if (isDebugMode && !costData) {
    console.log('[MessageCost] No cost data for message:', message.id);
  }

  if (!costData) {
    return null;
  }

  if (error || !costData) {
    return null;
  }

  // Get the user-friendly agent name
  const getAgentDisplayName = (agentType?: string) => {
    if (!agentType) return '';
    
    // Try to get display name from agent config
    try {
      return getAgentDisplay(agentType as AgentType);
    } catch {
      // Fall back to models array
      const model = models.find((m) => m.id === agentType);
      return model?.name || agentType;
    }
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
