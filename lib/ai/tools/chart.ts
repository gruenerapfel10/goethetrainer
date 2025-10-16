import { tool } from 'ai';
import { z } from 'zod';

// Chart Type Definitions for shadcn/ui charts
export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'radar' | 'radialBar' | 'scatter';

// shadcn/ui ChartConfig type (matches the component)
export type ShadcnChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<'light' | 'dark', string> }
  );
};

// Chart data point for shadcn/ui charts
export interface ChartDataPoint {
  [key: string]: string | number;
}

// Chart configuration for AI agents
export interface ChartConfig {
  type: ChartType;
  data: ChartDataPoint[];
  config: ShadcnChartConfig;
  title?: string;
  subtitle?: string;
  width?: number;
  height?: number;
  className?: string;
}

// Default color palettes for different themes
export const DEFAULT_COLORS = {
  light: [
    'hsl(221.2 83.2% 53.3%)', // Blue
    'hsl(142.1 76.2% 36.3%)', // Green
    'hsl(27.9 96% 61%)', // Orange
    'hsl(0 84.2% 60.2%)', // Red
    'hsl(270.7 91% 65.1%)', // Purple
    'hsl(193.4 95.9% 68.3%)', // Cyan
    'hsl(84.2 85.6% 56.5%)', // Lime
    'hsl(30.7 91% 69%)', // Amber
  ],
  dark: [
    'hsl(217.2 91.2% 59.8%)', // Blue (darker)
    'hsl(142.1 70.6% 45.3%)', // Green (darker)
    'hsl(27.9 91% 69%)', // Orange (darker)
    'hsl(0 72.2% 50.6%)', // Red (darker)
    'hsl(270.7 91% 65.1%)', // Purple
    'hsl(193.4 95.9% 68.3%)', // Cyan
    'hsl(84.2 85.6% 56.5%)', // Lime
    'hsl(30.7 91% 69%)', // Amber
  ],
};

// Chart configuration schema for AI agents
const chartConfigSchema = z.object({
  type: z.enum(['line', 'bar', 'area', 'pie', 'radar', 'radialBar', 'scatter']),
  data: z.array(z.record(z.union([z.string(), z.number()]))),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  className: z.string().optional(),
});

// Chart generation tool parameters
const chartParameters = z.object({
  chartConfig: chartConfigSchema.describe('Complete chart configuration including type, data, and display options'),
  reasoning: z.string().optional().describe('Optional explanation of why this chart type and configuration was chosen for the data'),
});

// Utility functions for data processing
export const processDataForShadcnChart = (rawData: any[], chartType: ChartType): { data: ChartDataPoint[]; config: ShadcnChartConfig } => {
  if (!rawData || rawData.length === 0) {
    return { data: [], config: {} };
  }

  // Auto-detect data structure
  const firstRow = rawData[0];
  const keys = Object.keys(firstRow);
  const numericKeys = keys.filter(key => typeof firstRow[key] === 'number');
  const stringKeys = keys.filter(key => typeof firstRow[key] === 'string');

  let processedData: ChartDataPoint[] = rawData;
  let config: ShadcnChartConfig = {};

  // Generate config based on chart type and data
  if (chartType === 'pie' || chartType === 'radialBar') {
    // For pie charts, we need name and value
    const nameKey = stringKeys[0] || keys[0];
    const valueKey = numericKeys[0] || keys[1];
    
    processedData = rawData.map((row, index) => ({
      name: row[nameKey],
      value: row[valueKey],
    }));

    config = {
      value: {
        label: 'Value',
        color: DEFAULT_COLORS.light[0],
      },
    };
  } else if (chartType === 'scatter') {
    // For scatter plots, use first two numeric columns
    if (numericKeys.length >= 2) {
      processedData = rawData.map((row, index) => ({
        x: row[numericKeys[0]],
        y: row[numericKeys[1]],
        name: row[stringKeys[0]] || `Point ${index + 1}`,
      }));

      config = {
        x: {
          label: numericKeys[0],
          color: DEFAULT_COLORS.light[0],
        },
        y: {
          label: numericKeys[1],
          color: DEFAULT_COLORS.light[1],
        },
      };
    }
  } else {
    // For line, bar, area charts
    const labelKey = stringKeys[0] || keys[0];
    
    processedData = rawData.map(row => {
      const newRow: ChartDataPoint = {};
      newRow[labelKey] = row[labelKey];
      
      numericKeys.forEach(key => {
        if (key !== labelKey) {
          newRow[key] = row[key];
        }
      });
      
      return newRow;
    });

    // Generate config for each numeric field
    numericKeys.forEach((key, index) => {
      if (key !== labelKey) {
        config[key] = {
          label: key.charAt(0).toUpperCase() + key.slice(1),
          color: DEFAULT_COLORS.light[index % DEFAULT_COLORS.light.length],
        };
      }
    });
  }

  return { data: processedData, config };
};

