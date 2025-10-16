// Feature names enum for type safety
export enum FeatureName {
  FILE_SEARCH = 'fileSearch',
}

// Feature metadata for UI features
export interface FeatureMetadata {
  name: FeatureName;
  displayName: string;
  description: string;
  icon: 'search' | 'globe' | 'database' | 'image' | 'brain';
  toggle: boolean;
  
  // Requirements
  requiresAuth?: boolean;
  requiresSetup?: boolean;
}

// Complete feature registry with all metadata
export const FEATURE_METADATA: Record<FeatureName, FeatureMetadata> = {
  [FeatureName.FILE_SEARCH]: {
    name: FeatureName.FILE_SEARCH,
    displayName: 'File Search',
    description: 'Search and attach files from connected sources',
    icon: 'database',
    toggle: true,
    requiresAuth: true,
  },
};

// Helper to check if a feature is enabled
export function isFeatureEnabled(featureName: FeatureName): boolean {
  const metadata = FEATURE_METADATA[featureName];
  return metadata?.toggle || false;
}

// Helper to get all enabled features
export function getEnabledFeatures(): FeatureName[] {
  return Object.values(FEATURE_METADATA)
    .filter(feature => feature.toggle)
    .map(feature => feature.name);
}

// Helper to get features that require authentication
export function getAuthRequiredFeatures(): FeatureName[] {
  return Object.values(FEATURE_METADATA)
    .filter(feature => feature.requiresAuth)
    .map(feature => feature.name);
}

// Helper to check feature requirements
export function featureRequirements(featureName: FeatureName): {
  requiresAuth: boolean;
  requiresSetup: boolean;
} {
  const metadata = FEATURE_METADATA[featureName];
  return {
    requiresAuth: metadata?.requiresAuth || false,
    requiresSetup: metadata?.requiresSetup || false,
  };
}