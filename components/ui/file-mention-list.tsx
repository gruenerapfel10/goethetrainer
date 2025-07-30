'use client'

import { cn } from '@/lib/utils'
import { memo } from 'react'
import {
  FileIcon,
  FileText,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileVideo,
  FileAudio,
  Archive,
} from "lucide-react"
import { motion } from 'framer-motion'

const getFileIcon = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase()
  const iconProps = {
    className: "h-4 w-4 mr-2 flex-shrink-0",
  }
  switch (extension) {
    case "docx":
    case "doc":
      return <FileCode {...iconProps} className={cn(iconProps.className, "text-blue-500")} />
    case "xlsx":
    case "xls":
    case "csv":
      return <FileSpreadsheet {...iconProps} className={cn(iconProps.className, "text-green-500")} />
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
      return <FileImage {...iconProps} className={cn(iconProps.className, "text-purple-500")} />
    case "mp4":
    case "avi":
    case "mov":
    case "wmv":
      return <FileVideo {...iconProps} className={cn(iconProps.className, "text-pink-500")} />
    case "mp3":
    case "wav":
    case "flac":
      return <FileAudio {...iconProps} className={cn(iconProps.className, "text-yellow-500")} />
    case "zip":
    case "rar":
    case "7z":
      return <Archive {...iconProps} className={cn(iconProps.className, "text-gray-500")} />
    default:
      return <FileIcon {...iconProps} className={cn(iconProps.className, "text-slate-500")} />
  }
}

interface FileMentionListProps {
  files: string[]
  highlightedIndex: number
  setHighlightedIndex: (index: number) => void
  onSelect: (fileName: string) => void
}

function PureFileMentionList({
  files,
  highlightedIndex,
  setHighlightedIndex,
  onSelect,
}: FileMentionListProps) {
  if (files.length === 0) {
    return (
      <div className="p-4 text-sm text-center text-muted-foreground">
        Attach files first to see them appear here.
      </div>
    )
  }

  return (
    <div className="p-1">
      {files.map((file, index) => (
        <motion.div
          key={file}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
            delay: index * 0.03,
          }}
        >
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(file)}
            onMouseMove={() => setHighlightedIndex(index)}
            className={cn(
              'flex items-center w-full text-left p-2 text-sm rounded-md cursor-pointer',
              index === highlightedIndex && 'bg-accent text-accent-foreground',
            )}
          >
            {getFileIcon(file)}
            <span className="truncate">{file}</span>
          </button>
        </motion.div>
      ))}
    </div>
  )
}

export const FileMentionList = memo(PureFileMentionList) 