export enum ToolName {
  // Data & Analysis Tools
  CHART = 'chart',
  
  // Web Tools
  SEARCH = 'web_search',
  EXTRACT = 'extract',
  SCRAPE = 'scrape',
  DEEP_RESEARCH = 'deep_research',
  
  // Document Tools
  CREATE_DOCUMENT = 'createDocument',
  UPDATE_DOCUMENT = 'updateDocument',
  PROCESS_FILE = 'processFile',
  
  // Utility Tools
  GET_WEATHER = 'getWeather',
  REQUEST_SUGGESTIONS = 'requestSuggestions',
  
  // Future Tools
  GENERATE_IMAGE = 'generateImage',
  EDIT_IMAGE = 'editImage',
  
  // Agent Tools
  REASON = 'reason',
  REASON_SEARCH = 'reason_search',
  REASONING = 'reasoning'
}

// Tool metadata for UI and capabilities
export interface ToolMetadata {
  name: ToolName;
  displayName: string;
  description: string;
  // Translation keys for i18n (optional - fallback to displayName/description if not provided)
  displayNameKey?: string;
  descriptionKey?: string;
  category: 'data' | 'web' | 'document' | 'utility' | 'image';
  icon?: 'chart' | 'search' | 'document' | 'weather' | 'image' | 'database' | 'globe' | 'brain';
  toggle: boolean;
  
  // UI preferences
  preferHidden?: boolean; // If true, always show in dropdown, never inline
  
  // Requirements
  requiresAuth?: boolean;
  requiresSetup?: boolean;
  
  // Exclusions - tools that cannot be enabled together with this tool
  exclusions?: ToolName[];
}

// Complete tool registry with all metadata
export const TOOL_METADATA: Record<ToolName, ToolMetadata> = {
  [ToolName.CHART]: {
    name: ToolName.CHART,
    displayName: 'Chart Generation',
    description: 'Creates beautiful, interactive charts from data',
    displayNameKey: 'tools.chart.displayName',
    descriptionKey: 'tools.chart.description',
    category: 'data',
    icon: 'chart',
    toggle: false,
  },
  [ToolName.SEARCH]: {
    name: ToolName.SEARCH,
    displayName: 'Web Search',
    description: 'Search the web for information',
    displayNameKey: 'tools.search.displayName',
    descriptionKey: 'tools.search.description',
    category: 'web',
    icon: 'search',
    toggle: true,
    preferHidden: true,
  },
  [ToolName.EXTRACT]: {
    name: ToolName.EXTRACT,
    displayName: 'Web Extract',
    description: 'Extract information from web pages',
    displayNameKey: 'tools.extract.displayName',
    descriptionKey: 'tools.extract.description',
    category: 'web',
    icon: 'globe',
    toggle: false,
  },
  [ToolName.SCRAPE]: {
    name: ToolName.SCRAPE,
    displayName: 'Web Scraper',
    description: 'Scrape web content',
    displayNameKey: 'tools.scrape.displayName',
    descriptionKey: 'tools.scrape.description',
    category: 'web',
    icon: 'globe',
    toggle: false,
  },
  [ToolName.DEEP_RESEARCH]: {
    name: ToolName.DEEP_RESEARCH,
    displayName: 'Deep Research',
    description: 'Comprehensive research with multiple sources',
    displayNameKey: 'tools.deep_research.displayName',
    descriptionKey: 'tools.deep_research.description',
    category: 'web',
    icon: 'brain',
    toggle: true,
    preferHidden: false,
    exclusions: [ToolName.GENERATE_IMAGE],
  },
  [ToolName.CREATE_DOCUMENT]: {
    name: ToolName.CREATE_DOCUMENT,
    displayName: 'Create Document',
    description: 'Create new documents with full markdown support including tables, lists, and formatting',
    displayNameKey: 'tools.createDocument.displayName',
    descriptionKey: 'tools.createDocument.description',
    category: 'document',
    icon: 'document',
    toggle: false,
  },
  [ToolName.UPDATE_DOCUMENT]: {
    name: ToolName.UPDATE_DOCUMENT,
    displayName: 'Update Document',
    description: 'Update existing documents with full markdown support including tables, lists, and formatting',
    displayNameKey: 'tools.updateDocument.displayName',
    descriptionKey: 'tools.updateDocument.description',
    category: 'document',
    icon: 'document',
    toggle: false,
  },
  [ToolName.PROCESS_FILE]: {
    name: ToolName.PROCESS_FILE,
    displayName: 'Process File',
    description: 'Process and analyze files',
    displayNameKey: 'tools.processFile.displayName',
    descriptionKey: 'tools.processFile.description',
    category: 'document',
    icon: 'document',
    toggle: false,
  },
  [ToolName.GET_WEATHER]: {
    name: ToolName.GET_WEATHER,
    displayName: 'Weather',
    description: 'Get weather information',
    displayNameKey: 'tools.getWeather.displayName',
    descriptionKey: 'tools.getWeather.description',
    category: 'utility',
    icon: 'weather',
    toggle: false,
  },
  [ToolName.REQUEST_SUGGESTIONS]: {
    name: ToolName.REQUEST_SUGGESTIONS,
    displayName: 'Suggestions',
    description: 'Request AI suggestions',
    displayNameKey: 'tools.requestSuggestions.displayName',
    descriptionKey: 'tools.requestSuggestions.description',
    category: 'utility',
    toggle: false,
  },
  [ToolName.GENERATE_IMAGE]: {
    name: ToolName.GENERATE_IMAGE,
    displayName: 'Generate Image',
    description: 'Generate images from text',
    displayNameKey: 'tools.generateImage.displayName',
    descriptionKey: 'tools.generateImage.description',
    category: 'image',
    icon: 'image',
    toggle: true,
    preferHidden: false,
    exclusions: [ToolName.DEEP_RESEARCH],
  },
  [ToolName.EDIT_IMAGE]: {
    name: ToolName.EDIT_IMAGE,
    displayName: 'Edit Image',
    description: 'Edit existing images',
    displayNameKey: 'tools.editImage.displayName',
    descriptionKey: 'tools.editImage.description',
    category: 'image',
    icon: 'image',
    toggle: false,
  },
  [ToolName.REASON]: {
    name: ToolName.REASON,
    displayName: 'Reasoning Agent',
    description: 'Advanced reasoning and task planning',
    displayNameKey: 'tools.reason.displayName',
    descriptionKey: 'tools.reason.description',
    category: 'utility',
    toggle: false,
  },
  [ToolName.REASON_SEARCH]: {
    name: ToolName.REASON_SEARCH,
    displayName: 'Research Agent',
    description: 'Research agent for information gathering',
    displayNameKey: 'tools.reason_search.displayName',
    descriptionKey: 'tools.reason_search.description',
    category: 'web',
    icon: 'search',
    toggle: false,
  },
  [ToolName.REASONING]: {
    name: ToolName.REASONING,
    displayName: 'Reasoning Control',
    description: 'Control reasoning display boundaries',
    displayNameKey: 'tools.reasoning.displayName',
    descriptionKey: 'tools.reasoning.description',
    category: 'utility',
    toggle: false,
  },
};

// Helper to check if a tool requires specific resources
export function toolRequirements(toolName: ToolName): {
  requiresAuth: boolean;
  requiresSetup: boolean;
} {
  const metadata = TOOL_METADATA[toolName];
  return {
    requiresAuth: metadata.requiresAuth || false,
    requiresSetup: metadata.requiresSetup || false,
  };
}