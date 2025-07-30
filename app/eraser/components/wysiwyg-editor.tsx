import React, { useCallback, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'
import { Button } from '@/components/ui/button'
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  Heading1, 
  Heading2, 
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  CheckSquare,
  Link as LinkIcon,
  Undo,
  Redo
} from 'lucide-react'

interface WysiwygEditorProps {
  content?: string
  onChange?: (content: string) => void
  onBlur?: () => void
  placeholder?: string
  className?: string
  editable?: boolean
  minimal?: boolean
}

export const WysiwygEditor: React.FC<WysiwygEditorProps> = ({
  content = '',
  onChange,
  onBlur,
  placeholder = 'Start writing...',
  className = '',
  editable = true,
  minimal = false
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Typography,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline cursor-pointer',
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
    onBlur: () => {
      onBlur?.()
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none ${className}`,
        spellcheck: 'true',
      },
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  const ToolbarButton = ({ 
    icon: Icon, 
    onClick, 
    isActive = false, 
    disabled = false,
    title
  }: {
    icon: React.ComponentType<any>
    onClick: () => void
    isActive?: boolean
    disabled?: boolean
    title: string
  }) => (
    <Button
      variant={isActive ? "default" : "ghost"}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 p-0 ${isActive ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
      title={title}
    >
      <Icon className="w-4 h-4" />
    </Button>
  )

  if (!editor) {
    return (
      <div className="min-h-[100px] flex items-center justify-center text-gray-500">
        Loading editor...
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Toolbar */}
      {!minimal && editable && (
        <div className="border-b border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-800 rounded-t-lg">
          <div className="flex items-center gap-1 flex-wrap">
            {/* History */}
            <ToolbarButton
              icon={Undo}
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo"
            />
            <ToolbarButton
              icon={Redo}
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo"
            />

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Text Formatting */}
            <ToolbarButton
              icon={Bold}
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold (Ctrl+B)"
            />
            <ToolbarButton
              icon={Italic}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic (Ctrl+I)"
            />
            <ToolbarButton
              icon={Strikethrough}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              title="Strikethrough"
            />
            <ToolbarButton
              icon={Code}
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
              title="Inline Code"
            />

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Headings */}
            <ToolbarButton
              icon={Heading1}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              title="Heading 1"
            />
            <ToolbarButton
              icon={Heading2}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="Heading 2"
            />
            <ToolbarButton
              icon={Heading3}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
              title="Heading 3"
            />

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Lists */}
            <ToolbarButton
              icon={List}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Bullet List"
            />
            <ToolbarButton
              icon={ListOrdered}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Numbered List"
            />
            <ToolbarButton
              icon={CheckSquare}
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              isActive={editor.isActive('taskList')}
              title="Task List"
            />

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Other */}
            <ToolbarButton
              icon={Quote}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="Quote"
            />
            <ToolbarButton
              icon={Minus}
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Horizontal Rule"
            />
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div className={`
        ${!minimal ? 'border border-gray-200 dark:border-gray-700 rounded-b-lg' : ''}
        ${!minimal ? 'bg-white dark:bg-gray-900' : 'bg-transparent'}
        ${!minimal ? 'min-h-[200px]' : 'h-full'}
        ${minimal ? 'overflow-hidden' : 'overflow-auto'}
        flex flex-col
      `}>
        <EditorContent 
          editor={editor} 
          className={`
            ${!minimal ? 'p-4 focus-within:ring-1 focus-within:ring-blue-500 rounded-b-lg' : 'p-3'}
            ${minimal ? 'h-full flex-1' : ''}
            text-sm
          `}
        />
      </div>

      {/* Editor Styles */}
      <style jsx global>{`
        .ProseMirror {
          outline: none;
          height: 100%;
          min-height: 150px;
        }
        
        .ProseMirror h1 {
          font-size: 1.875rem;
          font-weight: 700;
          line-height: 2.25rem;
          margin: 1rem 0 0.5rem 0;
        }
        
        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          line-height: 2rem;
          margin: 0.875rem 0 0.5rem 0;
        }
        
        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.75rem;
          margin: 0.75rem 0 0.5rem 0;
        }
        
        .ProseMirror p {
          margin: 0.5rem 0;
          line-height: 1.6;
        }
        
        .ProseMirror ul, .ProseMirror ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }
        
        .ProseMirror li {
          margin: 0.25rem 0;
          line-height: 1.5;
        }
        
        .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }
        
        .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }
        
        .ProseMirror ul[data-type="taskList"] li > label {
          flex-shrink: 0;
          margin-top: 0.125rem;
        }
        
        .ProseMirror ul[data-type="taskList"] li > div {
          flex: 1;
        }
        
        .ProseMirror blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: #6b7280;
        }
        
        .ProseMirror code {
          background-color: #f3f4f6;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
          font-size: 0.875em;
        }
        
        .ProseMirror pre {
          background-color: #1f2937;
          color: #f9fafb;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1rem 0;
        }
        
        .ProseMirror pre code {
          background: none;
          padding: 0;
          color: inherit;
        }
        
        .ProseMirror hr {
          border: none;
          border-top: 2px solid #e5e7eb;
          margin: 2rem 0;
        }
        
        .ProseMirror .is-empty::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        
        .ProseMirror a {
          color: #2563eb;
          text-decoration: underline;
          cursor: pointer;
        }
        
        .ProseMirror a:hover {
          color: #1d4ed8;
        }
        
        .dark .ProseMirror code {
          background-color: #374151;
          color: #f9fafb;
        }
        
        .dark .ProseMirror blockquote {
          border-left-color: #4b5563;
          color: #9ca3af;
        }
        
        .dark .ProseMirror hr {
          border-top-color: #4b5563;
        }
      `}</style>
    </div>
  )
} 