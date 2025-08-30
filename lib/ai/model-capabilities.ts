// Stub model capabilities
export function supportsFeature(modelId: string, feature: string): boolean {
  // Default all models to support basic features for now
  const capabilities = {
    webSearch: true,
    deepSearch: true,
    imageGeneration: false,
  };
  
  return capabilities[feature as keyof typeof capabilities] ?? false;
}