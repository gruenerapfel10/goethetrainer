import { ToolName } from '@/lib/ai/tools/tool-registry';
import { FeatureName } from '@/lib/ai/features/feature-registry';
import { ModelId } from '@/lib/ai/model-registry';

export const sharepointAgentConfig = {
  // Agent type identifier
  agentType: 'sharepoint-agent' as const,
  // Agent metadata
  metadata: {
    displayName: 'SharePoint Assistant',
    description: 'Search and analyze SharePoint documents',
    displayNameKey: 'agents.sharepoint.label',
    descriptionKey: 'agents.sharepoint.description',
    icon: 'box',
    modelId: ModelId.CLAUDE_SONNET_4_5,
  },
  // Tools this agent has access to
  tools: [ToolName.SHAREPOINT_RETRIEVE, ToolName.CHART],
  
  // Features this agent supports (user-facing UI features)
  features: [FeatureName.FILE_SEARCH],
  
  // File attachments support
  supportsFileAttachments: false,
  
  // Suggested actions for this agent
  suggestedActions: [
    {
      title: 'Retrieve winning proposals',
      label: 'relevant to a new client.',
      action:
        'Retrieve winning proposals or case studies relevant to a new client. Before retrieving, ask me for the client\'s name or industry to ensure relevance. Then, summarise key points that contributed to success.',
      titleKey: 'suggestedActions.sharepoint.winningProposals.title',
      labelKey: 'suggestedActions.sharepoint.winningProposals.label',
      actionKey: 'suggestedActions.sharepoint.winningProposals.action',
    },
    {
      title: 'Show me our pricing',
      label: 'and service packages.',
      action:
        'Show me our pricing structures and service packages. Highlight any flexible options or customisation possibilities.',
      titleKey: 'suggestedActions.sharepoint.pricing.title',
      labelKey: 'suggestedActions.sharepoint.pricing.label',
      actionKey: 'suggestedActions.sharepoint.pricing.action',
    },
    {
      title: 'Retrieve key success factors',
      label: 'from our top projects.',
      action:
        'Retrieve information about our most successful client projects. Before retrieving, ask me if I\'m looking for specific industries, project types, or deal sizes. Then, summarise key factors that contributed to success.',
      titleKey: 'suggestedActions.sharepoint.successFactors.title',
      labelKey: 'suggestedActions.sharepoint.successFactors.label',
      actionKey: 'suggestedActions.sharepoint.successFactors.action',
    },
    {
      title: 'Summarise remote work policies',
      label: 'and key guidelines.',
      action:
        'Summarise our remote work policies. Highlight key rules, flexible options, and any recent updates.',
      titleKey: 'suggestedActions.sharepoint.remoteWork.title',
      labelKey: 'suggestedActions.sharepoint.remoteWork.label',
      actionKey: 'suggestedActions.sharepoint.remoteWork.action',
    },
  ],
  
  // Model configuration
  model: {
    contextWindow: 150000,
    temperature: 1.0,
    toolChoice: 'auto' as const,
    maxSteps: 12
  },
  
  // System prompt
  prompt: `You are a business intelligence model, cold, objective, succint.
  Ignore irrelevant queries like "Hello", "How are you", "What is the weather like".
  If a user asks about somehting always use sharepoint_retrieve

  You must always start with
  <reasoning></reasoning>

  WRONG: "Let me search for info <reasoning>Okay I will call the tool</reasoning>"
  WRONG: "Let me search for info <reasoning>Okay I will call the tool</reasoning> Okay calling it"
  RIGHT: "<reasoning>Okay I will call the tool, let me search for info</reasoning>"

  no text before or after a <reasoning> or </reasoning>

  With at least a full paragraph of your thoughts.

  # Executive Summary
  ## Key findings
  ## Recommendations

  tools:
  - sharepoint_retrieve:
  * required parameter: query (string) - a specific filename or search query to find documents

  - you must always write comments before calling tools

  watch out for hallucinations / irrelevant data.

  Always comment on the quality of the data and its relevancy before making a statement.

  If you dont find sufficient or relevant results for a query then try again with several retrievals, but if you find enough data on the first, there is no need for more.
  Avoid making more than 4 tool calls in a message.
`,
};