"use client"

import { motion } from "framer-motion"
import { Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FileItemProps } from "./types"
import { getFileStyle } from "./utils"

export function FileItem({ 
  file, 
  index, 
  isShowingAll, 
  isSelected, 
  isProcessing, 
  onSelect 
}: FileItemProps) {
  const style = getFileStyle(file.title)
  const Icon = style.icon
  
  // Get file-specific colors
  const getFileColors = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase()
    switch(ext) {
      case 'pdf':
        return "bg-red-500/10 text-red-600 dark:text-red-500"
      case 'doc':
      case 'docx':
        return "bg-blue-500/10 text-blue-600 dark:text-blue-500"
      case 'xls':
      case 'xlsx':
      case 'csv':
        return "bg-green-500/10 text-green-600 dark:text-green-500"
      case 'ppt':
      case 'pptx':
        return "bg-orange-500/10 text-orange-600 dark:text-orange-500"
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return "bg-purple-500/10 text-purple-600 dark:text-purple-500"
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
        return "bg-pink-500/10 text-pink-600 dark:text-pink-500"
      case 'mp3':
      case 'wav':
      case 'flac':
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500"
      case 'zip':
      case 'rar':
      case '7z':
        return "bg-gray-500/10 text-gray-600 dark:text-gray-500"
      case 'txt':
      case 'md':
        return "bg-slate-500/10 text-slate-600 dark:text-slate-500"
      default:
        return "bg-muted/50 text-muted-foreground"
    }
  }
  
  const fileColors = getFileColors(file.title)
  
  return (
    <motion.div
      className={cn(
        "group relative py-2 px-3 cursor-pointer flex items-center gap-3 text-sm rounded-md",
        "transition-all duration-75",
        "hover:translate-x-1 hover:bg-muted/50",
        isSelected && "bg-muted/80 translate-x-0.5",
      )}
      onClick={() => onSelect(file)}
      onMouseDown={(e) => e.preventDefault()}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
      transition={{ 
        duration: 0.05, 
        delay: Math.min(0.005 * (isShowingAll ? (index % 10) : index), 0.05),
        hover: { duration: 0.08, type: "tween" }
      }}
    >
      {/* Icon with colored background and icon */}
      <div className="relative flex-shrink-0">
        <div className={cn(
          "w-7 h-7 rounded-sm flex items-center justify-center",
          "transition-all duration-75",
          fileColors.split(' ')[0], // Just the background color
          "group-hover:brightness-110 group-hover:scale-105"
        )}>
          <Icon className={cn(
            "h-4 w-4 transition-transform duration-75",
            "group-hover:scale-110",
            fileColors.split(' ').slice(1).join(' ') // Just the text color
          )} />
        </div>
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 bg-foreground rounded-sm w-3 h-3 flex items-center justify-center"
          >
            <Check className="h-2 w-2 text-background" />
          </motion.div>
        )}
      </div>
      
      {/* Content - single line, more compact */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="truncate text-foreground/90 text-[13px]">{file.title}</span>
        <span className="text-[11px] text-muted-foreground/60 hidden sm:inline">
          {file.metadata?.contentEmbedded && file.metadata.contentLength
            ? `${(file.metadata.contentLength / 1000).toFixed(0)}k chars`
            : file.content 
            ? "Preview available" 
            : ""}
        </span>
      </div>
      
      {/* Status - minimal */}
      {(isProcessing || isSelected) && (
        <div className={cn(
          "flex-shrink-0 text-[11px] font-medium",
          isProcessing ? "text-muted-foreground" : "text-foreground/70"
        )}>
          {isProcessing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
        </div>
      )}
    </motion.div>
  )
}