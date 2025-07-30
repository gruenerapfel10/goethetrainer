'use client';

import React, { useState, useRef } from 'react';
import type { ChartConfig, } from '@/lib/ai/tools/chart';
import { Button } from '@/components/ui/button';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  ChartLegend, 
  ChartLegendContent 
} from '@/components/ui/chart';
import { Download, Maximize2, Minimize2, } from 'lucide-react';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBarChart,
  RadialBar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface ChartRendererProps {
  config: ChartConfig;
  className?: string;
  onExport?: (format: 'png' | 'svg') => void;
}

// Generate colors for pie charts
const generatePieColors = (dataLength: number): string[] => {
  const colors = [
    'hsl(221.2 83.2% 53.3%)', // Blue
    'hsl(142.1 76.2% 36.3%)', // Green
    'hsl(27.9 96% 61%)', // Orange
    'hsl(0 84.2% 60.2%)', // Red
    'hsl(270.7 91% 65.1%)', // Purple
    'hsl(193.4 95.9% 68.3%)', // Cyan
    'hsl(84.2 85.6% 56.5%)', // Lime
    'hsl(30.7 91% 69%)', // Amber
  ];
  return Array.from({ length: dataLength }, (_, i) => colors[i % colors.length]);
};

// Chart component renderers
const renderLineChart = (config: ChartConfig) => {
  const dataKeys = Object.keys(config.config);
  
  return (
    <ChartContainer config={config.config}>
      <LineChart data={config.data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey={Object.keys(config.data[0] || {})[0]} 
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis 
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {dataKeys.map((key) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={`var(--color-${key})`}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
};

const renderBarChart = (config: ChartConfig) => {
  const dataKeys = Object.keys(config.config);
  
  return (
    <ChartContainer config={config.config}>
      <BarChart data={config.data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey={Object.keys(config.data[0] || {})[0]} 
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis 
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {dataKeys.map((key) => (
          <Bar
            key={key}
            dataKey={key}
            fill={`var(--color-${key})`}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
};

const renderAreaChart = (config: ChartConfig) => {
  const dataKeys = Object.keys(config.config);
  
  return (
    <ChartContainer config={config.config}>
      <AreaChart data={config.data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey={Object.keys(config.data[0] || {})[0]} 
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis 
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {dataKeys.map((key, index) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={`var(--color-${key})`}
            fill={`var(--color-${key})`}
            fillOpacity={0.6}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
};

const renderPieChart = (config: ChartConfig) => {
  const colors = generatePieColors(config.data.length);
  
  return (
    <ChartContainer config={config.config}>
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent />} />
        <Pie
          data={config.data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={120}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {config.data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index]} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
};

const renderRadarChart = (config: ChartConfig) => {
  const dataKeys = Object.keys(config.config);
  
  return (
    <ChartContainer config={config.config}>
      <RadarChart data={config.data}>
        <PolarGrid />
        <PolarAngleAxis dataKey={Object.keys(config.data[0] || {})[0]} />
        <PolarRadiusAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {dataKeys.map((key) => (
          <Radar
            key={key}
            name={String(config.config[key]?.label || key)}
            dataKey={key}
            stroke={`var(--color-${key})`}
            fill={`var(--color-${key})`}
            fillOpacity={0.3}
            strokeWidth={2}
          />
        ))}
      </RadarChart>
    </ChartContainer>
  );
};

const renderRadialBarChart = (config: ChartConfig) => {
  return (
    <ChartContainer config={config.config}>
      <RadialBarChart data={config.data} innerRadius="20%" outerRadius="90%">
        <ChartTooltip content={<ChartTooltipContent />} />
        <RadialBar
          dataKey="value"
          cornerRadius={10}
          fill="var(--color-value)"
        />
      </RadialBarChart>
    </ChartContainer>
  );
};

const renderScatterChart = (config: ChartConfig) => {
  return (
    <ChartContainer config={config.config}>
      <ScatterChart data={config.data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          type="number" 
          dataKey="x" 
          name="X"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis 
          type="number" 
          dataKey="y" 
          name="Y"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Scatter 
          dataKey="y" 
          fill="var(--color-x)"
        />
      </ScatterChart>
    </ChartContainer>
  );
};

// Main chart renderer function
const renderChart = (config: ChartConfig) => {
  switch (config.type) {
    case 'line':
      return renderLineChart(config);
    case 'bar':
      return renderBarChart(config);
    case 'area':
      return renderAreaChart(config);
    case 'pie':
      return renderPieChart(config);
    case 'radar':
      return renderRadarChart(config);
    case 'radialBar':
      return renderRadialBarChart(config);
    case 'scatter':
      return renderScatterChart(config);
    default:
      return renderBarChart(config);
  }
};

const ChartRenderer: React.FC<ChartRendererProps> = ({ config, className, onExport }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = async (format: 'png' | 'svg') => {
    if (!chartRef.current) return;
    
    try {
      setIsExporting(true);
      
      if (format === 'png') {
        const canvas = await html2canvas(chartRef.current, {
          backgroundColor: '#ffffff',
          scale: 2, // Higher resolution
          useCORS: true,
          allowTaint: true,
        });
        
        const link = document.createElement('a');
        link.download = `chart-${config.type}-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
      
      onExport?.(format);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-7xl h-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">
                {config.title || `${config.type.charAt(0).toUpperCase() + config.type.slice(1)} Chart`}
              </h2>
              {config.subtitle && (
                <p className="text-muted-foreground mt-1">{config.subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('png')}
                disabled={isExporting}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Download PNG'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="flex items-center gap-2"
              >
                <Minimize2 className="h-4 w-4" />
                Exit Fullscreen
              </Button>
            </div>
          </div>
          
          {/* Chart */}
          <div ref={chartRef} className="flex-1 min-h-0">
            <div className="w-full h-full">
              {renderChart(config)}
            </div>
          </div>
          
          {/* Footer */}
          <div className="mt-4 flex justify-between items-center text-sm text-muted-foreground">
            <span>
              {config.data.length} data point{config.data.length !== 1 ? 's' : ''} • {' '}
              {Object.keys(config.config).length} series
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Header - clean and minimal */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {config.title || `${config.type.charAt(0).toUpperCase() + config.type.slice(1)} Chart`}
          </h3>
          {config.subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{config.subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleExport('png')}
            disabled={isExporting}
            className="h-8 w-8 p-0 opacity-60 hover:opacity-100 transition-opacity"
            title="Download as PNG"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="h-8 w-8 p-0 opacity-60 hover:opacity-100 transition-opacity"
            title="View fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Chart - seamlessly integrated */}
      <div ref={chartRef} className="w-full">
        <div 
          className="w-full"
          style={{
            height: `${config.height || 400}px`,
          }}
        >
          {renderChart(config)}
        </div>
      </div>
      
      {/* Footer - subtle metadata */}
      <div className="mt-3 flex justify-between items-center text-xs text-muted-foreground/70">
        <span>
          {config.data.length} data point{config.data.length !== 1 ? 's' : ''} • {' '}
          {Object.keys(config.config).length} series
        </span>
      </div>
    </div>
  );
};

export default ChartRenderer; 