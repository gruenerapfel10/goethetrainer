"use client"

import { useState, useCallback, useRef, useEffect, memo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Loader2, Search, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useChat, AttachmentType, AttachmentStatus } from "@/contexts/chat-context"
import { FileSearchResult, FileSearchProps } from "./types"
import { SearchDropdown } from "./SearchDropdown"
import { isImage, getMediaType, verifyFileExists } from "./utils"
import { dropdownAnimation } from "./animations"

function FileSearchComponent({
  isCompact = false,
}: FileSearchProps) {
  const { agentFeatures, attachments, setAttachments } = useChat()
  
  // Return null if file search is not active
  if (!agentFeatures?.fileSearch?.active) {
    return null
  }
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<FileSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set())
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const allFilesScrollRef = useRef<HTMLDivElement>(null)
  
  // All files state
  const [isShowingAllFiles, setIsShowingAllFiles] = useState(false)
  const [allFiles, setAllFiles] = useState<FileSearchResult[]>([])
  const [allFilesPage, setAllFilesPage] = useState(1)
  const [hasMoreAllFiles, setHasMoreAllFiles] = useState(true)
  const [isLoadingAllFiles, setIsLoadingAllFiles] = useState(false)
  const [hasLoadedInitialFiles, setHasLoadedInitialFiles] = useState(false)

  // Note: processingFiles state is kept locally for FileSearch UI only
  // hasProcessingFiles is computed from attachment statuses in chat context

  const showDropdown = isSearchFocused && (isLoading || isShowingAllFiles || searchResults.length > 0)

  const getContentHeight = () => 
    isLoading || isLoadingAllFiles ? "280px" :
    (isShowingAllFiles && allFiles.length > 0) || searchResults.length > 0 ? "400px" :
    searchQuery.length > 2 || (searchQuery.length === 0 && isShowingAllFiles) ? "140px" : "0px"

  const verifyAndFilterFiles = async (files: FileSearchResult[]) => {
    const verified = await Promise.all(
      files.map(async (file) => 
        file.url.startsWith('s3://') && !(await verifyFileExists(file.url)) ? null : file
      )
    )
    return verified.filter(Boolean) as FileSearchResult[]
  }

  const loadAllFiles = useCallback(async (page: number) => {
    if (isLoadingAllFiles) return
    
    setIsLoadingAllFiles(true)
    try {
      const response = await fetch("/api/chat/sharepoint-recent-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page, limit: 50 }),
      })
      
      if (response.ok) {
        const data = await response.json()
        const existingFiles = await verifyAndFilterFiles(data.files)
        
        setAllFiles(prev => page === 1 ? existingFiles : [...prev, ...existingFiles])
        setHasMoreAllFiles(data.hasMore)
        setAllFilesPage(page)
      }
    } catch (error) {
      console.error("Failed to load all files:", error)
    } finally {
      setIsLoadingAllFiles(false)
    }
  }, [isLoadingAllFiles])

  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([])
      setIsLoading(false)
      setIsShowingAllFiles(query.length === 0)
      if (query.length === 0 && allFiles.length === 0) {
        await loadAllFiles(1)
      }
      return
    }
    
    setIsShowingAllFiles(false)
    setIsLoading(true)
    
    try {
      const response = await fetch("/api/chat/sharepoint-search-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, page: 1, limit: 50 }),
      })
      
      if (response.ok) {
        const data = await response.json()
        const existingFiles = await verifyAndFilterFiles(data.files)
        setSearchResults(existingFiles)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error("File search failed:", error)
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }, [allFiles.length, loadAllFiles])

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (!searchQuery && isSearchFocused) {
        setSearchResults([])
        setIsShowingAllFiles(true)
        if (!allFiles.length && !isLoadingAllFiles) {
          loadAllFiles(1)
        }
      } else if (isSearchFocused) {
        handleSearch(searchQuery)
      }
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery, handleSearch, isSearchFocused, allFiles.length, isLoadingAllFiles, loadAllFiles])

  const handleSelectFile = async (file: FileSearchResult) => {
    const isSelected = attachments.find((a) => a.url === file.url && a.type === AttachmentType.KB_FILE)
    
    if (isSelected) {
      setAttachments(attachments.filter((a) => !(a.url === file.url && a.type === AttachmentType.KB_FILE)))
      return
    }

    setProcessingFiles(prev => new Set(prev).add(file.url))
    const toast = (await import('sonner')).toast
    
    const isImageFile = isImage(file.title)
    const mediaType = getMediaType(file.title)
    
    // Add processing attachment immediately for optimistic UI
    setAttachments((prev) => [...prev, {
      url: file.url,
      name: file.title,
      contentType: mediaType,
      type: AttachmentType.KB_FILE,
      status: AttachmentStatus.UPLOADING,
      thumbnailUrl: file.thumbnailUrl,
      metadata: { ...file.metadata, isImage: isImageFile }
    }])

    try {
      // Non-S3 files
      if (!file.url.startsWith('s3://')) {
        setAttachments((prev) => prev.map(a => 
          a.url === file.url && a.type === AttachmentType.KB_FILE && a.status === AttachmentStatus.UPLOADING
            ? { ...a, status: AttachmentStatus.READY }
            : a
        ))
        toast.success(`Added "${file.title}"`)
        return
      }

      // Verify S3 file exists
      if (!(await verifyFileExists(file.url))) {
        toast.error(`File "${file.title}" is no longer available`)
        setAttachments((prev) => prev.filter(a => !(a.url === file.url && a.type === AttachmentType.KB_FILE)))
        setSearchResults(prev => prev.filter(r => r.url !== file.url))
        setAllFiles(prev => prev.filter(r => r.url !== file.url))
        return
      }
      
      // Handle images
      if (isImageFile) {
        setAttachments((prev) => prev.map(a => 
          a.url === file.url && a.type === AttachmentType.KB_FILE && a.status === AttachmentStatus.UPLOADING
            ? { ...a, status: AttachmentStatus.READY, metadata: { ...a.metadata, verified: true } }
            : a
        ))
        toast.success(`Added image "${file.title}"`)
        return
      }
      
      // Fetch document content
      const response = await fetch('/api/files/raw-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Url: file.url }),
      })
      
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
      
      const { content, isPdf } = await response.json()
      if (!content) throw new Error('No content received')
      
      setAttachments((prev) => prev.map(a => 
        a.url === file.url && a.type === AttachmentType.KB_FILE && a.status === AttachmentStatus.UPLOADING
          ? {
              ...a,
              status: AttachmentStatus.READY,
              content: content,
              metadata: {
                ...a.metadata,
                isPdf: isPdf || file.title.toLowerCase().endsWith('.pdf'),
                contentEmbedded: true,
                contentLength: content.length
              }
            }
          : a
      ))
      toast.success(`Added document "${file.title}" with embedded content`)
    } catch (error) {
      console.error(`[FileSearch] Error:`, error)
      toast.error(`Failed to load "${file.title}"`)
      // Update to error state
      setAttachments((prev) => prev.map(a => 
        a.url === file.url && a.type === AttachmentType.KB_FILE && a.status === AttachmentStatus.UPLOADING
          ? { ...a, status: AttachmentStatus.ERROR }
          : a
      ))
    } finally {
      setProcessingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(file.url)
        return newSet
      })
    }
  }

  const handleSearchFocus = async () => {
    setIsSearchFocused(true)
    if (!searchQuery && !hasLoadedInitialFiles) {
      setIsShowingAllFiles(true)
      setHasLoadedInitialFiles(true)
      if (!allFiles.length) await loadAllFiles(1)
    }
  }
  
  const handleSearchBlur = () => setTimeout(() => {
    setIsSearchFocused(false)
    setSearchQuery("")
    setIsShowingAllFiles(false)
  }, 150)

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleAllFilesScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && !isLoadingAllFiles && hasMoreAllFiles) {
      loadAllFiles(allFilesPage + 1)
    }
  }, [isLoadingAllFiles, hasMoreAllFiles, allFilesPage, loadAllFiles])

  return (
    <div className={cn("relative w-full", isCompact && "max-w-3xl mx-auto")}>
      <div
        ref={searchContainerRef}
        className={cn("relative group z-50", isCompact ? "max-w-full" : "max-w-[50%] mx-auto")}
      >
        <div className={cn(
          "relative bg-background border rounded-[14px] overflow-hidden",
          isSearchFocused 
            ? "border-orange-500/20" 
            : "border-border/50 hover:border-border/70",
        )}>
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                {...dropdownAnimation}
                animate={dropdownAnimation.animate(getContentHeight())}
                className="overflow-hidden"
                onMouseDown={(e) => e.preventDefault()}
              >
                <SearchDropdown
                  isLoading={isLoading}
                  isShowingAllFiles={isShowingAllFiles}
                  allFiles={allFiles}
                  searchResults={searchResults}
                  selectedFiles={attachments.filter(a => a.type === AttachmentType.KB_FILE).map(a => ({
                    title: a.name || '',
                    url: a.url || '',
                    content: a.content,
                    thumbnailUrl: a.thumbnailUrl,
                    metadata: a.metadata
                  }))}
                  processingFiles={processingFiles}
                  isLoadingAllFiles={isLoadingAllFiles}
                  hasMoreAllFiles={hasMoreAllFiles}
                  onFileSelect={handleSelectFile}
                  onScroll={handleAllFilesScroll}
                  scrollRef={allFilesScrollRef}
                  searchQuery={searchQuery}
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="relative py-2 px-3">
            <Search className={cn(
              "absolute left-3 h-4 w-4 z-10 top-1/2 -translate-y-1/2",
              isSearchFocused ? "text-primary" : "text-muted-foreground"
            )} />
            
            <Input
              type="text"
              placeholder={attachments.filter(a => a.type === AttachmentType.KB_FILE).length 
                ? `Search files (${attachments.filter(a => a.type === AttachmentType.KB_FILE).length} selected)...` 
                : "Search and attach files..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              className={cn(
                "w-full pl-7 pr-7 border-0 bg-transparent h-7",
                "placeholder:text-muted-foreground/60 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                "text-sm py-0",
              )}
            />
            
            {isLoading ? (
              <Loader2 className="absolute right-3 h-5 w-5 animate-spin text-primary top-1/2 -translate-y-1/2" />
            ) : searchQuery ? (
              <Sparkles className="absolute right-3 h-5 w-5 text-primary/60 animate-pulse top-1/2 -translate-y-1/2" />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export const FileSearch = memo(FileSearchComponent)
export type { FileSearchResult, FileSearchProps } from "./types"