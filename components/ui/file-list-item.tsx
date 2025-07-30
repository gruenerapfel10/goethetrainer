import type React from "react"
import {
  FileText,
  ImageIcon,
  VideoIcon,
  FileAudioIcon,
  ArchiveIcon,
  FolderIcon,
  FileQuestionIcon,
  Dot,
} from "lucide-react"
import { cn } from "@/lib/utils" // Assuming you have cn utility

export type FileItem = {
  id: string
  name: string
  type: "file" | "folder" | "image" | "video" | "audio" | "archive" | "unknown"
  size: string
  lastModified: string
  path?: string
}

interface FileListItemProps {
  file: FileItem
}

const FileIcon: React.FC<{ type: FileItem["type"]; className?: string }> = ({ type, className }) => {
  const commonProps = { className: cn("w-5 h-5", className) }
  switch (type) {
    case "file":
      return <FileText {...commonProps} />
    case "folder":
      return <FolderIcon {...commonProps} />
    case "image":
      return <ImageIcon {...commonProps} />
    case "video":
      return <VideoIcon {...commonProps} />
    case "audio":
      return <FileAudioIcon {...commonProps} />
    case "archive":
      return <ArchiveIcon {...commonProps} />
    default:
      return <FileQuestionIcon {...commonProps} />
  }
}

export default function FileListItem({ file }: FileListItemProps) {
  return (
    <li
      className="group flex items-center space-x-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg cursor-pointer transition-all duration-200 ease-in-out transform hover:scale-[1.01] focus-within:bg-slate-100 dark:focus-within:bg-slate-700/60 focus-within:scale-[1.01]"
      tabIndex={0} // Make it focusable
      role="button" // Semantics for clickability
      aria-label={`File: ${file.name}, Type: ${file.type}, Size: ${file.size}, Last Modified: ${file.lastModified}`}
    >
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-md group-hover:bg-white dark:group-hover:bg-slate-600 transition-colors duration-200">
        <FileIcon
          type={file.type}
          className="text-slate-500 dark:text-slate-400 group-hover:text-teal-500 dark:group-hover:text-teal-400 transition-colors duration-200"
        />
      </div>
      <div className="flex-grow min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate" title={file.name}>
          {file.name}
        </p>
        {file.path && (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={file.path}>
            {file.path}
          </p>
        )}
      </div>
      <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
        <span>{file.size}</span>
        <Dot className="w-3 h-3 text-slate-300 dark:text-slate-600" />
        <span>{file.lastModified}</span>
      </div>
    </li>
  )
}
