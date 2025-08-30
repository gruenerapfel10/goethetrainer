// Stub system prompts
export async function getSystemPrompt(type: string): Promise<string> {
  switch (type) {
    case 'job-assistant':
      return 'You are a helpful job assistant. Help users with career advice, job search strategies, and professional development.';
    case 'general-assistant':
      return 'You are a helpful AI assistant. Provide helpful, accurate, and concise responses to user queries.';
    case 'web-agent':
      return 'You are a web-aware AI assistant. You can search the web for current information when needed.';
    case 'image-agent':
      return 'You are an AI assistant that can generate and analyze images. Help users with visual content creation and analysis.';
    default:
      return 'You are a helpful AI assistant. Provide helpful, accurate, and concise responses to user queries.';
  }
}