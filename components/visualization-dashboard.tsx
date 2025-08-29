'use client';

import { useState, useEffect } from 'react';
import { BarChart3, PieChart, LineChart, Activity, TrendingUp, Download, Plus, Settings2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ChartBuilder } from '@/lib/visualization/chart-builder';
import type { 
  ChartData, 
  ChartType, 
  Dataset, 
  Dashboard,
  Widget,
  VisualizationInsight 
} from '@/lib/visualization/types';
import { generateUUID } from '@/lib/utils';

interface VisualizationDashboardProps {
  chatId?: string;
}

export function VisualizationDashboard({ chatId }: VisualizationDashboardProps) {
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [insights, setInsights] = useState<VisualizationInsight[]>([]);
  const [selectedChart, setSelectedChart] = useState<ChartData | null>(null);
  const [activeTab, setActiveTab] = useState<'charts' | 'insights' | 'data'>('charts');
  const [loading, setLoading] = useState(false);
  
  const chartBuilder = ChartBuilder.getInstance();

  const chartTypes: { value: ChartType; label: string; icon: any }[] = [
    { value: 'line', label: 'Line Chart', icon: LineChart },
    { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
    { value: 'pie', label: 'Pie Chart', icon: PieChart },
    { value: 'area', label: 'Area Chart', icon: Activity },
    { value: 'scatter', label: 'Scatter Plot', icon: Activity },
    { value: 'heatmap', label: 'Heatmap', icon: Activity },
  ];

  useEffect(() => {
    loadSampleData();
  }, []);

  const loadSampleData = () => {
    // Create sample datasets
    const sampleDatasets: Dataset[] = [
      {
        id: generateUUID(),
        name: 'Sales Data',
        description: 'Monthly sales performance',
        source: { type: 'csv', config: {} },
        fields: [
          { name: 'month', type: 'string' },
          { name: 'revenue', type: 'number' },
          { name: 'units', type: 'number' },
        ],
        records: 12,
        created: new Date(),
        updated: new Date(),
        tags: ['sales', 'revenue'],
      },
      {
        id: generateUUID(),
        name: 'User Analytics',
        description: 'User engagement metrics',
        source: { type: 'api', config: {}, refreshInterval: 60000 },
        fields: [
          { name: 'date', type: 'date' },
          { name: 'users', type: 'number' },
          { name: 'sessions', type: 'number' },
          { name: 'bounce_rate', type: 'number' },
        ],
        records: 30,
        created: new Date(),
        updated: new Date(),
        tags: ['analytics', 'users'],
      },
    ];
    
    setDatasets(sampleDatasets);
    
    // Create sample charts
    const sampleCharts = sampleDatasets.slice(0, 2).map((dataset, index) => {
      const type = index === 0 ? 'bar' : 'line';
      return chartBuilder.createChart(type as ChartType, dataset);
    });
    
    setCharts(sampleCharts);
    
    // Generate insights
    const allInsights = sampleCharts.flatMap(chart => 
      chartBuilder.generateInsights(chart)
    );
    setInsights(allInsights);
  };

  const createNewChart = (type: ChartType) => {
    if (datasets.length === 0) {
      toast.error('No datasets available');
      return;
    }

    setLoading(true);
    try {
      const dataset = datasets[0]; // Use first dataset for demo
      const newChart = chartBuilder.createChart(type, dataset);
      setCharts([...charts, newChart]);
      
      // Generate insights for new chart
      const newInsights = chartBuilder.generateInsights(newChart);
      setInsights([...insights, ...newInsights]);
      
      toast.success(`${type} chart created successfully!`);
    } catch (error) {
      toast.error('Failed to create chart');
    } finally {
      setLoading(false);
    }
  };

  const exportChart = (chart: ChartData, format: 'png' | 'svg' | 'json') => {
    try {
      const exportData = chartBuilder.exportChart(chart, format);
      
      if (format === 'json') {
        const blob = new Blob([exportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${chart.title.toLowerCase().replace(/\s+/g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // For image formats, would implement canvas rendering
        toast.info('Image export coming soon!');
      }
      
      toast.success('Chart exported successfully!');
    } catch (error) {
      toast.error('Failed to export chart');
    }
  };

  const renderChart = (chart: ChartData) => {
    // Simplified chart rendering - in real app would use D3.js or similar
    const { type, data, config } = chart;
    
    switch (type) {
      case 'bar':
        return (
          <div className="h-full flex items-end justify-around p-4">
            {data.series?.[0]?.data?.slice(0, 10).map((value: number, index: number) => (
              <div
                key={index}
                className="bg-primary transition-all duration-300 hover:opacity-80"
                style={{
                  width: '8%',
                  height: `${(value / 100) * 100}%`,
                }}
                title={`Value: ${value.toFixed(1)}`}
              />
            ))}
          </div>
        );
      
      case 'pie':
        return (
          <div className="h-full flex items-center justify-center p-4">
            <div className="relative w-48 h-48">
              {/* Simplified pie chart */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-secondary" />
              <div className="absolute inset-4 rounded-full bg-background" />
            </div>
          </div>
        );
      
      case 'line':
        return (
          <div className="h-full p-4">
            <svg className="w-full h-full">
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-primary"
                points={data.series?.[0]?.data?.slice(0, 20).map((value: number, index: number) => 
                  `${(index / 20) * 100}%,${100 - (value / 100) * 100}%`
                ).join(' ')}
              />
            </svg>
          </div>
        );
      
      default:
        return (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <p>Chart preview for {type}</p>
          </div>
        );
    }
  };

  const getInsightIcon = (type: VisualizationInsight['type']) => {
    switch (type) {
      case 'trend':
        return <TrendingUp className="h-4 w-4" />;
      case 'anomaly':
        return <Activity className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getImportanceColor = (importance: VisualizationInsight['importance']) => {
    switch (importance) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Data Visualization Dashboard
          </CardTitle>
          <CardDescription>
            Create and analyze interactive charts with AI-powered insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="charts">
                Charts ({charts.length})
              </TabsTrigger>
              <TabsTrigger value="insights">
                Insights ({insights.length})
              </TabsTrigger>
              <TabsTrigger value="data">
                Data ({datasets.length})
              </TabsTrigger>
            </TabsList>

            {/* Charts Tab */}
            <TabsContent value="charts" className="space-y-4">
              {/* Chart Type Selector */}
              <div className="flex items-center gap-4">
                <Select onValueChange={(value) => createNewChart(value as ChartType)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Create new chart" />
                  </SelectTrigger>
                  <SelectContent>
                    {chartTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {charts.map((chart) => (
                  <Card 
                    key={chart.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedChart(chart)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{chart.title}</CardTitle>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              exportChart(chart, 'json');
                            }}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                          >
                            <Maximize2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription>{chart.type}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48 bg-muted rounded">
                        {renderChart(chart)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {charts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No charts created yet</p>
                  <p className="text-sm mt-2">Select a chart type above to get started</p>
                </div>
              )}
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights" className="space-y-4">
              {insights.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No insights available yet</p>
                  <p className="text-sm mt-2">Create charts to generate insights</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {insights.map((insight) => (
                    <Card key={insight.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getInsightIcon(insight.type)}
                            <CardTitle className="text-sm">{insight.title}</CardTitle>
                          </div>
                          <Badge variant={getImportanceColor(insight.importance)}>
                            {insight.importance}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          {insight.description}
                        </p>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Confidence:</span>
                          <Progress value={insight.confidence * 100} className="h-2 flex-1" />
                          <span className="text-xs font-medium">
                            {(insight.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        
                        {insight.recommendations && insight.recommendations.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium">Recommendations:</p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {insight.recommendations.map((rec, idx) => (
                                <li key={idx} className="flex items-start gap-1">
                                  <span>•</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Data Tab */}
            <TabsContent value="data" className="space-y-4">
              <div className="space-y-4">
                {datasets.map((dataset) => (
                  <Card key={dataset.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm">{dataset.name}</CardTitle>
                          <CardDescription>{dataset.description}</CardDescription>
                        </div>
                        <Badge variant="outline">{dataset.source.type}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Records:</span>
                          <span className="font-medium">{dataset.records}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Fields:</span>
                          <span className="font-medium">{dataset.fields.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Updated:</span>
                          <span className="font-medium">
                            {new Date(dataset.updated).toLocaleDateString()}
                          </span>
                        </div>
                        {dataset.tags && dataset.tags.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            {dataset.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Selected Chart Modal */}
      {selectedChart && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{selectedChart.title}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedChart(null)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-96 bg-muted rounded">
              {renderChart(selectedChart)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}