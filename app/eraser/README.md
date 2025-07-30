# Pacemaker Canvas System Architecture

## Overview
A React-based canvas system for creating interactive node-based diagrams with rich editing capabilities, AI assistance, and real-time collaboration features. Features a modern, modular architecture with standardized node components and professional UI/UX patterns.

## Core Architecture

### 1. Node System (New Modular Architecture)
```
Node Infrastructure/
├── BaseNode Component (shared.tsx)
│   ├── Standardized layout and behavior
│   ├── React Flow connection handles
│   ├── Unified resize system
│   ├── Context menus and interactions
│   └── Consistent styling framework
├── Specialized Node Types
│   ├── ShapeNode (rectangle, circle, triangle)
│   ├── TextNode (inline editing, typography)
│   ├── NoteNode (rich text, Notion-like)
│   ├── TaskNode (modern task management)
│   └── ImageNode (upload, annotations)
└── Node Features
    ├── Professional glassmorphic styling
    ├── Animated status indicators
    ├── Real-time resizing with corner anchoring
    ├── Connection points for React Flow
    └── Minimized/expanded states
```

### 2. Task Management System (Enhanced)
```
Modern Task Features/
├── Status Flow
│   ├── To Do → In Progress → Working On → Review → Done
│   ├── Blocked/Paused states with visual indicators
│   ├── Animated status transitions
│   └── Working On status with pulsing border
├── Interactive Elements
│   ├── Inline title and description editing
│   ├── Priority levels (Low/Medium/High/Urgent)
│   ├── Time tracking with start/stop timer
│   ├── Progress bars and completion animations
│   └── Subtask management with add/delete
├── Visual Design
│   ├── Status-aware color schemes
│   ├── Micro-animations and feedback
│   ├── Hover effects and transitions
│   └── Professional gradient backgrounds
└── Productivity Features
    ├── Time worked tracking
    ├── Creation and completion timestamps
    ├── Assignee management
    └── Overdue indicators
```

### 3. State Management
```
useCanvasState/
├── Core State
│   ├── nodes (React Flow nodes)
│   ├── edges (connections)
│   ├── layers (z-index management)
│   └── selectedNode
├── UI State
│   ├── activeSidebarItem
│   ├── showDrawingSidebar
│   ├── showTasksPanel
│   └── zoomLevel
└── Feature State
    ├── notes[]
    ├── tasks[]
    └── comments[]
```

### 4. UI Components
```
Components/
├── Main Layout
│   ├── Toolbar
│   ├── Canvas
│   └── Sidebars
├── Primary Sidebar
│   ├── Layers Panel
│   ├── Notes Panel
│   ├── Tasks Panel
│   ├── Templates Panel
│   └── AI Assistant Panel
├── Secondary Sidebars
│   ├── Properties Panel
│   └── Drawing Tools Panel
└── Canvas Tools
    ├── Node Creation
    ├── Selection Tools
    └── Zoom Controls
```

## Technical Implementation

### BaseNode Architecture
- **Unified Foundation**: All nodes extend the `BaseNode` component ensuring consistency
- **React Flow Integration**: Proper Handle components for seamless connections
- **Standardized Resize**: Corner-based resizing with position anchoring
- **Context Menus**: Right-click functionality across all node types
- **Performance Optimized**: requestAnimationFrame for smooth interactions
- **Type Safety**: Full TypeScript support with proper interfaces

### Node-Specific Features

#### TaskNode (Completely Overhauled)
- **Modern UI**: Glassmorphic design with status-aware styling
- **Status Management**: 6-state workflow with animated transitions
- **Time Tracking**: Built-in timer with formatted display
- **Subtask System**: Add, complete, and delete subtasks inline
- **Priority Levels**: Visual priority indicators with color coding
- **Inline Editing**: Click-to-edit titles and descriptions
- **Progress Tracking**: Visual progress bars and completion metrics
- **Professional Animations**: Hover effects, transitions, and feedback

#### NoteNode (Notion-like Experience)
- **Rich Text Editing**: WYSIWYG editor with markdown support
- **Seamless Integration**: Transparent backgrounds, no UI bleeding
- **Auto-resize**: Content-aware height adjustments
- **Floating Toolbar**: Context-sensitive editing controls
- **Meta Information**: Word count, timestamps, status indicators
- **Optimized Performance**: Debounced saves, ResizeObserver

#### Connection System
- **Enhanced Handles**: Visible connection points on all nodes
- **Improved Styling**: Professional blue handles with hover effects
- **Proper Positioning**: Correct placement for optimal connections
- **Visual Feedback**: Hover states and connection indicators

### Styling Framework
```css
Design Language/
├── Glassmorphic Effects
│   ├── backdrop-blur and saturation
│   ├── Semi-transparent backgrounds
│   └── Subtle gradients and shadows
├── Color Psychology
│   ├── Status-aware color schemes
│   ├── Priority-based visual hierarchy
│   └── Accessibility-compliant contrasts
├── Micro-interactions
│   ├── Hover and focus states
│   ├── Animated state transitions
│   ├── Progress indicators
│   └── Success animations
└── Professional Polish
    ├── Consistent spacing and typography
    ├── Subtle drop shadows
    ├── Smooth transitions
    └── Modern border radius
```

