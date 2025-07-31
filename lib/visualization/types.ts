export interface ChartData {
  id: string;
  type: ChartType;
  title: string;
  description?: string;
  data: any;
  config: ChartConfig;
  created: Date;
  updated: Date;
}

export type ChartType = 
  | 'line'
  | 'bar'
  | 'pie'
  | 'donut'
  | 'area'
  | 'scatter'
  | 'bubble'
  | 'heatmap'
  | 'treemap'
  | 'sankey'
  | 'network'
  | 'gauge'
  | 'radar'
  | 'parallel'
  | 'funnel'
  | 'waterfall'
  | 'candlestick'
  | 'boxplot'
  | 'violin'
  | 'sunburst';

export interface ChartConfig {
  dimensions: {
    width: number;
    height: number;
    margin?: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
  colors?: string[];
  theme?: 'light' | 'dark' | 'auto';
  animations?: boolean;
  interactive?: boolean;
  legend?: {
    show: boolean;
    position: 'top' | 'bottom' | 'left' | 'right';
  };
  tooltip?: {
    show: boolean;
    format?: (value: any) => string;
  };
  axes?: {
    x?: AxisConfig;
    y?: AxisConfig;
  };
  responsive?: boolean;
}

export interface AxisConfig {
  label?: string;
  show?: boolean;
  type?: 'linear' | 'log' | 'time' | 'category';
  min?: number;
  max?: number;
  ticks?: number;
  format?: (value: any) => string;
  grid?: boolean;
}

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  source: DataSource;
  fields: DataField[];
  records: number;
  created: Date;
  updated: Date;
  tags?: string[];
}

export interface DataSource {
  type: 'csv' | 'json' | 'api' | 'database' | 'realtime';
  config: Record<string, any>;
  refreshInterval?: number; // milliseconds
}

export interface DataField {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  nullable?: boolean;
  unique?: boolean;
  statistics?: FieldStatistics;
}

export interface FieldStatistics {
  count: number;
  unique: number;
  missing: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  quartiles?: [number, number, number];
  distribution?: { value: any; count: number }[];
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout: DashboardLayout;
  widgets: Widget[];
  filters: Filter[];
  theme?: 'light' | 'dark' | 'auto';
  refreshInterval?: number;
  created: Date;
  updated: Date;
  shared?: boolean;
  tags?: string[];
}

export interface DashboardLayout {
  type: 'grid' | 'freeform' | 'responsive';
  columns?: number;
  rows?: number;
  gap?: number;
}

export interface Widget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'text' | 'image' | 'filter';
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: WidgetConfig;
  dataSource?: string; // Dataset ID
  chartId?: string; // Chart ID
}

export interface WidgetConfig {
  title?: string;
  description?: string;
  refresh?: boolean;
  interactive?: boolean;
  exportable?: boolean;
  customStyles?: Record<string, any>;
}

export interface Filter {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'between' | 'in';
  value: any;
  active: boolean;
}

export interface VisualizationInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'correlation' | 'pattern' | 'forecast';
  title: string;
  description: string;
  confidence: number; // 0-1
  importance: 'low' | 'medium' | 'high';
  chartId?: string;
  dataPoints?: any[];
  recommendations?: string[];
}

export interface ExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'csv' | 'json';
  quality?: number; // 0-1 for image formats
  includeData?: boolean;
  includeConfig?: boolean;
}

export interface RealtimeUpdate {
  widgetId: string;
  timestamp: Date;
  data: any;
  operation: 'append' | 'update' | 'replace';
}