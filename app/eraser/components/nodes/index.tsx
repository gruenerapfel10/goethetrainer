// Export all individual node components
export { RectangleNode, CircleNode, TriangleNode } from './ShapeNode'
export { TextNode } from './TextNode'
export { NoteNode } from './NoteNode'
export { TaskNode } from './TaskNode'
export { ImageNode } from './ImageNode'

// Import for nodeTypes object
import { RectangleNode, CircleNode, TriangleNode } from './ShapeNode'
import { TextNode } from './TextNode'
import { NoteNode } from './NoteNode'
import { TaskNode } from './TaskNode'
import { ImageNode } from './ImageNode'

// Export node types for React Flow
export const nodeTypes = {
  rectangle: RectangleNode,
  circle: CircleNode,
  triangle: TriangleNode,
  text: TextNode,
  note: NoteNode,
  task: TaskNode,
  image: ImageNode,
} 