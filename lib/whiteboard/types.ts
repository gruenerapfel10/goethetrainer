export interface Point {
  x: number;
  y: number;
}

export interface WhiteboardElement {
  id: string;
  type: 'pen' | 'line' | 'rectangle' | 'circle' | 'text' | 'image' | 'sticky' | 'arrow';
  points: Point[];
  style: {
    stroke: string;
    strokeWidth: number;
    fill?: string;
    opacity?: number;
    roughness?: number;
    strokeLineDash?: number[];
  };
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  locked?: boolean;
  visible?: boolean;
}

export interface WhiteboardState {
  elements: Map<string, WhiteboardElement>;
  selectedElementIds: Set<string>;
  viewBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    zoom: number;
  };
  tool: WhiteboardTool;
  style: ElementStyle;
  collaborators: Map<string, Collaborator>;
  version: number;
}

export interface WhiteboardTool {
  type: 'select' | 'pen' | 'line' | 'rectangle' | 'circle' | 'text' | 'eraser' | 'pan' | 'sticky' | 'arrow';
  mode?: 'draw' | 'edit';
}

export interface ElementStyle {
  stroke: string;
  strokeWidth: number;
  fill: string;
  opacity: number;
  roughness: number;
  strokeLineDash: number[];
}

export interface Collaborator {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  cursor?: Point;
  selectedElements?: string[];
  isActive: boolean;
  lastSeen: Date;
}

export interface WhiteboardOperation {
  type: 'add' | 'update' | 'delete' | 'select' | 'move' | 'resize';
  elementId: string;
  element?: WhiteboardElement;
  changes?: Partial<WhiteboardElement>;
  timestamp: Date;
  userId: string;
}

export interface WhiteboardSession {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  collaborators: string[];
  isPublic: boolean;
  thumbnail?: string;
  tags: string[];
}

export interface WhiteboardExport {
  format: 'png' | 'jpg' | 'svg' | 'pdf' | 'json';
  quality?: number;
  background?: boolean;
  bounds?: 'selection' | 'all' | 'visible';
  scale?: number;
}