## Enhanced Features

### Modern Task Management
- **Notion-Inspired UX**: Professional task creation and management
- **Real-time Updates**: Instant feedback on all interactions
- **Visual Progress**: Progress bars, completion animations
- **Status Workflows**: Customizable status flows with visual indicators
- **Time Tracking**: Built-in productivity tracking
- **Smart Subtasks**: Hierarchical task breakdown

### Professional Interactions
- **Inline Editing**: Click anywhere to edit content
- **Context Menus**: Right-click for additional options
- **Keyboard Shortcuts**: Efficient workflow navigation
- **Drag & Drop**: Intuitive node manipulation
- **Multi-select**: Batch operations support

### Performance Optimizations
- **Debounced Updates**: Efficient state management
- **requestAnimationFrame**: Smooth resize operations
- **Optimized Renders**: Minimized re-renders
- **Memory Management**: Proper cleanup and disposal

## Key Files

```
app/eraser/
├── components/
│   ├── nodes/
│   │   ├── shared.tsx (BaseNode + utilities)
│   │   ├── TaskNode.tsx (enhanced task management)
│   │   ├── NoteNode.tsx (Notion-like experience)
│   │   ├── ShapeNode.tsx (basic shapes)
│   │   ├── TextNode.tsx (text editing)
│   │   ├── ImageNode.tsx (image handling)
│   │   └── index.tsx (exports)
│   ├── canvas.tsx (main canvas component)
│   ├── toolbar.tsx (top toolbar)
│   ├── primary-sidebar.tsx (main sidebar)
│   ├── properties-sidebar.tsx (node properties)
│   └── ai-assistant-panel.tsx (AI integration)
├── hooks/
│   ├── useCanvasState.ts (state management)
│   └── useKeyboardShortcuts.ts (keyboard controls)
└── types.ts (comprehensive type definitions)
```

## State Flow

1. User Interaction → Event Handler
2. Event Handler → State Update (useCanvasState)
3. State Update → Component Re-render
4. Component Re-render → Visual Update
5. State Persistence → Local Storage

## Keyboard Shortcuts

- `Shift + T`: Add text node
- `Shift + N`: Add note node
- `Shift + K`: Add task node
- `Shift + I`: Add image node
- `Shift + R`: Add rectangle node
- `Shift + C`: Add circle node
- `Shift + V`: Add triangle node
- `Shift + 1`: Select/cursor mode
- `Ctrl/Cmd + A`: Select all nodes
- `Delete/Backspace`: Delete selected nodes

## Node Types

### BaseNode Properties
All nodes share these common properties through BaseNode:
- **Core**: `id`, `type`, `title`, `description`
- **Visual**: `width`, `height`, `fill`, `stroke`
- **State**: `status`, `isMinimized`, `isSelected`
- **Interaction**: Resize handles, connection points, context menus
- **Styling**: Professional glassmorphic effects

### TaskNode (Enhanced Features)
- **Status Management**: 6-state workflow with animations
- **Time Tracking**: Built-in timer with persistence
- **Subtasks**: Full CRUD operations with progress tracking
- **Priority Levels**: Visual priority indicators
- **Inline Editing**: Click-to-edit all text content
- **Professional UI**: Status-aware styling and animations

### Connection System
- **React Flow Handles**: Proper connection points on all nodes
- **Visual Feedback**: Hover states and connection indicators
- **Professional Styling**: Blue handles with white borders
- **Optimal Placement**: Top, bottom, left, right positions

## Extensibility

The system is designed for extensibility through:
- **BaseNode Foundation**: All new nodes extend BaseNode
- **Modular Architecture**: Easy to add new node types
- **Type Safety**: Comprehensive TypeScript interfaces
- **Consistent APIs**: Standardized patterns across components
- **Professional Standards**: Modern UI/UX patterns throughout

## Recent Improvements

### Task Management Overhaul
- ✅ Complete redesign with modern UI patterns
- ✅ Animated status indicators with working state glow
- ✅ Inline editing for all text content
- ✅ Time tracking with visual timer
- ✅ Enhanced subtask management
- ✅ Professional micro-animations

### Node System Standardization
- ✅ BaseNode architecture for consistency
- ✅ Fixed resize conflicts with React Flow
- ✅ Restored connection handles on all nodes
- ✅ Unified styling and behavior patterns
- ✅ Performance optimizations

### Professional Polish
- ✅ Glassmorphic design language
- ✅ Status-aware color schemes
- ✅ Smooth transitions and animations
- ✅ Consistent spacing and typography
- ✅ Accessibility considerations

## Future Improvements

- Real-time collaboration
- Custom node type builder
- Enhanced AI capabilities
- Mobile optimization
- Plugin system
- Version history
- Export/import functionality
- Advanced search capabilities
- Integration with external services
- Advanced animation system 