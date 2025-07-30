import { 
  WhiteboardElement, 
  WhiteboardState, 
  WhiteboardTool, 
  ElementStyle, 
  Collaborator,
  WhiteboardOperation,
  Point 
} from './types';
import { generateUUID } from '@/lib/utils';

export class WhiteboardEngine {
  private static instance: WhiteboardEngine;
  private canvasRef: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private state: WhiteboardState;
  private listeners: Set<(state: WhiteboardState) => void> = new Set();
  private isDrawing = false;
  private currentPath: Point[] = [];
  private currentElement: WhiteboardElement | null = null;
  private dragStartPoint: Point | null = null;
  private selectedElementsBounds: DOMRect | null = null;

  private constructor() {
    this.state = {
      elements: new Map(),
      selectedElementIds: new Set(),
      viewBox: {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        zoom: 1,
      },
      tool: { type: 'pen' },
      style: {
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'transparent',
        opacity: 1,
        roughness: 0,
        strokeLineDash: [],
      },
      collaborators: new Map(),
      version: 0,
    };

    this.loadState();
  }

  static getInstance(): WhiteboardEngine {
    if (!WhiteboardEngine.instance) {
      WhiteboardEngine.instance = new WhiteboardEngine();
    }
    return WhiteboardEngine.instance;
  }

