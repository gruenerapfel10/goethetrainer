"use client"

import { useState, useCallback, useRef, useEffect, memo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  XIcon,
  Loader2,
  FileIcon,
  FileText,
  FileCode,
  ChevronRight,
  Search,
  Sparkles,
  ExternalLink,
  FileImage,
  FileSpreadsheet,
  FileVideo,
  FileAudio,
  Archive,
  Check,
  Focus,
  Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// Original FileSearchResult interface from your provided file
export interface FileSearchResult {
  title: string
  url: string
  content: string
  thumbnailUrl?: string // For image files
}

export interface FileSearchProps {
  selectedFiles: FileSearchResult[]
  onSelectedFilesChange: (files: FileSearchResult[] | ((prev: FileSearchResult[]) => FileSearchResult[])) => void
  isCompact?: boolean
  isCollapsed?: boolean
  onProcessingFilesChange?: (processingUrls: string[]) => void
}

// This getFileIcon function is used for the original search dropdown (UNCHANGED)
const getOriginalFileIcon = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase()
  const iconProps = {
    className: "h-5 w-5 transition-all duration-200 group-hover:scale-110",
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

// This getFileIcon is for the new grid, styled to be themeable and modern
const getGridFileIcon = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase()
  const iconProps = {
    // Using text-muted-foreground for themeable icon color, primary on hover
    className: "h-10 w-10 text-muted-foreground group-hover/card:text-primary transition-colors duration-300",
    strokeWidth: 1.5, // Modern thin stroke
  }
  switch (extension) {
    case "docx":
    case "doc":
      return <FileCode {...iconProps} />
    case "xlsx":
    case "xls":
    case "csv":
      return <FileSpreadsheet {...iconProps} />
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
      return <FileImage {...iconProps} />
    case "mp4":
    case "avi":
    case "mov":
    case "wmv":
      return <FileVideo {...iconProps} />
    case "mp3":
    case "wav":
    case "flac":
      return <FileAudio {...iconProps} />
    case "zip":
    case "rar":
    case "7z":
      return <Archive {...iconProps} />
    default:
      return <FileIcon {...iconProps} />
  }
}

// Original getFileTypeColor for search dropdown (UNCHANGED)
const getFileTypeColor = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase()
  switch (extension) {
    case "docx":
    case "doc":
      return "from-blue-500/20 to-blue-600/20 border-blue-500/30"
    case "xlsx":
    case "xls":
    case "csv":
      return "from-green-500/20 to-green-600/20 border-green-500/30"
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
      return "from-purple-500/20 to-purple-600/20 border-purple-500/30"
    case "mp4":
    case "avi":
    case "mov":
    case "wmv":
      return "from-pink-500/20 to-pink-600/20 border-pink-500/30"
    case "mp3":
    case "wav":
    case "flac":
      return "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30"
    case "zip":
    case "rar":
    case "7z":
      return "from-gray-500/20 to-gray-600/20 border-gray-500/30"
    default:
      return "from-slate-500/20 to-slate-600/20 border-slate-500/30"
  }
}

const isPDF = (fileName: string) => {
  return fileName.toLowerCase().endsWith(".pdf")
}

const isImage = (fileName: string) => {
  const extension = fileName.toLowerCase()
  return (
    extension.endsWith(".jpg") ||
    extension.endsWith(".jpeg") ||
    extension.endsWith(".png") ||
    extension.endsWith(".gif") ||
    extension.endsWith(".webp")
  )
}

