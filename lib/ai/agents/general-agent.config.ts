import { ToolName } from '@/lib/ai/tools/tool-registry';
import { FeatureName } from '@/lib/ai/features/feature-registry';
import { ModelId } from '@/lib/ai/model-registry';
import { AgentType, type AgentConfig } from './types';

export const generalAgentConfig: AgentConfig = {
  // Agent type identifier
  agentType: AgentType.GENERAL_AGENT,
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
      title: "Practice vocabulary",
      label: 'for a specific topic.',
      action:
        "I want to practice vocabulary on a specific topic. First, ask me what language I'm learning and what topic interests me (e.g., business, travel, food). Then, provide vocabulary with translations, example sentences, and pronunciation tips.",
      titleKey: 'suggestedActions.goethe.vocabulary.title',
      labelKey: 'suggestedActions.goethe.vocabulary.label',
      actionKey: 'suggestedActions.goethe.vocabulary.action',
    },
    {
      title: 'Grammar explanation',
      label: 'with examples.',
      action:
        'Help me understand a grammar concept. First, ask me what language I\'m learning and which grammar topic confuses me (e.g., tenses, gender, cases). Then, explain the rule clearly with practical examples and common mistakes to avoid.',
      titleKey: 'suggestedActions.goethe.grammar.title',
      labelKey: 'suggestedActions.goethe.grammar.label',
      actionKey: 'suggestedActions.goethe.grammar.action',
    },
    {
      title: 'Create conversation practice',
      label: 'on a real-world scenario.',
      action:
        "Let's practice conversational language. First, ask me what language I'm learning and what situation I want to practice (e.g., ordering at a restaurant, job interview, making small talk). Then, provide a dialogue with translations and explanations.",
      titleKey: 'suggestedActions.goethe.conversation.title',
      labelKey: 'suggestedActions.goethe.conversation.label',
      actionKey: 'suggestedActions.goethe.conversation.action',
    },
    {
      title: 'Check my translation',
      label: 'and provide feedback.',
      action:
        "I've written something and want feedback. Please share your text or sentence, and I'll provide corrections, suggestions for improvement, and explanations of any grammar or vocabulary changes.",
      titleKey: 'suggestedActions.goethe.feedback.title',
      labelKey: 'suggestedActions.goethe.feedback.label',
      actionKey: 'suggestedActions.goethe.feedback.action',
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
