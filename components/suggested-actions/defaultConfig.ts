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
  'web-agent': [
    // Web Search Assistant
    {
      title: 'Research industry trends',
      label: 'and market insights',
      action:
        'Research the latest industry trends and market insights. Tell me which industry or topic you want me to focus on.',
    },
    {
      title: 'Find case studies',
      label: 'and success stories',
      action:
        'Search for relevant case studies and success stories in your industry. What specific type of cases are you looking for?',
    },
    {
      title: 'Analyze competitors',
      label: 'and their strategies',
      action:
        'Research and analyze competitor strategies and market positioning. Which competitors should I focus on?',
    },
    {
      title: 'Research regulations',
      label: 'and compliance requirements',
      action:
        'Find information about current regulations and compliance requirements. Which jurisdiction or industry regulations do you need?',
    },
  ],
  'image-agent': [
    // Image Generation Assistant
    {
      title: 'Create a logo',
      label: 'for my brand',
      action:
        'Generate a professional logo design. Describe your brand, preferred style, colors, and any specific elements you want included.',
    },
    {
      title: 'Design an infographic',
      label: 'to visualize data',
      action:
        'Create an infographic to visualize complex data. What data points and visual style would you like me to use?',
    },
    {
      title: 'Generate illustrations',
      label: 'for presentations',
      action:
        'Create custom illustrations for your presentation. Describe the concept, style, and purpose of the illustrations.',
    },
    {
      title: 'Create social media graphics',
      label: 'for marketing campaigns',
      action:
        'Design eye-catching social media graphics. Tell me about your campaign, target platform, and brand guidelines.',
    },
  ],
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
  'general-bedrock-agent': [
    // Goethe University Application Assistant
    {
      title: "Help me choose universities",
      label: 'that match my profile.',
      action:
        "Help me find universities that match my academic profile and career goals. Ask me about my intended major, GPA, test scores, location preferences, and career aspirations. Then recommend suitable universities from the top 500.",
    },
    {
      title: 'Create my application timeline',
      label: 'with all important deadlines.',
      action:
        'Create a personalized application timeline with all important deadlines. Ask me about my target universities, application types (EA, ED, RD), and current academic year. Then generate a comprehensive timeline with key milestones.',
    },
    {
      title: 'Review my personal statement',
      label: 'and provide feedback.',
      action:
        "Review and improve my personal statement or essays. Ask me to share my draft and tell me about my target universities and intended major. Then provide detailed feedback on content, structure, and impact.",
    },
    {
      title: 'Compare university programs',
      label: 'to help me decide.',
      action:
        'Compare different university programs to help me make an informed decision. Tell me which universities and programs you want me to compare, and what factors are most important to you (rankings, location, cost, culture, etc.).',
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
  'csv-agent': [
    // CSV Data Analysis
    {
      title: 'Analyze this data',
      label: 'and show key patterns',
      action:
        'Please analyze the CSV data I uploaded and identify key patterns, trends, and insights from the dataset.',
    },
    {
      title: 'Summarize statistics',
      label: 'for all columns',
      action:
        'Generate a comprehensive statistical summary of all columns in the CSV file, including means, medians, ranges, and distributions.',
    },
    {
      title: 'Find trends over time',
      label: 'if time data exists',
      action:
        'Identify and visualize any time-based trends in the data. Show me how values change over time and highlight significant patterns.',
    },
    {
      title: 'Create visualizations',
      label: 'to understand the data',
      action:
        'Create relevant charts and visualizations to help me better understand the relationships and patterns in this CSV data.',
    },
  ],
  'csv-agent-v2': [
    // CSV Data Analysis V2
    {
      title: 'Analyze this data',
      label: 'and show key patterns',
      action:
        'Please analyze the CSV data I uploaded and identify key patterns, trends, and insights from the dataset.',
    },
    {
      title: 'Summarize statistics',
      label: 'for all columns',
      action:
        'Generate a comprehensive statistical summary of all columns in the CSV file, including means, medians, ranges, and distributions.',
    },
    {
      title: 'Find trends over time',
      label: 'if time data exists',
      action:
        'Identify and visualize any time-based trends in the data. Show me how values change over time and highlight significant patterns.',
    },
    {
      title: 'Create visualizations',
      label: 'to understand the data',
      action:
        'Create relevant charts and visualizations to help me better understand the relationships and patterns in this CSV data.',
    },
  ],
  'text2sql-agent': [
    // SQL Database Query Assistant
    {
      title: 'Show database tables',
      label: 'and their structure',
      action:
        'Show me all available tables in the database and their column structure. Include data types and relationships.',
    },
    {
      title: 'Get top records',
      label: 'from main tables',
      action:
        'Show me the top 10 records from the main tables to understand the data structure and content.',
    },
    {
      title: 'Generate summary stats',
      label: 'across all tables',
      action:
        'Generate aggregate statistics for all numerical columns across the database tables, including counts, averages, and ranges.',
    },
    {
      title: 'Find relationships',
      label: 'between tables',
      action:
        'Analyze and show me the relationships between different tables in the database, including foreign keys and join conditions.',
    },
  ],
};
