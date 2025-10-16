"use client"

import { motion } from "framer-motion"
import { Loader2, Search } from "lucide-react"
import { FileSearchResult } from "./types"
import { FileItem } from "./FileItem"
import { FileSearchSkeleton } from "./FileSearchSkeleton"

interface SearchDropdownProps {
  isLoading: boolean
  isShowingAllFiles: boolean
  allFiles: FileSearchResult[]
  searchResults: FileSearchResult[]
  selectedFiles: FileSearchResult[]
  processingFiles: Set<string>
  isLoadingAllFiles: boolean
  hasMoreAllFiles: boolean
  onFileSelect: (file: FileSearchResult) => void
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void
  scrollRef?: React.RefObject<HTMLDivElement>
  searchQuery: string
}

export function SearchDropdown({
  isLoading,
  isShowingAllFiles,
  allFiles,
  searchResults,
  selectedFiles,
  processingFiles,
  isLoadingAllFiles,
  hasMoreAllFiles,
  onFileSelect,
  onScroll,
  scrollRef,
  searchQuery
}: SearchDropdownProps) {
  const files = isShowingAllFiles ? allFiles : searchResults
  const hasFiles = files.length > 0
  const showEmpty = (searchQuery.length > 2 || (searchQuery.length === 0 && isShowingAllFiles)) && !hasFiles && !isLoading

  return (
    <div 
      ref={scrollRef}
      className="max-h-[400px] overflow-y-auto bg-background" 
      style={{ scrollbarWidth: "thin" }}
      onScroll={isShowingAllFiles ? onScroll : undefined}
    >
      {isLoading && <FileSearchSkeleton />}
      
      {!isLoading && hasFiles && (
        <div className="py-1">
          {files.map((file, index) => (
            <FileItem
              key={file.url}
              file={file}
              index={index}
              isShowingAll={isShowingAllFiles}
              isSelected={selectedFiles.some((sf) => sf.url === file.url)}
              isProcessing={processingFiles.has(file.url)}
              onSelect={onFileSelect}
            />
          ))}
          
          {isShowingAllFiles && isLoadingAllFiles && (
            <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading more files...</span>
            </div>
          )}
          
          {isShowingAllFiles && !hasMoreAllFiles && allFiles.length > 10 && (
            <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
              You have reached the end of all files.
            </div>
          )}
        </div>
      )}
      
      {showEmpty && (
        <div className="p-6 text-center text-sm text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
          {isShowingAllFiles ? "No files available." : "No files found."}
        </div>
      )}
    </div>
  )
}