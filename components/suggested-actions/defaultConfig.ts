// Default suggestions for each agent type
export interface SuggestedAction {
  title: string;
  label: string;
  action: string;
}

export interface SuggestedActionsConfig {
  [key: string]: SuggestedAction[];
}

export const defaultSuggestions: SuggestedActionsConfig = {
  'sharepoint-agent': [
    // Internal Data Assistant V1
    {
      title: 'Retrieve winning proposals',
      label: 'relevant to a new client.',
      action:
        "Retrieve winning proposals or case studies relevant to a new client. Before retrieving, ask me for the client's name or industry to ensure relevance. Then, summarise key points that contributed to success.",
    },
    {
      title: 'Show me our pricing',
      label: 'and service packages.',
      action:
        'Show me our pricing structures and service packages. Highlight any flexible options or customisation possibilities.',
    },
    {
      title: 'Retrieve key success factors',
      label: 'from our top projects.',
      action:
        "Retrieve information about our most successful client projects. Before retrieving, ask me if I'm looking for specific industries, project types, or deal sizes. Then, summarise key factors that contributed to success.",
    },
    {
      title: 'Summarise remote work policies',
      label: 'and key guidelines.',
      action:
        'Summarise our remote work policies. Highlight key rules, flexible options, and any recent updates.',
    },
  ],
  'sharepoint-agent-v2': [
    // Internal Data Assistant V2 - Enhanced with file handling
    {
      title: 'Analyze attached files',
      label: 'and find relevant insights.',
      action:
        'Please analyze the files I have attached and extract key insights, patterns, and recommendations.',
    },
    {
      title: 'Compare with knowledge base',
      label: 'and find similarities.',
      action:
        'Compare the content of attached files with our knowledge base to find similar cases, relevant policies, or matching documents.',
    },
    {
      title: 'Extract key information',
      label: 'from multiple sources.',
      action:
        'Extract and synthesize key information from both attached files and our knowledge base, providing a comprehensive analysis.',
    },
    {
      title: 'Generate recommendations',
      label: 'based on analysis.',
      action:
        'Based on the analysis of attached files and our knowledge base, generate specific recommendations and action items.',
    },
  ],
  'crawler-agent': [
    // Web Search Assistant
    {
      title: 'What are the latest trends',
      label: 'shaping our industry?',
      action:
        'What are the latest trends shaping our industry? Summarise key insights and explain how they impact businesses like ours.',
    },
    {
      title: 'Find case studies',
      label: 'of successful strategies in our industry.',
      action:
        "Find case studies of successful strategies in our industry. Before retrieving, ask me if I'm interested in examples from competitors, market leaders, or specific use cases. Then, summarise key takeaways.",
    },
    {
      title: 'How do top companies in our industry',
      label: 'differentiate themselves?',
      action:
        'How do the top companies in our industry differentiate themselves? Before retrieving, ask me if I want a broad overview or insights into a specific market segment. Then, provide examples of their positioning and competitive strengths.',
    },
    {
      title: 'What new regulations',
      label: 'affect our industry?',
      action:
        'What new regulations affect our industry? Summarise key changes and how companies are adapting to them.',
    },
  ],
  'general-bedrock-agent': [
    // Smart AI Assistant
    {
      title: "Let's create a proposal",
      label: 'for a new client.',
      action:
        "I need to draft a proposal for a new client. Before drafting, ask me step by step for key details like the client's name, website, services/products of interest, and any specific requirements. Then, generate a structured proposal.",
    },
    {
      title: 'Help me create a timeline',
      label: 'for a project.',
      action:
        'Help me create a project timeline. First, ask about key milestones and deliverables, then confirm deadlines and dependencies before generating a structured plan.',
    },
    {
      title: 'Brainstorm a campaign',
      label: 'with creative ideas.',
      action:
        "Let's brainstorm a creative marketing campaign. Before suggesting ideas, ask me for details like the campaign's objective, target audience, product focus, and preferred tone. Then, generate three creative directions.",
    },
    {
      title: 'Draft a response',
      label: 'to a customer complaint.',
      action:
        'I need to draft a response to a customer complaint. First, ask for details about the issue and any prior interactions. Then, confirm our typical resolution approach before generating a professional response.',
    },
  ],
  'deepresearch-agent': [
    // Reasoning Model Assistant
    {
      title: 'What risks and opportunities',
      label: 'should we prepare for?',
      action:
        "What are the top risks and opportunities for our company this year? Before analysing, ask me if I'm focused on financial, operational, or market risks. Then, prioritise them and suggest how we can prepare.",
    },
    {
      title: 'How can we strengthen',
      label: 'our competitive position?',
      action:
        'How can we strengthen our competitive position? Before analysing, ask me if we should focus on pricing, branding, market expansion, or another area. Then, suggest strategic actions we should take.',
    },
    {
      title: 'Before making a business decision',
      label: 'what should we consider?',
      action:
        'What critical factors should we evaluate before making a major business decision? Provide a structured checklist.',
    },
    {
      title: 'Evaluate AI investment',
      label: 'for our company.',
      action:
        'What are the key considerations for implementing AI in our company? Provide a cost-benefit analysis framework and potential risks to assess.',
    },
  ],
  'chat-model-reasoning': [
    // Reasoning Model Assistant (same as deepresearch-agent)
    {
      title: 'What risks and opportunities',
      label: 'should we prepare for?',
      action:
        "What are the top risks and opportunities for our company this year? Before analysing, ask me if I'm focused on financial, operational, or market risks. Then, prioritise them and suggest how we can prepare.",
    },
    {
      title: 'How can we strengthen',
      label: 'our competitive position?',
      action:
        'How can we strengthen our competitive position? Before analysing, ask me if we should focus on pricing, branding, market expansion, or another area. Then, suggest strategic actions we should take.',
    },
    {
      title: 'Before making a business decision',
      label: 'what should we consider?',
      action:
        'What critical factors should we evaluate before making a major business decision? Provide a structured checklist.',
    },
    {
      title: 'Evaluate AI investment',
      label: 'for our company.',
      action:
        'What are the key considerations for implementing AI in our company? Provide a cost-benefit analysis framework and potential risks to assess.',
    },
  ],
  'document-agent': [
    // Document Agent
    {
      title: 'Analyze this document',
      label: 'and summarize key points',
      action:
        'Please analyze the document I uploaded and provide a comprehensive summary of the key points and findings.',
    },
    {
      title: 'Extract data from this file',
      label: 'into a structured format',
      action:
        'Extract the important data from this document and organize it into a well-structured format that I can easily review.',
    },
    {
      title: 'Compare these documents',
      label: 'and highlight the differences',
      action:
        'I need to understand the differences between these documents. Please analyze them and highlight the key differences in content, approach, and conclusions.',
    },
    {
      title: 'Generate insights',
      label: 'based on this data',
      action:
        'Based on the data in this document, what are the most important insights we should consider? Please provide a detailed analysis.',
    },
  ],
};
