import {
  ChartData,
  ChartType,
  ChartConfig,
  Dataset,
  DataField,
  FieldStatistics,
  VisualizationInsight,
} from './types';
import { generateUUID } from '@/lib/utils';

export class ChartBuilder {
  private static instance: ChartBuilder;
  
  private constructor() {}
  
  static getInstance(): ChartBuilder {
    if (!ChartBuilder.instance) {
      ChartBuilder.instance = new ChartBuilder();
    }
    return ChartBuilder.instance;
  }

  // Create chart from dataset
  createChart(
    type: ChartType,
    dataset: Dataset,
    config?: Partial<ChartConfig>
  ): ChartData {
    const defaultConfig = this.getDefaultConfig(type);
    const chartData = this.prepareChartData(type, dataset);
    
    return {
      id: generateUUID(),
      type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Chart`,
      data: chartData,
      config: { ...defaultConfig, ...config },
      created: new Date(),
      updated: new Date(),
    };
  }

  // Get default configuration for chart type
  private getDefaultConfig(type: ChartType): ChartConfig {
    const baseConfig: ChartConfig = {
      dimensions: {
        width: 800,
        height: 400,
        margin: { top: 20, right: 20, bottom: 40, left: 60 },
      },
      colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'],
      theme: 'auto',
      animations: true,
      interactive: true,
      legend: {
        show: true,
        position: 'bottom',
      },
      tooltip: {
        show: true,
      },
      responsive: true,
    };

    // Type-specific configurations
    switch (type) {
      case 'line':
      case 'area':
        return {
          ...baseConfig,
          axes: {
            x: { show: true, grid: true },
            y: { show: true, grid: true },
          },
        };
      case 'bar':
        return {
          ...baseConfig,
          axes: {
            x: { show: true, type: 'category' },
            y: { show: true, grid: true },
          },
        };
      case 'pie':
      case 'donut':
        return {
          ...baseConfig,
          dimensions: { width: 400, height: 400 },
          legend: { show: true, position: 'right' },
        };
      case 'heatmap':
        return {
          ...baseConfig,
          colors: ['#f3f4f6', '#fbbf24', '#f59e0b', '#ef4444', '#dc2626'],
          legend: { show: true, position: 'right' },
        };
      default:
        return baseConfig;
    }
  }

  // Prepare data for specific chart type
  private prepareChartData(type: ChartType, dataset: Dataset): any {
    // This is a simplified version - real implementation would be more complex
    const records = this.generateSampleData(type, dataset.fields);
    
    switch (type) {
      case 'line':
      case 'area':
        return {
          series: records.map((r, i) => ({
            name: `Series ${i + 1}`,
            data: r.values,
          })),
        };
      case 'bar':
        return {
          categories: records.map(r => r.category),
          series: [{
            name: 'Values',
            data: records.map(r => r.value),
          }],
        };
      case 'pie':
      case 'donut':
        return {
          labels: records.map(r => r.label),
          values: records.map(r => r.value),
        };
      case 'scatter':
      case 'bubble':
        return {
          series: records.map((r, i) => ({
            name: `Group ${i + 1}`,
            data: r.points,
          })),
        };
      default:
        return { records };
    }
  }

  // Generate sample data for demonstration
  private generateSampleData(type: ChartType, fields: DataField[]): any[] {
    const sampleSize = 20;
    const data = [];
    
    for (let i = 0; i < sampleSize; i++) {
      switch (type) {
        case 'line':
        case 'area':
          data.push({
            x: i,
            values: Array.from({ length: 3 }, () => Math.random() * 100),
          });
          break;
        case 'bar':
          data.push({
            category: `Category ${i + 1}`,
            value: Math.random() * 100,
          });
          break;
        case 'pie':
        case 'donut':
          if (i < 5) {
            data.push({
              label: `Segment ${i + 1}`,
              value: Math.random() * 100,
            });
          }
          break;
        case 'scatter':
        case 'bubble':
          data.push({
            points: Array.from({ length: 10 }, () => ({
              x: Math.random() * 100,
              y: Math.random() * 100,
              size: type === 'bubble' ? Math.random() * 20 : 5,
            })),
          });
          break;
        default:
          data.push({
            id: i,
            value: Math.random() * 100,
            category: `Item ${i + 1}`,
          });
      }
    }
    
    return data;
  }

  // Calculate field statistics
  calculateFieldStatistics(data: any[], field: string): FieldStatistics {
    const values = data.map(d => d[field]).filter(v => v != null);
    const numbers = values.filter(v => typeof v === 'number');
    
    const stats: FieldStatistics = {
      count: data.length,
      unique: new Set(values).size,
      missing: data.length - values.length,
    };
    
    if (numbers.length > 0) {
      numbers.sort((a, b) => a - b);
      stats.min = numbers[0];
      stats.max = numbers[numbers.length - 1];
      stats.mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
      stats.median = numbers[Math.floor(numbers.length / 2)];
      
      // Calculate standard deviation
      const variance = numbers.reduce((sum, num) => {
        return sum + Math.pow(num - stats.mean!, 2);
      }, 0) / numbers.length;
      stats.stdDev = Math.sqrt(variance);
      
      // Calculate quartiles
      stats.quartiles = [
        numbers[Math.floor(numbers.length * 0.25)],
        stats.median,
        numbers[Math.floor(numbers.length * 0.75)],
      ];
    }
    
    // Calculate distribution for categorical data
    if (values.length > 0 && typeof values[0] !== 'number') {
      const distribution = new Map<any, number>();
      values.forEach(v => {
        distribution.set(v, (distribution.get(v) || 0) + 1);
      });
      stats.distribution = Array.from(distribution.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10
    }
    
    return stats;
  }

  // Generate visualization insights
  generateInsights(chartData: ChartData): VisualizationInsight[] {
    const insights: VisualizationInsight[] = [];
    
    // Analyze trends
    if (['line', 'area'].includes(chartData.type)) {
      const trendInsight = this.analyzeTrend(chartData.data);
      if (trendInsight) insights.push(trendInsight);
    }
    
    // Detect anomalies
    const anomalies = this.detectAnomalies(chartData.data);
    insights.push(...anomalies);
    
    // Find correlations
    if (['scatter', 'bubble'].includes(chartData.type)) {
      const correlation = this.analyzeCorrelation(chartData.data);
      if (correlation) insights.push(correlation);
    }
    
    // Pattern recognition
    const patterns = this.detectPatterns(chartData.data);
    insights.push(...patterns);
    
    return insights;
  }

  private analyzeTrend(data: any): VisualizationInsight | null {
    // Simplified trend analysis
    if (!data.series || data.series.length === 0) return null;
    
    const series = data.series[0].data;
    if (!Array.isArray(series) || series.length < 3) return null;
    
    // Calculate simple linear regression
    const n = series.length;
    const sumX = series.reduce((sum, _, i) => sum + i, 0);
    const sumY = series.reduce((sum, val) => sum + val, 0);
    const sumXY = series.reduce((sum, val, i) => sum + i * val, 0);
    const sumX2 = series.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const trend = slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';
    
    return {
      id: generateUUID(),
      type: 'trend',
      title: `${trend.charAt(0).toUpperCase() + trend.slice(1)} Trend Detected`,
      description: `The data shows a ${trend} trend with a slope of ${slope.toFixed(2)}`,
      confidence: Math.min(Math.abs(slope) * 2, 1),
      importance: Math.abs(slope) > 0.5 ? 'high' : 'medium',
      recommendations: [
        trend === 'increasing' ? 'Consider scaling resources to handle growth' :
        trend === 'decreasing' ? 'Investigate potential causes for decline' :
        'Monitor for changes in pattern',
      ],
    };
  }

  private detectAnomalies(data: any): VisualizationInsight[] {
    const insights: VisualizationInsight[] = [];
    
    // Simple anomaly detection using standard deviation
    if (data.series && data.series[0] && Array.isArray(data.series[0].data)) {
      const values = data.series[0].data;
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
      );
      
      values.forEach((val, index) => {
        const zScore = Math.abs((val - mean) / stdDev);
        if (zScore > 2) {
          insights.push({
            id: generateUUID(),
            type: 'anomaly',
            title: 'Anomaly Detected',
            description: `Value at position ${index + 1} is ${zScore.toFixed(1)} standard deviations from mean`,
            confidence: Math.min(zScore / 3, 1),
            importance: zScore > 3 ? 'high' : 'medium',
            dataPoints: [{ index, value: val, zScore }],
          });
        }
      });
    }
    
    return insights;
  }

  private analyzeCorrelation(data: any): VisualizationInsight | null {
    // Simple correlation analysis for scatter plots
    if (!data.series || data.series.length === 0) return null;
    
    const points = data.series[0].data;
    if (!Array.isArray(points) || points.length < 5) return null;
    
    // Calculate Pearson correlation coefficient
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0);
    const sumY2 = points.reduce((sum, p) => sum + p.y * p.y, 0);
    
    const correlation = (n * sumXY - sumX * sumY) / 
      Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    if (Math.abs(correlation) > 0.5) {
      return {
        id: generateUUID(),
        type: 'correlation',
        title: `${correlation > 0 ? 'Positive' : 'Negative'} Correlation Found`,
        description: `Variables show a ${Math.abs(correlation) > 0.7 ? 'strong' : 'moderate'} ${correlation > 0 ? 'positive' : 'negative'} correlation (r=${correlation.toFixed(2)})`,
        confidence: Math.abs(correlation),
        importance: Math.abs(correlation) > 0.7 ? 'high' : 'medium',
        recommendations: [
          'Consider using this relationship for predictions',
          'Investigate causation vs correlation',
        ],
      };
    }
    
    return null;
  }

  private detectPatterns(data: any): VisualizationInsight[] {
    const insights: VisualizationInsight[] = [];
    
    // Detect repeating patterns
    if (data.series && data.series[0] && Array.isArray(data.series[0].data)) {
      const values = data.series[0].data;
      
      // Check for weekly patterns (7-day cycle)
      if (values.length >= 14) {
        const weeklyPattern = this.checkCyclicalPattern(values, 7);
        if (weeklyPattern) {
          insights.push({
            id: generateUUID(),
            type: 'pattern',
            title: 'Weekly Pattern Detected',
            description: 'Data shows a repeating weekly pattern',
            confidence: weeklyPattern.confidence,
            importance: 'medium',
            recommendations: ['Use weekly patterns for forecasting', 'Plan resources based on weekly cycles'],
          });
        }
      }
    }
    
    return insights;
  }

  private checkCyclicalPattern(values: number[], period: number): { confidence: number } | null {
    if (values.length < period * 2) return null;
    
    let matchCount = 0;
    let totalComparisons = 0;
    
    for (let i = period; i < values.length; i++) {
      const current = values[i];
      const previous = values[i - period];
      const tolerance = Math.abs(previous) * 0.2; // 20% tolerance
      
      if (Math.abs(current - previous) <= tolerance) {
        matchCount++;
      }
      totalComparisons++;
    }
    
    const confidence = matchCount / totalComparisons;
    return confidence > 0.6 ? { confidence } : null;
  }

  // Export chart
  exportChart(chartData: ChartData, format: 'png' | 'svg' | 'pdf' | 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(chartData, null, 2);
      default:
        // For image formats, would need to render to canvas first
        return `data:image/${format};base64,placeholder`;
    }
  }
}