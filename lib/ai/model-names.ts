

export interface AgentInfo {
  name: string;
  description?: string;
}

export interface ModelInfo {
  name: string;
  version?: string;
}

export function getTranslatedAgentInfo(
  agentType: string | null,
  t: ReturnType<typeof import('next-intl').useTranslations>
): AgentInfo {
  if (!agentType) {
    return {
      name: 'Unknown',
      description: undefined,
    };
  }

  const translationKey = `agentTypes.${agentType}`;
  const name = t(`${translationKey}.name`);
  const description = t(`${translationKey}.description`);

  return {
    name: name || agentType,
    description: description !== `${translationKey}.description` ? description : undefined,
  };
}

export function getModelInfo(modelId: string | null, displayName?: string): ModelInfo {
  if (!modelId) {
    return {
      name: displayName || 'Unknown',
      version: undefined,
    };
  }

  const versionMatch = modelId.match(/v(\d+:\d+)$/);
  const version = versionMatch ? `v${versionMatch[1]}` : undefined;

  const baseName = modelId
    .replace(/^.*\./, '')
    .replace(/-v\d+:\d+$/, '')
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    name: baseName || displayName || modelId,
    version,
  };
}
