import { z } from 'zod';

// Schema for node creation
export const NodeCreationSchema = z.object({
  type: z.enum(['note', 'task', 'text', 'rectangle', 'circle', 'triangle']),
  title: z.string().optional(),
  content: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed']).optional(),
  backgroundColor: z.string().optional(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }).optional()
});

export type NodeCreationInput = z.infer<typeof NodeCreationSchema>;

// Tool definitions that the AI can use
export const tools = {
  create_node: {
    name: 'create_node',
    description: 'Creates a new node on the canvas',
    parameters: NodeCreationSchema,
  },
  update_node: {
    name: 'update_node',
    description: 'Updates an existing node on the canvas',
    parameters: z.object({
      id: z.string(),
      updates: NodeCreationSchema.partial(),
    }),
  },
  delete_node: {
    name: 'delete_node',
    description: 'Deletes a node from the canvas',
    parameters: z.object({
      id: z.string(),
    }),
  },
  connect_nodes: {
    name: 'connect_nodes',
    description: 'Creates a connection between two nodes',
    parameters: z.object({
      sourceId: z.string(),
      targetId: z.string(),
      label: z.string().optional(),
    }),
  },
}; 