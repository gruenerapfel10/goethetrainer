'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Pen, 
  Square, 
  Circle, 
  Type, 
  Eraser, 
  Move, 
  MousePointer,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  Users,
  StickyNote,
  ArrowRight,
  Palette,
  Settings,
  Maximize,
  Hand
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { WhiteboardEngine } from '@/lib/whiteboard/whiteboard-engine';
import type { WhiteboardState, WhiteboardTool, ElementStyle } from '@/lib/whiteboard/types';
import { cn } from '@/lib/utils';

const COLORS = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ff8000', '#8000ff',
  '#ff0080', '#80ff00', '#0080ff', '#ff8080', '#80ff80',
  '#8080ff', '#ffff80', '#ff80ff', '#80ffff', '#c0c0c0'
];

const STROKE_WIDTHS = [1, 2, 4, 8, 12, 16];

export function CollaborativeWhiteboard() {
  const [isOpen, setIsOpen] = useState(false);
  const [whiteboardState, setWhiteboardState] = useState<WhiteboardState | null>(null);
  const [collaborators, setCollaborators] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const whiteboardEngine = WhiteboardEngine.getInstance();

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      // Set up canvas
      const canvas = canvasRef.current;
      const container = containerRef.current;
      
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
      
      whiteboardEngine.setCanvas(canvas);
      
      // Subscribe to state changes
      const unsubscribe = whiteboardEngine.subscribe((state) => {
        setWhiteboardState(state);
      });

      // Initial state
      setWhiteboardState(whiteboardEngine.getState());
      
      return unsubscribe;
    }
  }, [isOpen]);

  const handleToolChange = (tool: WhiteboardTool) => {
    whiteboardEngine.setTool(tool);
  };

  const handleStyleChange = (style: Partial<ElementStyle>) => {
    whiteboardEngine.setStyle(style);
  };

  const handleClear = () => {
    whiteboardEngine.clear();
  };

  const handleExport = () => {
    const imageData = whiteboardEngine.exportAsImage('png');
    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = imageData;
    link.click();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        whiteboardEngine.importFromJSON(content);
      };
      reader.readAsText(file);
    }
  };

  const tools = [
    { type: 'select', icon: MousePointer, label: 'Select' },
    { type: 'pen', icon: Pen, label: 'Pen' },
    { type: 'line', icon: ArrowRight, label: 'Line' },
    { type: 'rectangle', icon: Square, label: 'Rectangle' },
    { type: 'circle', icon: Circle, label: 'Circle' },
    { type: 'arrow', icon: ArrowRight, label: 'Arrow' },
    { type: 'text', icon: Type, label: 'Text' },
    { type: 'sticky', icon: StickyNote, label: 'Sticky Note' },
    { type: 'eraser', icon: Eraser, label: 'Eraser' },
    { type: 'pan', icon: Hand, label: 'Pan' },
  ];

  if (!whiteboardState) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Square className="h-4 w-4" />
          Whiteboard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
        <div className="flex flex-col h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-4">
              <DialogTitle className="flex items-center gap-2">
                <Square className="h-5 w-5" />
                Collaborative Whiteboard
              </DialogTitle>
              
              {/* Collaborators */}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Badge variant="secondary">{collaborators + 1} active</Badge>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => whiteboardEngine.zoomOut()}
                className="h-8 w-8"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                {Math.round(whiteboardState.viewBox.zoom * 100)}%
              </span>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => whiteboardEngine.zoomIn()}
                className="h-8 w-8"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>

              <Separator orientation="vertical" className="h-6 mx-2" />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => whiteboardEngine.resetZoom()}
                className="h-8 w-8"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => whiteboardEngine.fitToContent()}
                className="h-8 w-8"
              >
                <Maximize className="h-4 w-4" />
              </Button>

              <Separator orientation="vertical" className="h-6 mx-2" />

              <Button
                variant="ghost"
                size="icon"
                onClick={handleExport}
                className="h-8 w-8"
              >
                <Download className="h-4 w-4" />
              </Button>

              <label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  asChild
                >
                  <span>
                    <Upload className="h-4 w-4" />
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="h-8 w-8 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Toolbar */}
            <div className="w-16 border-r bg-muted/50 flex flex-col items-center py-4 gap-2">
              {tools.map((tool) => {
                const Icon = tool.icon;
                const isActive = whiteboardState.tool.type === tool.type;
                
                return (
                  <Button
                    key={tool.type}
                    variant={isActive ? "default" : "ghost"}
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => handleToolChange({ type: tool.type as any })}
                    title={tool.label}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                );
              })}

              <Separator className="my-2" />

              {/* Color Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                  >
                    <div 
                      className="w-6 h-6 rounded border-2 border-white shadow-sm"
                      style={{ backgroundColor: whiteboardState.style.stroke }}
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" side="right">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Colors</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {COLORS.map((color) => (
                        <button
                          key={color}
                          className={cn(
                            "w-8 h-8 rounded border-2 transition-all",
                            whiteboardState.style.stroke === color 
                              ? "border-primary scale-110" 
                              : "border-gray-300 hover:scale-105"
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => handleStyleChange({ stroke: color })}
                        />
                      ))}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="custom-color">Custom Color</Label>
                      <Input
                        id="custom-color"
                        type="color"
                        value={whiteboardState.style.stroke}
                        onChange={(e) => handleStyleChange({ stroke: e.target.value })}
                        className="h-8 w-full"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Stroke Width */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                  >
                    <div 
                      className="bg-current rounded-full"
                      style={{ 
                        width: Math.min(whiteboardState.style.strokeWidth * 2, 16),
                        height: Math.min(whiteboardState.style.strokeWidth * 2, 16)
                      }}
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48" side="right">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Stroke Width</h4>
                    <div className="space-y-3">
                      {STROKE_WIDTHS.map((width) => (
                        <button
                          key={width}
                          className={cn(
                            "w-full h-8 flex items-center justify-center rounded hover:bg-muted",
                            whiteboardState.style.strokeWidth === width && "bg-muted"
                          )}
                          onClick={() => handleStyleChange({ strokeWidth: width })}
                        >
                          <div 
                            className="bg-current rounded-full"
                            style={{ width, height: width }}
                          />
                        </button>
                      ))}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Custom Width: {whiteboardState.style.strokeWidth}px</Label>
                      <Slider
                        value={[whiteboardState.style.strokeWidth]}
                        onValueChange={([value]) => handleStyleChange({ strokeWidth: value })}
                        min={1}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Canvas Area */}
            <div 
              ref={containerRef}
              className="flex-1 relative overflow-hidden bg-white"
            >
              <canvas
                ref={canvasRef}
                className="absolute inset-0 cursor-crosshair"
                style={{
                  cursor: whiteboardState.tool.type === 'pan' ? 'grab' : 
                         whiteboardState.tool.type === 'select' ? 'default' : 'crosshair'
                }}
              />
              
              {/* Status Bar */}
              <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Elements: {whiteboardState.elements.size}</span>
                  <span>Selected: {whiteboardState.selectedElementIds.size}</span>
                  <span>Tool: {whiteboardState.tool.type}</span>
                </div>
              </div>

              {/* Collaboration Cursors */}
              <AnimatePresence>
                {Array.from(whiteboardState.collaborators.values()).map((collaborator) => (
                  collaborator.cursor && collaborator.isActive && (
                    <motion.div
                      key={collaborator.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute pointer-events-none z-10"
                      style={{
                        left: collaborator.cursor.x * whiteboardState.viewBox.zoom - whiteboardState.viewBox.x,
                        top: collaborator.cursor.y * whiteboardState.viewBox.zoom - whiteboardState.viewBox.y,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: collaborator.color }}
                        />
                        <div className="bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-xs font-medium shadow-sm">
                          {collaborator.name}
                        </div>
                      </div>
                    </motion.div>
                  )
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}