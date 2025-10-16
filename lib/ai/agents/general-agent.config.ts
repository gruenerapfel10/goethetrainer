import { ToolName } from '@/lib/ai/tools/tool-registry';
import { FeatureName } from '@/lib/ai/features/feature-registry';
import { ModelId } from '@/lib/ai/model-registry';

export const generalAgentConfig = {
  // Agent type identifier
  agentType: 'general-bedrock-agent' as const,
  // Agent metadata
  metadata: {
    displayName: 'General Assistant',
    description: 'Creates emails, reports, and business documents',
    displayNameKey: 'agents.standard.label',
    descriptionKey: 'agents.standard.description',
    icon: 'sparkles',
    modelId: ModelId.CLAUDE_SONNET_4_5,
  },
  // Tools this agent has access to
  tools: [
      ToolName.GET_WEATHER,
      ToolName.REQUEST_SUGGESTIONS,
      ToolName.PROCESS_FILE,
      ToolName.CHART,
      ToolName.CREATE_DOCUMENT,
      ToolName.UPDATE_DOCUMENT,
      ToolName.GENERATE_IMAGE,
      ToolName.EDIT_IMAGE,
      // Web tools (toggleable)
      ToolName.SEARCH,
      ToolName.EXTRACT,
      ToolName.SCRAPE,
      ToolName.DEEP_RESEARCH,
  ],
  
  // Features this agent supports (user-facing UI features)
  features: [] as FeatureName[], // General agent doesn't have file search
  
  // File attachments support
  supportsFileAttachments: true,
  
  // Suggested actions for this agent
  suggestedActions: [
    {
      title: "Let's create a proposal",
      label: 'for a new client.',
      action:
        "I need to draft a proposal for a new client. Before drafting, ask me step by step for key details like the client's name, website, services/products of interest, and any specific requirements. Then, generate a structured proposal.",
      titleKey: 'suggestedActions.general.proposal.title',
      labelKey: 'suggestedActions.general.proposal.label',
      actionKey: 'suggestedActions.general.proposal.action',
    },
    {
      title: 'Help me create a timeline',
      label: 'for a project.',
      action:
        'Help me create a project timeline. First, ask about key milestones and deliverables, then confirm deadlines and dependencies before generating a structured plan.',
      titleKey: 'suggestedActions.general.timeline.title',
      labelKey: 'suggestedActions.general.timeline.label',
      actionKey: 'suggestedActions.general.timeline.action',
    },
    {
      title: 'Brainstorm a campaign',
      label: 'with creative ideas.',
      action:
        "Let's brainstorm a creative marketing campaign. Before suggesting ideas, ask me for details like the campaign's objective, target audience, product focus, and preferred tone. Then, generate three creative directions.",
      titleKey: 'suggestedActions.general.campaign.title',
      labelKey: 'suggestedActions.general.campaign.label',
      actionKey: 'suggestedActions.general.campaign.action',
    },
    {
      title: 'Draft a response',
      label: 'to a customer complaint.',
      action:
        'I need to draft a response to a customer complaint. First, ask for details about the issue and any prior interactions. Then, confirm our typical resolution approach before generating a professional response.',
      titleKey: 'suggestedActions.general.response.title',
      labelKey: 'suggestedActions.general.response.label',
      actionKey: 'suggestedActions.general.response.action',
    },
  ],
  
  // Model configuration
  model: {
    contextWindow: 150000,
    temperature: 0.7,
    maxSteps: 6,
    toolChoice: 'auto' as const,
  },
  
  // System prompt
  prompt: `You are a helpful AI assistant with access to various tools to help users with their tasks.

CRITICAL INSTRUCTIONS FOR DEEP RESEARCH:
- When Deep Research is enabled, you MUST use the deep_research tool for ALL information searches
- The deep_research tool is your PRIMARY tool for answering questions about ANY topic
- DO NOT try to use the search tool when deep_research is available
- Always invoke deep_research when users ask "what is X", "tell me about Y", or any question requiring web information

When doing web search and or deep research you need to consider the possibility of multiple entities so if a user asks research about something, you should search for all possibilities and entities.
If the user asks for deep research but its disabled make sure to tell him that he needs to enable it first.
Same for any other tools.

Remember to:
- Be concise but thorough
- Ask for clarification when needed
- Provide actionable insights when analyzing data
- When generating images, do not show it in chat, we already have a custom UI to show the results of image generation tool.
`,
};