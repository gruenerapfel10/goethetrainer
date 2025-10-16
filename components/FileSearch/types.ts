export interface FileSearchResult {
  title: string
  url: string
  content?: string
  thumbnailUrl?: string
  mediaType?: string
  metadata?: {
    isPdf?: boolean
    contentLength?: number
    isImage?: boolean
    verified?: boolean
    contentEmbedded?: boolean
    [key: string]: any
  }
}

export interface FileSearchProps {
  isCompact?: boolean
  isCollapsed?: boolean
}

export interface FileItemProps {
  file: FileSearchResult
  index: number
  isShowingAll: boolean
  isSelected: boolean
  isProcessing: boolean
  onSelect: (file: FileSearchResult) => void
}