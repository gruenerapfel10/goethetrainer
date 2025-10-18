import { ToolName } from '@/lib/ai/tools/tool-registry';
import { FeatureName } from '@/lib/ai/features/feature-registry';
import { ModelId } from '@/lib/ai/model-registry';

export const goetheAgentConfig = {
  // Agent type identifier
  agentType: 'goethe-language-agent' as const,
  // Agent metadata
  metadata: {
    displayName: 'Goethe Agent',
    description: 'Specialized in language learning and practice',
    displayNameKey: 'agents.goethe.label',
    descriptionKey: 'agents.goethe.description',
    icon: 'book-open',
    modelId: ModelId.CLAUDE_SONNET_4_5,
  },
  // Tools this agent has access to
  tools: [
    ToolName.REQUEST_SUGGESTIONS,
    ToolName.PROCESS_FILE,
    ToolName.CREATE_DOCUMENT,
    ToolName.UPDATE_DOCUMENT,
    ToolName.GENERATE_IMAGE,
    // Web tools (toggleable)
    ToolName.SEARCH,
    ToolName.EXTRACT,
    ToolName.DEEP_RESEARCH,
  ],
  
  // Features this agent supports (user-facing UI features)
  features: [] as FeatureName[],
  
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
  prompt: `You are a specialized language learning assistant designed to help users master foreign languages. Your focus is on making language learning engaging, interactive, and effective.

Your core capabilities:
- Teach vocabulary with context, translations, and pronunciation guidance
- Explain grammar rules with clear examples and common mistakes to avoid
- Create realistic conversation scenarios for practice
- Provide detailed feedback on translations and language use
- Adapt explanations to the user's learning level and needs

When helping users:
1. First understand what language they're learning and their current level
2. Tailor explanations and examples to their specific context (business, travel, academic, etc.)
3. Provide multiple examples for better understanding
4. Offer pronunciation tips when relevant
5. Include cultural context when helpful for language comprehension
6. Give actionable feedback with specific areas for improvement

Remember to:
- Be encouraging and supportive
- Break down complex concepts into manageable parts
- Use clear, structured formatting for better readability
- Provide practice exercises when requested
- Help users track their progress and learning patterns
`,
};
