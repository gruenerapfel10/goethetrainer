import React, { useState } from 'react'
import { Plus, Hash, Type, List, CheckSquare2, Code, Quote, Trash2, FileText, PlusCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { NotionBlock, Note } from '../types'

interface NotesPanelProps {
  notes: Note[]
  onAddNote: () => void
  onUpdateNote: (noteId: string, blocks: NotionBlock[]) => void
  onDeleteNote: (noteId: string) => void
  onAddNoteAsNode?: (note: Note) => void
}

const BLOCK_TYPES = [
  { type: 'paragraph', icon: Type, label: 'Text' },
  { type: 'heading', icon: Hash, label: 'Heading' },
  { type: 'bullet', icon: List, label: 'Bullet List' },
  { type: 'todo', icon: CheckSquare2, label: 'To-do' },
  { type: 'code', icon: Code, label: 'Code' },
  { type: 'quote', icon: Quote, label: 'Quote' },
] as const

export const NotesPanel: React.FC<NotesPanelProps> = ({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onAddNoteAsNode,
}) => {
  const [selectedNote, setSelectedNote] = useState<Note | null>(notes[0] || null)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)

  const addBlock = (type: NotionBlock['type']) => {
    if (!selectedNote) return

    const newBlock: NotionBlock = {
      id: `block_${Date.now()}`,
      type,
      content: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(type === 'heading' && { level: 1 }),
      ...(type === 'todo' && { completed: false }),
    }

    const updatedBlocks = [...selectedNote.blocks, newBlock]
    onUpdateNote(selectedNote.id, updatedBlocks)
    setSelectedNote({ ...selectedNote, blocks: updatedBlocks })
    setEditingBlockId(newBlock.id)
  }

  const updateBlock = (blockId: string, content: string, completed?: boolean) => {
    if (!selectedNote) return

    const updatedBlocks = selectedNote.blocks.map(block =>
      block.id === blockId
        ? { ...block, content, completed, updatedAt: new Date() }
        : block
    )
    
    onUpdateNote(selectedNote.id, updatedBlocks)
    setSelectedNote({ ...selectedNote, blocks: updatedBlocks })
  }

  const deleteBlock = (blockId: string) => {
    if (!selectedNote) return

    const updatedBlocks = selectedNote.blocks.filter(block => block.id !== blockId)
    onUpdateNote(selectedNote.id, updatedBlocks)
    setSelectedNote({ ...selectedNote, blocks: updatedBlocks })
  }

  const updateNoteTitle = (title: string) => {
    if (!selectedNote) return
    
    const updatedNote = { ...selectedNote, title, updatedAt: new Date() }
    setSelectedNote(updatedNote)
    // Update the note in the state
    onUpdateNote(selectedNote.id, selectedNote.blocks)
  }

  const renderBlock = (block: NotionBlock) => {
    const isEditing = editingBlockId === block.id

    const baseClasses = "w-full p-2 rounded-md border-none bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"

    switch (block.type) {
      case 'heading':
        return (
          <div key={block.id} className="group relative">
            <Input
              value={block.content}
              onChange={(e) => updateBlock(block.id, e.target.value)}
              onBlur={() => setEditingBlockId(null)}
              onFocus={() => setEditingBlockId(block.id)}
              placeholder="Heading"
              className={`${baseClasses} text-xl font-bold`}
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 w-6 h-6 p-0"
              onClick={() => deleteBlock(block.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )

      case 'todo':
        return (
          <div key={block.id} className="group relative flex items-start space-x-2">
            <button
              className={`mt-2 w-4 h-4 rounded border-2 flex items-center justify-center ${
                block.completed
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => updateBlock(block.id, block.content, !block.completed)}
            >
              {block.completed && <CheckSquare2 className="w-3 h-3" />}
            </button>
            <Input
              value={block.content}
              onChange={(e) => updateBlock(block.id, e.target.value, block.completed)}
              onBlur={() => setEditingBlockId(null)}
              onFocus={() => setEditingBlockId(block.id)}
              placeholder="To-do"
              className={`${baseClasses} flex-1 ${block.completed ? 'line-through text-gray-500' : ''}`}
            />
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 w-6 h-6 p-0 mt-1"
              onClick={() => deleteBlock(block.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )

      case 'bullet':
        return (
          <div key={block.id} className="group relative flex items-start space-x-2">
            <div className="mt-3 w-1.5 h-1.5 rounded-full bg-gray-400"></div>
            <Input
              value={block.content}
              onChange={(e) => updateBlock(block.id, e.target.value)}
              onBlur={() => setEditingBlockId(null)}
              onFocus={() => setEditingBlockId(block.id)}
              placeholder="List item"
              className={`${baseClasses} flex-1`}
            />
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 w-6 h-6 p-0 mt-1"
              onClick={() => deleteBlock(block.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )

      case 'code':
        return (
          <div key={block.id} className="group relative">
            <textarea
              value={block.content}
              onChange={(e) => updateBlock(block.id, e.target.value)}
              onBlur={() => setEditingBlockId(null)}
              onFocus={() => setEditingBlockId(block.id)}
              placeholder="Code block"
              className={`${baseClasses} font-mono bg-gray-100 dark:bg-gray-800 min-h-[100px]`}
              rows={4}
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 w-6 h-6 p-0"
              onClick={() => deleteBlock(block.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )

      case 'quote':
        return (
          <div key={block.id} className="group relative border-l-4 border-gray-300 pl-4">
            <Input
              value={block.content}
              onChange={(e) => updateBlock(block.id, e.target.value)}
              onBlur={() => setEditingBlockId(null)}
              onFocus={() => setEditingBlockId(block.id)}
              placeholder="Quote"
              className={`${baseClasses} italic text-gray-700 dark:text-gray-300`}
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 w-6 h-6 p-0"
              onClick={() => deleteBlock(block.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )

      default:
        return (
          <div key={block.id} className="group relative">
            <Input
              value={block.content}
              onChange={(e) => updateBlock(block.id, e.target.value)}
              onBlur={() => setEditingBlockId(null)}
              onFocus={() => setEditingBlockId(block.id)}
              placeholder="Type something..."
              className={baseClasses}
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 w-6 h-6 p-0"
              onClick={() => deleteBlock(block.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )
    }
  }

  return (
    <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Notes Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notes</h3>
          <Button onClick={onAddNote} size="sm" variant="outline">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Notes List */}
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {notes.map((note) => (
            <div key={note.id} className="group flex items-center">
              <button
                onClick={() => setSelectedNote(note)}
                className={`flex-1 text-left p-2 rounded text-sm truncate ${
                  selectedNote?.id === note.id
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                {note.title}
              </button>
              {onAddNoteAsNode && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 p-0 ml-1"
                  onClick={() => onAddNoteAsNode(note)}
                  title="Add to canvas"
                >
                  <ArrowRight className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Note Editor */}
      {selectedNote ? (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Input
                value={selectedNote.title}
                onChange={(e) => updateNoteTitle(e.target.value)}
                className="text-xl font-bold border-none shadow-none p-0 focus:ring-0 flex-1"
                placeholder="Note title"
              />
              {onAddNoteAsNode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddNoteAsNode(selectedNote)}
                  className="flex items-center gap-1"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add to Canvas
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              {selectedNote.blocks.map(renderBlock)}
            </div>

            {/* Add Block Buttons */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 mb-2">Add a block:</p>
              <div className="grid grid-cols-3 gap-1">
                {BLOCK_TYPES.map(({ type, icon: Icon, label }) => (
                  <Button
                    key={type}
                    variant="ghost"
                    size="sm"
                    onClick={() => addBlock(type)}
                    className="flex flex-col h-auto p-2 text-xs"
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No notes yet</p>
            <Button onClick={onAddNote} size="sm" className="mt-2">
              Create your first note
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 