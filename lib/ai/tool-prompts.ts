/**
 * Tool-specific prompt enhancements
 * These are added to the system prompt when specific tools are available
 */

export function getToolSpecificPrompts(availableTools: readonly string[]): string {
  const prompts: string[] = [];

  // Chart tool specific prompt
  if (availableTools.includes('chart')) {
    prompts.push(`
📊 CHART TOOL USAGE RULES:
You have the 'chart' tool available. You MUST use it for ALL visualization requests including:
- Charts, graphs, plots, diagrams
- Data visualizations of any kind
- When users ask to "show", "display", or "visualize" data
- Statistical or analytical presentations

NEVER generate HTML/SVG/code for charts - the chart tool handles everything.
The tool will automatically create beautiful, interactive, themed visualizations.`);
  }

  // Add more tool-specific prompts here as needed
  if (availableTools.includes('createDocument')) {
    prompts.push(`
📄 DOCUMENT CREATION:
Use the 'createDocument' tool for creating artifacts when explicitly requested.`);
  }

  return prompts.join('\n');
}

/**
 * Enhance system prompt with tool-specific instructions
 */
export function enhanceSystemPromptWithTools(
  basePrompt: string,
  availableTools: readonly string[]
): string {
  const toolPrompts = getToolSpecificPrompts(availableTools);
  
  if (!toolPrompts) {
    return basePrompt;
  }

  return `${basePrompt}\n\n${toolPrompts}`;
}