  private loadState() {
    const stored = localStorage.getItem('whiteboard-state');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        
        // Convert serialized Maps and Sets back to proper objects
        if (parsed.elements) {
          this.state.elements = new Map(
            Object.entries(parsed.elements).map(([id, element]: [string, any]) => [
              id,
              {
                ...element,
                createdAt: new Date(element.createdAt),
                updatedAt: new Date(element.updatedAt),
              }
            ])
          );
        }
        
        if (parsed.selectedElementIds) {
          this.state.selectedElementIds = new Set(parsed.selectedElementIds);
        }
        
        if (parsed.collaborators) {
          this.state.collaborators = new Map(
            Object.entries(parsed.collaborators).map(([id, collab]: [string, any]) => [
              id,
              {
                ...collab,
                lastSeen: new Date(collab.lastSeen),
              }
            ])
          );
        }

        // Merge other properties
        this.state = {
          ...this.state,
          ...parsed,
          elements: this.state.elements,
          selectedElementIds: this.state.selectedElementIds,
          collaborators: this.state.collaborators,
        };
      } catch (error) {
        console.error('Failed to load whiteboard state:', error);
      }
    }
  }

  private saveState() {
    try {
      const stateToSave = {
        ...this.state,
        elements: Object.fromEntries(this.state.elements),
        selectedElementIds: Array.from(this.state.selectedElementIds),
        collaborators: Object.fromEntries(this.state.collaborators),
      };
      
      localStorage.setItem('whiteboard-state', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Failed to save whiteboard state:', error);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  private incrementVersion() {
    this.state.version++;
    this.saveState();
    this.notifyListeners();
  }

  // Canvas management
  setCanvas(canvas: HTMLCanvasElement) {
    this.canvasRef = canvas;
    this.ctx = canvas.getContext('2d');
    this.setupEventListeners();
    this.render();
  }

  private setupEventListeners() {
    if (!this.canvasRef) return;

    // Mouse events
    this.canvasRef.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvasRef.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvasRef.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvasRef.addEventListener('wheel', this.handleWheel.bind(this));

    // Touch events for mobile
    this.canvasRef.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvasRef.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvasRef.addEventListener('touchend', this.handleTouchEnd.bind(this));

    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private getPointerPosition(event: MouseEvent | TouchEvent): Point {
    if (!this.canvasRef) return { x: 0, y: 0 };

    const rect = this.canvasRef.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0]?.clientX || 0 : event.clientX;
    const clientY = 'touches' in event ? event.touches[0]?.clientY || 0 : event.clientY;

    return {
      x: (clientX - rect.left) / this.state.viewBox.zoom - this.state.viewBox.x,
      y: (clientY - rect.top) / this.state.viewBox.zoom - this.state.viewBox.y,
    };
  }

  private handleMouseDown(event: MouseEvent) {
    const point = this.getPointerPosition(event);
    this.startDrawing(point);
  }

  private handleMouseMove(event: MouseEvent) {
    const point = this.getPointerPosition(event);
    this.continueDrawing(point);
  }

  private handleMouseUp(event: MouseEvent) {
    this.stopDrawing();
  }

  private handleTouchStart(event: TouchEvent) {
    event.preventDefault();
    const point = this.getPointerPosition(event);
    this.startDrawing(point);
  }

  private handleTouchMove(event: TouchEvent) {
    event.preventDefault();
    const point = this.getPointerPosition(event);
    this.continueDrawing(point);
  }

  private handleTouchEnd(event: TouchEvent) {
    event.preventDefault();
    this.stopDrawing();
  }

  private handleWheel(event: WheelEvent) {
    event.preventDefault();
    
    const rect = this.canvasRef!.getBoundingClientRect();
    const centerX = (event.clientX - rect.left) / this.state.viewBox.zoom - this.state.viewBox.x;
    const centerY = (event.clientY - rect.top) / this.state.viewBox.zoom - this.state.viewBox.y;
    
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, this.state.viewBox.zoom * zoomFactor));
    
    this.state.viewBox.zoom = newZoom;
    this.state.viewBox.x = centerX - (event.clientX - rect.left) / newZoom;
    this.state.viewBox.y = centerY - (event.clientY - rect.top) / newZoom;
    
    this.render();
    this.notifyListeners();
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      this.deleteSelectedElements();
    } else if (event.key === 'Escape') {
      this.clearSelection();
    } else if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'a':
          event.preventDefault();
          this.selectAll();
          break;
        case 'z':
          event.preventDefault();
          if (event.shiftKey) {
            this.redo();
          } else {
            this.undo();
          }
          break;
        case 'c':
          event.preventDefault();
          this.copySelected();
          break;
        case 'v':
          event.preventDefault();
          this.paste();
          break;
      }
    }
  }

  private startDrawing(point: Point) {
    if (this.state.tool.type === 'select') {
      this.handleSelectStart(point);
    } else if (this.state.tool.type === 'pan') {
      this.dragStartPoint = point;
    } else {
      this.startDrawingElement(point);
    }
  }

  private continueDrawing(point: Point) {
    if (this.state.tool.type === 'pan' && this.dragStartPoint) {
      const dx = point.x - this.dragStartPoint.x;
      const dy = point.y - this.dragStartPoint.y;
      this.state.viewBox.x -= dx;
      this.state.viewBox.y -= dy;
      this.render();
    } else if (this.isDrawing && this.currentElement) {
      this.updateCurrentElement(point);
    }
  }

  private stopDrawing() {
    if (this.isDrawing && this.currentElement) {
      this.finishDrawingElement();
    }
    
    this.isDrawing = false;
    this.currentPath = [];
    this.currentElement = null;
    this.dragStartPoint = null;
  }

  private startDrawingElement(point: Point) {
    this.isDrawing = true;
    this.currentPath = [point];
    
    const id = generateUUID();
    this.currentElement = {
      id,
      type: this.state.tool.type as any,
      points: [point],
      style: { ...this.state.style },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'current-user', // Should be dynamic
    };

    if (this.state.tool.type === 'text') {
      this.currentElement.text = '';
      this.currentElement.fontSize = 16;
      this.currentElement.fontFamily = 'Arial, sans-serif';
    }
  }

  private updateCurrentElement(point: Point) {
    if (!this.currentElement) return;

    if (this.state.tool.type === 'pen') {
      this.currentPath.push(point);
      this.currentElement.points = [...this.currentPath];
    } else if (['line', 'rectangle', 'circle', 'arrow'].includes(this.state.tool.type)) {
      this.currentElement.points = [this.currentPath[0], point];
    }

    this.render();
  }

  private finishDrawingElement() {
    if (!this.currentElement) return;

    // Calculate bounds
    this.currentElement.bounds = this.calculateElementBounds(this.currentElement);
    
    // Add to elements
    this.state.elements.set(this.currentElement.id, this.currentElement);
    
    this.incrementVersion();
    this.render();
  }

  private calculateElementBounds(element: WhiteboardElement): { x: number; y: number; width: number; height: number } {
    if (element.points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const xs = element.points.map(p => p.x);
    const ys = element.points.map(p => p.y);
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private handleSelectStart(point: Point) {
    const hitElement = this.getElementAtPoint(point);
    
    if (hitElement) {
      if (!this.state.selectedElementIds.has(hitElement.id)) {
        this.state.selectedElementIds.clear();
        this.state.selectedElementIds.add(hitElement.id);
      }
    } else {
      this.state.selectedElementIds.clear();
    }
    
    this.notifyListeners();
    this.render();
  }

  private getElementAtPoint(point: Point): WhiteboardElement | null {
    // Iterate through elements in reverse order (top to bottom)
    const elements = Array.from(this.state.elements.values()).reverse();
    
    for (const element of elements) {
      if (element.bounds && this.pointInBounds(point, element.bounds)) {
        return element;
      }
    }
    
    return null;
  }

  private pointInBounds(point: Point, bounds: { x: number; y: number; width: number; height: number }): boolean {
    return point.x >= bounds.x && 
           point.x <= bounds.x + bounds.width &&
           point.y >= bounds.y && 
           point.y <= bounds.y + bounds.height;
  }

  // Rendering
  private render() {
    if (!this.ctx || !this.canvasRef) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvasRef.width, this.canvasRef.height);
    
    // Save context
    this.ctx.save();
    
    // Apply transform
    this.ctx.scale(this.state.viewBox.zoom, this.state.viewBox.zoom);
    this.ctx.translate(-this.state.viewBox.x, -this.state.viewBox.y);
    
    // Render background grid
    this.renderGrid();
    
    // Render all elements
    for (const element of this.state.elements.values()) {
      if (element.visible !== false) {
        this.renderElement(element);
      }
    }
    
    // Render current drawing element
    if (this.currentElement) {
      this.renderElement(this.currentElement);
    }
    
    // Render selection
    this.renderSelection();
    
    // Restore context
    this.ctx.restore();
  }

  private renderGrid() {
    if (!this.ctx) return;

    const gridSize = 20;
    const { x, y, width, height } = this.state.viewBox;
    
    this.ctx.strokeStyle = '#f0f0f0';
    this.ctx.lineWidth = 1 / this.state.viewBox.zoom;
    
    // Vertical lines
    const startX = Math.floor(x / gridSize) * gridSize;
    for (let i = startX; i < x + width; i += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, y);
      this.ctx.lineTo(i, y + height);
      this.ctx.stroke();
    }
    
    // Horizontal lines
    const startY = Math.floor(y / gridSize) * gridSize;
    for (let i = startY; i < y + height; i += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, i);
      this.ctx.lineTo(x + width, i);
      this.ctx.stroke();
    }
  }

  private renderElement(element: WhiteboardElement) {
    if (!this.ctx) return;

    this.ctx.save();
    
    // Apply element style
    this.ctx.strokeStyle = element.style.stroke;
    this.ctx.lineWidth = element.style.strokeWidth;
    this.ctx.fillStyle = element.style.fill || 'transparent';
    this.ctx.globalAlpha = element.style.opacity || 1;
    
    if (element.style.strokeLineDash && element.style.strokeLineDash.length > 0) {
      this.ctx.setLineDash(element.style.strokeLineDash);
    }

    switch (element.type) {
      case 'pen':
        this.renderPenElement(element);
        break;
      case 'line':
        this.renderLineElement(element);
        break;
      case 'rectangle':
        this.renderRectangleElement(element);
        break;
      case 'circle':
        this.renderCircleElement(element);
        break;
      case 'text':
        this.renderTextElement(element);
        break;
      case 'arrow':
        this.renderArrowElement(element);
        break;
      case 'sticky':
        this.renderStickyElement(element);
        break;
    }
    
    this.ctx.restore();
  }

  private renderPenElement(element: WhiteboardElement) {
    if (!this.ctx || element.points.length < 2) return;

    this.ctx.beginPath();
    this.ctx.moveTo(element.points[0].x, element.points[0].y);
    
    for (let i = 1; i < element.points.length; i++) {
      this.ctx.lineTo(element.points[i].x, element.points[i].y);
    }
    
    this.ctx.stroke();
  }

  private renderLineElement(element: WhiteboardElement) {
    if (!this.ctx || element.points.length < 2) return;

    this.ctx.beginPath();
    this.ctx.moveTo(element.points[0].x, element.points[0].y);
    this.ctx.lineTo(element.points[1].x, element.points[1].y);
    this.ctx.stroke();
  }

  private renderRectangleElement(element: WhiteboardElement) {
    if (!this.ctx || element.points.length < 2) return;

    const [start, end] = element.points;
    const width = end.x - start.x;
    const height = end.y - start.y;
    
    if (element.style.fill && element.style.fill !== 'transparent') {
      this.ctx.fillRect(start.x, start.y, width, height);
    }
    
    this.ctx.strokeRect(start.x, start.y, width, height);
  }

  private renderCircleElement(element: WhiteboardElement) {
    if (!this.ctx || element.points.length < 2) return;

    const [start, end] = element.points;
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)) / 2;
    
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    
    if (element.style.fill && element.style.fill !== 'transparent') {
      this.ctx.fill();
    }
    
    this.ctx.stroke();
  }

  private renderTextElement(element: WhiteboardElement) {
    if (!this.ctx || !element.text || element.points.length === 0) return;

    const point = element.points[0];
    this.ctx.font = `${element.fontSize || 16}px ${element.fontFamily || 'Arial, sans-serif'}`;
    this.ctx.fillStyle = element.style.stroke;
    this.ctx.fillText(element.text, point.x, point.y);
  }

  private renderArrowElement(element: WhiteboardElement) {
    if (!this.ctx || element.points.length < 2) return;

    const [start, end] = element.points;
    
    // Draw line
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();
    
    // Draw arrowhead
    const headLength = 10;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    
    this.ctx.beginPath();
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - headLength * Math.cos(angle - Math.PI / 6),
      end.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - headLength * Math.cos(angle + Math.PI / 6),
      end.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
  }

  private renderStickyElement(element: WhiteboardElement) {
    if (!this.ctx || element.points.length === 0) return;

    const point = element.points[0];
    const width = 150;
    const height = 100;
    
    // Draw sticky note background
    this.ctx.fillStyle = '#fef68a';
    this.ctx.fillRect(point.x, point.y, width, height);
    
    // Draw border
    this.ctx.strokeStyle = '#facc15';
    this.ctx.strokeRect(point.x, point.y, width, height);
    
    // Draw text
    if (element.text) {
      this.ctx.fillStyle = '#374151';
      this.ctx.font = '14px Arial, sans-serif';
      this.ctx.fillText(element.text, point.x + 10, point.y + 25);
    }
  }

  private renderSelection() {
    if (!this.ctx || this.state.selectedElementIds.size === 0) return;

    this.ctx.strokeStyle = '#3b82f6';
    this.ctx.lineWidth = 2 / this.state.viewBox.zoom;
    this.ctx.setLineDash([5, 5]);
    
    for (const elementId of this.state.selectedElementIds) {
      const element = this.state.elements.get(elementId);
      if (element && element.bounds) {
        this.ctx.strokeRect(
          element.bounds.x - 5,
          element.bounds.y - 5,
          element.bounds.width + 10,
          element.bounds.height + 10
        );
      }
    }
    
    this.ctx.setLineDash([]);
  }

  // Public API
  setTool(tool: WhiteboardTool) {
    this.state.tool = tool;
    this.notifyListeners();
  }

  setStyle(style: Partial<ElementStyle>) {
    this.state.style = { ...this.state.style, ...style };
    this.notifyListeners();
  }

  addElement(element: Omit<WhiteboardElement, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): string {
    const id = generateUUID();
    const newElement: WhiteboardElement = {
      ...element,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'current-user',
      bounds: this.calculateElementBounds(element as WhiteboardElement),
    };

    this.state.elements.set(id, newElement);
    this.incrementVersion();
    this.render();
    return id;
  }

  updateElement(id: string, changes: Partial<WhiteboardElement>) {
    const element = this.state.elements.get(id);
    if (!element) return;

    const updated = {
      ...element,
      ...changes,
      updatedAt: new Date(),
    };

    if (changes.points) {
      updated.bounds = this.calculateElementBounds(updated);
    }

    this.state.elements.set(id, updated);
    this.incrementVersion();
    this.render();
  }

  deleteElement(id: string) {
    this.state.elements.delete(id);
    this.state.selectedElementIds.delete(id);
    this.incrementVersion();
    this.render();
  }

  deleteSelectedElements() {
    for (const id of this.state.selectedElementIds) {
      this.state.elements.delete(id);
    }
    this.state.selectedElementIds.clear();
    this.incrementVersion();
    this.render();
  }

  selectAll() {
    this.state.selectedElementIds = new Set(this.state.elements.keys());
    this.notifyListeners();
    this.render();
  }

  clearSelection() {
    this.state.selectedElementIds.clear();
    this.notifyListeners();
    this.render();
  }

  clear() {
    this.state.elements.clear();
    this.state.selectedElementIds.clear();
    this.incrementVersion();
    this.render();
  }

  zoomIn() {
    this.state.viewBox.zoom = Math.min(5, this.state.viewBox.zoom * 1.2);
    this.render();
    this.notifyListeners();
  }

  zoomOut() {
    this.state.viewBox.zoom = Math.max(0.1, this.state.viewBox.zoom / 1.2);
    this.render();
    this.notifyListeners();
  }

  resetZoom() {
    this.state.viewBox.zoom = 1;
    this.state.viewBox.x = 0;
    this.state.viewBox.y = 0;
    this.render();
    this.notifyListeners();
  }

  fitToContent() {
    if (this.state.elements.size === 0) return;

    const elements = Array.from(this.state.elements.values());
    const bounds = elements.reduce((acc, element) => {
      if (!element.bounds) return acc;
      
      return {
        minX: Math.min(acc.minX, element.bounds.x),
        minY: Math.min(acc.minY, element.bounds.y),
        maxX: Math.max(acc.maxX, element.bounds.x + element.bounds.width),
        maxY: Math.max(acc.maxY, element.bounds.y + element.bounds.height),
      };
    }, {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    });

    if (this.canvasRef) {
      const padding = 50;
      const contentWidth = bounds.maxX - bounds.minX + padding * 2;
      const contentHeight = bounds.maxY - bounds.minY + padding * 2;
      
      const scaleX = this.canvasRef.width / contentWidth;
      const scaleY = this.canvasRef.height / contentHeight;
      const scale = Math.min(scaleX, scaleY, 1);
      
      this.state.viewBox.zoom = scale;
      this.state.viewBox.x = bounds.minX - padding;
      this.state.viewBox.y = bounds.minY - padding;
      
      this.render();
      this.notifyListeners();
    }
  }

  exportAsImage(format: 'png' | 'jpg' = 'png'): string {
    if (!this.canvasRef) return '';
    
    return this.canvasRef.toDataURL(`image/${format}`, 0.9);
  }

  exportAsJSON(): string {
    const exportData = {
      elements: Array.from(this.state.elements.values()),
      viewBox: this.state.viewBox,
      version: this.state.version,
      exportedAt: new Date().toISOString(),
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  importFromJSON(jsonData: string) {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.elements && Array.isArray(data.elements)) {
        this.state.elements.clear();
        
        data.elements.forEach((element: any) => {
          this.state.elements.set(element.id, {
            ...element,
            createdAt: new Date(element.createdAt),
            updatedAt: new Date(element.updatedAt),
          });
        });
        
        if (data.viewBox) {
          this.state.viewBox = data.viewBox;
        }
        
        this.incrementVersion();
        this.render();
      }
    } catch (error) {
      console.error('Failed to import JSON:', error);
    }
  }

  // Undo/Redo functionality would require implementing a command pattern
  undo() {
    // Implementation would require storing command history
    console.log('Undo functionality not implemented yet');
  }

  redo() {
    // Implementation would require storing command history
    console.log('Redo functionality not implemented yet');
  }

  copySelected() {
    // Implementation would store selected elements in clipboard
    console.log('Copy functionality not implemented yet');
  }

  paste() {
    // Implementation would paste elements from clipboard
    console.log('Paste functionality not implemented yet');
  }

  getState(): WhiteboardState {
    return { ...this.state };
  }

  subscribe(listener: (state: WhiteboardState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}