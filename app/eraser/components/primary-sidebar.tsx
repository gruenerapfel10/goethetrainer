import React from 'react'
import { Button } from '@/components/ui/button'
import { 
  Layers, 
  Plus, 
  FileText, 
  CheckSquare, 
  Image, 
  Bot,
  PanelLeft,
  Users
} from 'lucide-react'
import { SidebarItem } from '../types'

interface PrimarySidebarProps {
  activeSidebarItem: SidebarItem | null
  onSidebarItemClick: (item: SidebarItem | null) => void
  onAddNode: () => void
}

export const PrimarySidebar: React.FC<PrimarySidebarProps> = ({
  activeSidebarItem,
  onSidebarItemClick,
  onAddNode,
}) => {
  return (
    <div className="w-14 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-4">
      {/* Add Node Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onAddNode}
        className="mb-4"
      >
        <Plus className="w-5 h-5" />
      </Button>

      {/* Sidebar Items */}
      <div className="flex flex-col gap-2">
        <Button
          variant={activeSidebarItem === 'workspace' ? 'default' : 'ghost'}
          size="icon"
          onClick={() => onSidebarItemClick('workspace')}
          title="Workspace & Collaboration"
        >
          <Users className="w-5 h-5" />
        </Button>
        <Button
          variant={activeSidebarItem === 'layers' ? 'default' : 'ghost'}
          size="icon"
          onClick={() => onSidebarItemClick('layers')}
          title="Layers"
        >
          <Layers className="w-5 h-5" />
        </Button>

        <Button
          variant={activeSidebarItem === 'notes' ? 'default' : 'ghost'}
          size="icon"
          onClick={() => onSidebarItemClick('notes')}
          title="Notes"
        >
          <FileText className="w-5 h-5" />
        </Button>

        <Button
          variant={activeSidebarItem === 'tasks' ? 'default' : 'ghost'}
          size="icon"
          onClick={() => onSidebarItemClick('tasks')}
          title="Tasks"
        >
          <CheckSquare className="w-5 h-5" />
        </Button>

        <Button
          variant={activeSidebarItem === 'templates' ? 'default' : 'ghost'}
          size="icon"
          onClick={() => onSidebarItemClick('templates')}
          title="Templates"
        >
          <Image className="w-5 h-5" />
        </Button>

        <Button
          variant={activeSidebarItem === 'ai' ? 'default' : 'ghost'}
          size="icon"
          onClick={() => onSidebarItemClick('ai')}
          title="AI Assistant"
        >
          <Bot className="w-5 h-5" />
        </Button>
      </div>

      {/* Toggle Sidebar */}
      <div className="mt-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSidebarItemClick(null)}
          title="Toggle Sidebar"
        >
          <PanelLeft className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
} 