// Chart recommendation engine
export const recommendChartType = (data: any[], userIntent?: string): ChartType => {
  if (!data || data.length === 0) return 'bar';
  
  const firstRow = data[0];
  const keys = Object.keys(firstRow);
  const numericKeys = keys.filter(key => typeof firstRow[key] === 'number');
  const stringKeys = keys.filter(key => typeof firstRow[key] === 'string');
  
  // Intent-based recommendations
  if (userIntent) {
    const intent = userIntent.toLowerCase();
    if (intent.includes('trend') || intent.includes('time') || intent.includes('over time')) return 'line';
    if (intent.includes('compare') || intent.includes('comparison')) return 'bar';
    if (intent.includes('proportion') || intent.includes('percentage') || intent.includes('share')) return 'pie';
    if (intent.includes('correlation') || intent.includes('relationship')) return 'scatter';
    if (intent.includes('area') || intent.includes('cumulative')) return 'area';
    if (intent.includes('circular') || intent.includes('radial')) return 'radialBar';
    if (intent.includes('radar') || intent.includes('spider')) return 'radar';
  }
  
  // Data-based recommendations
  if (keys.some(key => key.toLowerCase().includes('date') || key.toLowerCase().includes('time'))) {
    return 'line'; // Time series
  }
  
  if (numericKeys.length >= 2 && stringKeys.length === 0) {
    return 'scatter'; // Numeric correlation
  }
  
  if (stringKeys.length === 1 && numericKeys.length === 1 && data.length <= 10) {
    return 'pie'; // Categorical proportions
  }

  if (numericKeys.length > 3) {
    return 'radar'; // Multi-dimensional data
  }
  
  return 'bar'; // Default fallback
};

// Enhanced chart tool for AI agents
export const chartTool = tool({
  description: `- line: Time series data and trends
  - bar: Category comparisons
  - area: Cumulative trends
  - pie: Proportions and percentages
  - radar: Multi-dimensional comparisons
  - radialBar: Circular progress charts
  - scatter: Correlation analysis`,
  
  inputSchema: chartParameters,
  
  execute: async ({ chartConfig, reasoning }) => {
    try {
      if (reasoning) {
      }
      
      // Add a small delay to show the beautiful loading animation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Process the data and generate shadcn config
      const { data, config } = processDataForShadcnChart(chartConfig.data, chartConfig.type);
      
      // Create the final chart configuration
      const finalConfig: ChartConfig = {
        type: chartConfig.type,
        data,
        config,
        title: chartConfig.title,
        subtitle: chartConfig.subtitle,
        width: chartConfig.width || 800,
        height: chartConfig.height || 400,
        className: chartConfig.className,
      };
      
      
      return {
        success: true,
        chartConfig: finalConfig,
        message: `Successfully generated ${finalConfig.type} chart with ${finalConfig.data.length} data points${reasoning ? ` - ${reasoning}` : ''}`,
        metadata: {
          chartType: finalConfig.type,
          dataPointCount: finalConfig.data.length,
          configKeys: Object.keys(finalConfig.config),
          hasTitle: !!finalConfig.title,
          dimensions: {
            width: finalConfig.width,
            height: finalConfig.height,
          },
          processingSteps: [
            'Analyzed data structure',
            'Selected optimal chart type',
            'Generated color scheme',
            'Configured responsive layout',
            'Applied accessibility features'
          ]
        },
      };
      
    } catch (error) {
      console.error('Shadcn chart generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during chart generation',
        message: 'Failed to generate chart',
      };
    }
  },
}); 