function FileSearchComponent({
  onSelectedFilesChange = () => {},
  selectedFiles = [],
  isCompact = false,
  isCollapsed = false,
  onProcessingFilesChange = () => {},
}: FileSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<FileSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isShowingAll, setIsShowingAll] = useState(!isCollapsed)
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set())
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const prevProcessingFilesRef = useRef<string[]>([]);
  const [lastSearchedQuery, setLastSearchedQuery] = useState("")

  // Notify parent when processingFiles changes - but only on mount and when processingFiles changes
  const stableOnProcessingFilesChange = useRef(onProcessingFilesChange);
  
  // Update the stable ref if the callback changes
  useEffect(() => {
    stableOnProcessingFilesChange.current = onProcessingFilesChange;
  }, [onProcessingFilesChange]);
  
  // Notify parent only when processingFiles changes
  useEffect(() => {
    const processingArray = Array.from(processingFiles);
    
    // Compare with previous value to avoid unnecessary updates
    const prevProcessingArray = prevProcessingFilesRef.current;
    if (JSON.stringify(processingArray) !== JSON.stringify(prevProcessingArray)) {
      prevProcessingFilesRef.current = processingArray;
      
      // Use requestAnimationFrame to avoid render-time setState in parent
      requestAnimationFrame(() => {
        stableOnProcessingFilesChange.current(processingArray);
      });
    }
  }, [processingFiles]);

  const VISIBLE_ITEMS = isCompact ? 4 : 5

  const files = Array.isArray(selectedFiles) ? selectedFiles : []
  const visibleFiles = isShowingAll ? files : files.slice(0, VISIBLE_ITEMS)
  const hasMoreFiles = files.length > VISIBLE_ITEMS
  const showDropdown = isSearchFocused && (searchQuery.length > 2 || isLoading)

  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch("/api/chat/sharepoint-search-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.files)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error("File search failed:", error)
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.length === 0) {
        setSearchResults([])
        setIsLoading(false)
        return
      }
      // Only search if the query has changed from the last search
      if (isSearchFocused && searchQuery !== lastSearchedQuery) {
        handleSearch(searchQuery)
        setLastSearchedQuery(searchQuery)
      }
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery, handleSearch, isSearchFocused, lastSearchedQuery])

  const handleSelectFile = async (file: FileSearchResult) => {
    console.log("handleSelectFile", file);
    
    const isAlreadySelected = selectedFiles.find((sf) => sf.url === file.url)
    if (isAlreadySelected) {
      onSelectedFilesChange(selectedFiles.filter((sf) => sf.url !== file.url))
      return;
    }

    // Add file to selection immediately to show loading state
    onSelectedFilesChange((prev: FileSearchResult[]) => [...prev, file])
    
    // If the file is from S3, fetch and process its content
    if (file.url.startsWith('s3://')) {
      console.log("Processing S3 file:", file.url);
      setProcessingFiles(prev => new Set(prev).add(file.url));
      
      try {
        const response = await fetch('/api/files/raw-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ s3Url: file.url }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.isPdf) {
            console.log('Converted PDF to markdown:', data.content);
          } else {
            console.log('Raw file content:', data.content);
          }
          
          // Update the file with the processed content
          onSelectedFilesChange((prev: FileSearchResult[]) => {
            return prev.map((sf: FileSearchResult) => 
              sf.url === file.url 
                ? { ...sf, content: data.content }
                : sf
            );
          });
        } else {
          console.error('Failed to fetch file content:', await response.text());
          // Remove the file if processing failed
          onSelectedFilesChange((prev: FileSearchResult[]) => prev.filter((sf: FileSearchResult) => sf.url !== file.url));
        }
      } catch (error) {
        console.error('Error fetching file content:', error);
        // Remove the file if processing failed
        onSelectedFilesChange((prev: FileSearchResult[]) => prev.filter((sf: FileSearchResult) => sf.url !== file.url));
      } finally {
        setProcessingFiles(prev => {
          const next = new Set(prev);
          next.delete(file.url);
          return next;
        });
      }
    }
  }

  const handleRemoveFile = (file: FileSearchResult) => {
    onSelectedFilesChange(selectedFiles.filter((sf) => sf.url !== file.url))
  }

  const handleOpenFile = async (url: string) => {
    try {
      const response = await fetch('/api/files/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Url: url }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.presignedUrl) {
          window.open(data.presignedUrl, "_blank", "noopener,noreferrer");
        }
      } else {
        console.error("Failed to get presigned URL");
      }
    } catch (error) {
      console.error("Error fetching presigned URL:", error);
    }
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true)
    // If we have results and the query hasn't changed, keep showing them
    if (searchQuery.length > 2 && searchResults.length > 0) {
      setIsLoading(false)
    }
  }
  const handleSearchBlur = () => setTimeout(() => {
    setIsSearchFocused(false)
    setSearchQuery("")
  }, 150)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const getContentHeight = () => {
    if (isLoading) return "280px"
    if (searchResults.length > 0) return `${Math.min(searchResults.length * 72, 400)}px`
    if (searchQuery.length > 2) return "140px"
    return "0px"
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: i * 0.06,
        type: "spring",
        stiffness: 260,
        damping: 20,
      },
    }),
    exit: { opacity: 0, y: -15, scale: 0.95, transition: { duration: 0.15 } },
  }

  return (
    <div className={cn("relative w-full", isCompact && "max-w-3xl mx-auto")}>
      {/* Selected Files Grid - Moved to top */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            className="relative z-10 mb-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
          >
            <motion.div
              className="flex items-center justify-between mb-1"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 180, damping: 22 }}
            >
              <div className="flex items-center gap-1">
                <h3 className="text-xs text-muted-foreground font-medium">
                  {selectedFiles.length} {selectedFiles.length === 1 ? "File" : "Files"}
                </h3>
              </div>

              {hasMoreFiles && (
                <Button
                  className="text-[10px] text-muted-foreground hover:text-foreground group px-1.5 py-0.5 h-auto bg-transparent hover:bg-transparent"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsShowingAll(!isShowingAll);
                  }}
                  type="button"
                >
                  {isShowingAll ? "Less" : `Show ${files.length} Files`}
                  <ChevronRight
                    className={cn(
                      "ml-0.5 transition-transform h-2.5 w-2.5",
                      isShowingAll ? "rotate-90" : "-rotate-90"
                    )}
                  />
                </Button>
              )}
            </motion.div>

            <motion.div
              layout
              className="flex flex-wrap gap-2 items-center"
            >
              <AnimatePresence>
                {visibleFiles.map((file, index) => {
                  const fileExtension = file.title.split(".").pop()?.toUpperCase() || "FILE"
                  
                  return (
                    <motion.div
                      key={file.url}
                      custom={index}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      layout="position"
                      className="group/card"
                    >
                      <motion.div
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1.5 transition-all duration-300 ease-in-out rounded-full",
                          "border border-border hover:border-primary/70 bg-background/100",
                          "hover:shadow-sm cursor-pointer"
                        )}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="relative flex-shrink-0">
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center",
                            getFileTypeColor(file.title),
                          )}>
                            <div className="scale-75">{getOriginalFileIcon(file.title)}</div>
                          </div>
                          
                          {processingFiles.has(file.url) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-full">
                              <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            </div>
                          )}
                        </div>
                        
                        <span className="text-xs font-medium truncate max-w-[120px]" title={file.title}>
                          {file.title}
                        </span>
                        
                        <span className="text-[10px] text-muted-foreground font-mono uppercase">
                          {fileExtension}
                        </span>
                        
                        <div className="flex items-center gap-0.5 ml-0.5">
                          <Button
                            type="button"
                            className="h-4 w-4 rounded-full hover:bg-background hover:text-primary p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenFile(file.url)
                            }}
                            aria-label="Open file"
                          >
                            <ExternalLink className="h-3 w-3 " />
                          </Button>
                          <Button
                            type="button"
                            className="h-4 w-4 rounded-full hover:bg-background hover:text-destructive p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveFile(file)
                            }}
                            aria-label="Remove file"
                          >
                            <XIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Container */}
      <motion.div
        ref={searchContainerRef}
        className={cn(
          "relative group will-change-transform z-50",
          isCompact ? "max-w-full" : "max-w-[50%] mx-auto"
        )}
        whileHover={isCompact ? undefined : { scale: 1.01 }}
        transition={{ type: "spring", stiffness: 400, damping: 25, mass: 0.2 }}
      >
        <motion.div
          className={cn(
            "relative bg-background/90 backdrop-blur-sm border transition-all duration-300 overflow-hidden",
            "rounded-[14px]",
            "shadow-[0_2px_4px_rgba(0,0,0,0.02)]",
            isSearchFocused 
              ? "border-orange-500/30 ring-1 ring-orange-500/20 bg-background/95 shadow-[0_4px_12px_rgba(0,0,0,0.05)]" 
              : "border-border/70 hover:border-border/90 hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)]",
          )}
          layout
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Search results - appear on top */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{
                  height: getContentHeight(),
                  opacity: 1,
                  transition: { height: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } },
                }}
                exit={{
                  height: 0,
                  opacity: 0,
                  transition: { height: { duration: 0.2, ease: "easeInOut" }, opacity: { duration: 0.1 } },
                }}
                className="overflow-hidden border-b border-border/30"
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className="max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                  {isLoading ? (
                    <motion.div className="p-2 space-y-1">
                      {[...Array(5)].map((_, index) => (
                        <div key={`skeleton-${index}`} className="group relative p-3 flex items-center gap-3 text-sm">
                          <div className="relative flex-shrink-0">
                            <div className="w-8 h-8 rounded-xl bg-foreground/[0.08] animate-pulse flex items-center justify-center">
                              <div className="w-4 h-4 rounded-md bg-foreground/[0.12]" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="h-4 bg-foreground/[0.08] rounded-md animate-pulse w-[180px]" />
                            <div className="h-3 bg-foreground/[0.06] rounded-md animate-pulse w-[240px]" />
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  ) : searchResults.length > 0 ? (
                    <motion.div className="p-2 space-y-1">
                      {searchResults.map((file, index) => {
                        const isSelected = selectedFiles.some((sf) => sf.url === file.url)
                        return (
                          <motion.div
                            key={file.url}
                            className={cn(
                              "group relative p-3 cursor-pointer flex items-center gap-3 text-sm rounded-[10px] transition-all duration-200",
                              "hover:bg-accent/30 hover:shadow-md hover:shadow-primary/5",
                              "active:scale-98",
                              isSelected && "bg-primary/5 shadow-sm shadow-primary/10",
                            )}
                            onClick={() => handleSelectFile(file)}
                            onMouseDown={(e) => e.preventDefault()}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 20,
                              mass: 0.1,
                              delay: 0.05 * index,
                            }}
                          >
                            <motion.div
                              className="relative"
                              whileHover={{ scale: 1.05 }}
                              transition={{ type: "spring", stiffness: 400, damping: 10 }}
                            >
                              <div
                                className={cn(
                                  "w-8 h-8 rounded-xl flex items-center justify-center group bg-gradient-to-br",
                                  getFileTypeColor(file.title),
                                )}
                              >
                                {getOriginalFileIcon(file.title)}
                              </div>
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0, rotate: -90 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  className="absolute -top-1 -right-1 bg-primary rounded-full w-4 h-4 flex items-center justify-center shadow-sm"
                                >
                                  <Check className="h-2.5 w-2.5 text-primary-foreground" />
                                </motion.div>
                              )}
                            </motion.div>
                            <div className="flex-1 min-w-0">
                              <div className="truncate font-medium">{file.title}</div>
                              <div className="text-xs text-muted-foreground truncate mt-0.5">
                                {file.content.slice(0, 50)}...
                              </div>
                            </div>
                            <motion.div
                              className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              initial={false}
                              animate={{ x: isSelected ? 0 : 10 }}
                              transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            >
                              <div
                                className={cn(
                                  "text-xs font-medium px-2 py-1 rounded-full transition-colors",
                                  isSelected ? "bg-primary/10 text-primary" : "bg-accent/50 text-muted-foreground",
                                )}
                              >
                                {isSelected ? "Selected" : "Select"}
                              </div>
                            </motion.div>
                          </motion.div>
                        )
                      })}
                    </motion.div>
                  ) : searchQuery.length > 2 ? (
                    <motion.div
                      className="p-6 text-center text-sm text-muted-foreground"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No files found.
                    </motion.div>
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Search input - at the bottom */}
          <div className="relative p-3">
            <motion.div
              className={cn(
                "absolute left-3 flex items-center transition-all duration-300 z-10",
                isSearchFocused ? "text-primary" : "text-muted-foreground",
                isCompact ? "h-6" : "h-6",
              )}
              animate={isSearchFocused ? { scale: 1.1, rotate: [0, 10, -10, 0] } : { scale: 1, rotate: 0 }}
              transition={{ duration: 0.3, scale: { type: "spring", stiffness: 400, damping: 25 } }}
            >
              <Search className="h-5 w-5" />
            </motion.div>
            <Input
              type="text"
              placeholder="Search and attach files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              className={cn(
                "w-full pl-8 pr-8 text-base transition-all duration-300 border-0",
                "bg-transparent will-change-transform min-h-[24px]",
                "placeholder:text-muted-foreground/60",
                "ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                isCompact ? "h-auto text-sm py-0" : "h-auto py-0",
              )}
            />
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  className="absolute right-3 flex items-center transition-all duration-300 z-10 top-1/3"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  key="loader"
                >
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </motion.div>
              ) : searchQuery ? (
                <motion.div
                  className="absolute right-3 flex items-center transition-all duration-300 z-10 top-1/3"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  key="sparkles"
                >
                  <Sparkles className="h-5 w-5 text-primary/60 animate-pulse" />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

// Export a memoized version of the component
export const FileSearch = memo(FileSearchComponent);