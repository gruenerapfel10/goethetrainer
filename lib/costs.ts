import { AgentType, getAgentConfig } from '@/lib/ai/agents';
import { ModelId, calculateCost as registryCalculateCost, getModelCosts as registryGetModelCosts } from '@/lib/ai/model-registry';

const buildModelIdMap = (): Record<string, string> => {
  const map: Record<string, string> = {};
  
  for (const agentType of Object.values(AgentType)) {
    try {
      const config = getAgentConfig(agentType as AgentType);
      if (config.metadata?.modelId) {
        map[agentType] = config.metadata.modelId;
      }
    } catch (e) {
      
    }
  }
  
  map['haiku'] = ModelId.CLAUDE_HAIKU_3;
  map['artifact-model'] = ModelId.CLAUDE_SONNET_4_5;
  map['bedrock-sonnet-latest'] = ModelId.CLAUDE_SONNET_4_5;
  map['document-agent'] = ModelId.CLAUDE_SONNET_4_5;
  
  return map;
};

const modelIdMap = buildModelIdMap();

export function getModelId(providerId: string): string {
    return modelIdMap[providerId] ?? providerId;
}

export function getModelCosts(modelId: string): { input: number; output: number } | null {
  return registryGetModelCosts(modelId);
}

export function calculateCost(modelId: string, inputTokens: number, outputTokens: number): number | null {
  return registryCalculateCost(modelId, inputTokens, outputTokens);
}
