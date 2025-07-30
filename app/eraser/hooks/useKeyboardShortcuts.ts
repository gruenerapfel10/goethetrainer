import { useEffect } from 'react'
import { SidebarItem } from '../types'

/**
 * Keyboard Shortcuts:
 * - Ctrl/Cmd + A: Select all nodes
 * - Shift + 1: Select/cursor mode
 * - Shift + T: Add text node
 * - Shift + N: Add note node
 * - Shift + K: Add task node
 * - Shift + I: Add image node
 * - Shift + R: Add rectangle node
 * - Shift + C: Add circle node
 * - Shift + V: Add triangle node
 * - Delete/Backspace: Delete selected nodes
 */

interface UseKeyboardShortcutsProps {
  onSelectAll: () => void
  onAddText: () => void
  onAddNote: () => void
  onAddTask: () => void
  onAddImage: () => void
  onAddRectangle: () => void
  onAddCircle: () => void
  onAddTriangle: () => void
  onSetSelectMode: () => void
  onDelete: () => void
  activeSidebarItem: SidebarItem
  onSidebarItemClick: (item: SidebarItem) => void
}

export const useKeyboardShortcuts = ({
  onSelectAll,
  onAddText,
  onAddNote,
  onAddTask,
  onAddImage,
  onAddRectangle,
  onAddCircle,
  onAddTriangle,
  onSetSelectMode,
  onDelete,
  activeSidebarItem,
  onSidebarItemClick,
}: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if we're in an input/contenteditable
      if (e.target instanceof HTMLElement) {
        const isEditing = e.target.getAttribute('data-editing') === 'true' ||
          e.target.isContentEditable ||
          e.target.tagName === 'INPUT' ||
          e.target.tagName === 'TEXTAREA'
        
        if (isEditing) return
      }

      // Prevent interference with browser shortcuts
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'a') {
          e.preventDefault()
          onSelectAll()
        }
        return
      }

      // Only handle shift + key combinations
      if (!e.shiftKey) return

      switch (e.key.toLowerCase()) {
        case '1':
          e.preventDefault()
          onSetSelectMode()
          break
        case 't':
          e.preventDefault()
          onAddText()
          break
        case 'n':
          e.preventDefault()
          onAddNote()
          break
        case 'k':
          e.preventDefault()
          onAddTask()
          break
        case 'i':
          e.preventDefault()
          onAddImage()
          break
        case 'r':
          e.preventDefault()
          onAddRectangle()
          break
        case 'c':
          e.preventDefault()
          onAddCircle()
          break
        case 'v':
          e.preventDefault()
          onAddTriangle()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    onSelectAll,
    onAddText,
    onAddNote,
    onAddTask,
    onAddImage,
    onAddRectangle,
    onAddCircle,
    onAddTriangle,
    onSetSelectMode,
    onDelete,
    activeSidebarItem,
    onSidebarItemClick,
  ])
} 