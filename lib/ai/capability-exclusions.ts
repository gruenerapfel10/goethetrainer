/**
 * Defines mutually exclusive capabilities
 * When one capability is enabled, the others in the same group must be disabled
 */

export interface ExclusionGroup {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
}

export const CAPABILITY_EXCLUSIONS: ExclusionGroup[] = [
  {
    id: 'content-generation',
    name: 'Content Generation Mode',
    description: 'Image generation and deep research cannot be used together',
    capabilities: ['imageGeneration', 'deepSearch'],
  },
];

/**
 * Check if enabling a capability would conflict with currently enabled capabilities
 */
export function getConflictingCapabilities(
  capability: string,
  currentlyEnabled: Record<string, boolean>
): string[] {
  const conflicts: string[] = [];
  
  for (const group of CAPABILITY_EXCLUSIONS) {
    if (group.capabilities.includes(capability)) {
      // Check if any other capability in this group is enabled
      for (const otherCapability of group.capabilities) {
        if (otherCapability !== capability && currentlyEnabled[otherCapability]) {
          conflicts.push(otherCapability);
        }
      }
    }
  }
  
  return conflicts;
}

/**
 * Get capabilities that should be disabled when enabling a specific capability
 */
export function getCapabilitiesToDisable(
  capabilityToEnable: string,
  currentlyEnabled: Record<string, boolean>
): string[] {
  return getConflictingCapabilities(capabilityToEnable, currentlyEnabled);
}

/**
 * Check if a capability can be enabled given the current state
 */
export function canEnableCapability(
  capability: string,
  currentlyEnabled: Record<string, boolean>
): boolean {
  const conflicts = getConflictingCapabilities(capability, currentlyEnabled);
  return conflicts.length === 0;
}

/**
 * Get human-readable message for why a capability cannot be enabled
 */
export function getExclusionMessage(
  capability: string,
  currentlyEnabled: Record<string, boolean>
): string | null {
  const conflicts = getConflictingCapabilities(capability, currentlyEnabled);
  
  if (conflicts.length === 0) {
    return null;
  }
  
  const group = CAPABILITY_EXCLUSIONS.find(g => 
    g.capabilities.includes(capability) && 
    g.capabilities.some(c => conflicts.includes(c))
  );
  
  if (group) {
    const conflictNames = conflicts.map(c => {
      switch(c) {
        case 'imageGeneration': return 'Image Generation';
        case 'deepSearch': return 'Deep Research';
        case 'webSearch': return 'Web Search';
        default: return c;
      }
    }).join(', ');
    
    return `Cannot enable this while ${conflictNames} is active. ${group.description}`;
  }
  
  return `Cannot enable this capability due to conflicts with: ${conflicts.join(', ')}`;
}