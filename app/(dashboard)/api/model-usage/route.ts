import { type NextRequest, NextResponse } from 'next/server';
import { countModelTokenUsage } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const rawModelUsage = await countModelTokenUsage();

    const getModelColor = (modelId: string): string => {
      if (modelId.toLowerCase().includes('claude-4-5-sonnet') || modelId.toLowerCase().includes('claude-sonnet-4')) return '#8F7CFF';
      if (modelId.toLowerCase().includes('claude-3-haiku')) return '#3BCF92';
      if (modelId.toLowerCase().includes('claude-3-7-sonnet')) return '#F9A03F';
      if (modelId.toLowerCase().includes('deepseek')) return '#9B59B6';
      return '#F26464';
    };

    const getModelDisplayName = (modelId: string): string => {
      if (!modelId) return 'Unknown Model';
      
      // Handle specific model IDs
      if (modelId === 'bedrock-sonnet-latest') return 'Claude 4 Sonnet';
      if (modelId.includes('claude-3-5-sonnet-20240620')) return 'Claude 3.5 Sonnet';
      if (modelId.includes('claude-3-5-sonnet')) return 'Claude 3.5 Sonnet';
      if (modelId.includes('claude-sonnet-4')) return 'Claude 4 Sonnet';
      if (modelId.includes('claude-3-7-sonnet')) return 'Claude 3.7 Sonnet';
      if (modelId.includes('claude-3-haiku')) return 'Claude 3 Haiku';
      if (modelId.includes('claude-3-opus')) return 'Claude 3 Opus';
      if (modelId.includes('deepseek-r1')) return 'DeepSeek R1';
      if (modelId.includes('deepseek')) return 'DeepSeek';
      
      // For EU region models, extract the model name
      if (modelId.startsWith('eu.anthropic.')) {
        const parts = modelId.split('.');
        if (parts.length >= 3) {
          const modelPart = parts[2]; // e.g., "claude-sonnet-4-20250514-v1:0"
          
          if (modelPart.includes('claude-sonnet-4')) return 'Claude 4 Sonnet';
          if (modelPart.includes('claude-3-5-sonnet')) return 'Claude 3.5 Sonnet';
          if (modelPart.includes('claude-3-7-sonnet')) return 'Claude 3.7 Sonnet';
          if (modelPart.includes('claude-3-haiku')) return 'Claude 3 Haiku';
          if (modelPart.includes('claude-3-opus')) return 'Claude 3 Opus';
        }
      }
      
      // For anthropic models, extract the model name
      if (modelId.startsWith('anthropic.')) {
        if (modelId.includes('claude-3-5-sonnet')) return 'Claude 3.5 Sonnet';
        if (modelId.includes('claude-3-haiku')) return 'Claude 3 Haiku';
        if (modelId.includes('claude-3-opus')) return 'Claude 3 Opus';
        if (modelId.includes('claude-3-sonnet')) return 'Claude 3 Sonnet';
      }
      
      // Fallback: clean up the model ID for display
      return modelId
        .replace(/^(eu\.|anthropic\.)/, '')
        .replace(/-v\d+:\d+$/, '')
        .replace(/\d{8}-/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    };

    const json = {
      modelUsage: rawModelUsage.map((usage) => ({
        ...usage,
        color: getModelColor(usage.modelId || ''),
        displayName: getModelDisplayName(usage.modelId || ''),
      })),
      totalCount: rawModelUsage?.[0]?.grandTotal ?? 0,
    };

    return NextResponse.json(json);
  } catch (error) {
    console.error(
      `[/api/model-usage] Error fetching`,
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      { error: `Failed to fetch total tokens` },
      { status: 500 },
    );
  }
}
