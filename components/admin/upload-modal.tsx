"use client"

import type React from "react"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, X, FileText, Trash2, AlertCircle, FileUp, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface StagedFile {
  id: string
  file: File
  proposedTableName: string
  error?: string
}

interface CSVUploadModalProps {
  maxFileSize?: number // in bytes
  onFilesUploaded?: (results: Array<{ tableName: string; fileName: string }>) => void
  buttonLabel?: string
  buttonVariant?: "default" | "outline" | "secondary" | "ghost"
  buttonSize?: "default" | "sm" | "lg" | "icon"
  buttonClassName?: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  stagedFiles: StagedFile[]
  isUploading: boolean
  uploadProgress: number
  onFileSelection: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveStagedFile: (id: string) => void
  onUpdateProposedTableName: (id: string, newName: string) => void
  onUploadCSV: () => void
  onCloseDialog: () => void
  validFilesForUploadCount: number
  formatFileSize: (sizeInBytes: number) => string
}

export default function CSVUploadModal({
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  onFilesUploaded,
  buttonLabel = "Upload CSV Files",
  buttonVariant = "default",
  buttonSize = "default",
  buttonClassName = "",
  isOpen,
  onOpenChange,
  stagedFiles,
  isUploading,
  uploadProgress,
  onFileSelection,
  onRemoveStagedFile,
  onUpdateProposedTableName,
  onUploadCSV,
  onCloseDialog,
  validFilesForUploadCount,
  formatFileSize,
}: CSVUploadModalProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files?.length) {
      // Create a synthetic event that matches the expected ChangeEvent type
      const syntheticEvent = {
        target: {
          files: e.dataTransfer.files,
          value: ""
        }
      } as React.ChangeEvent<HTMLInputElement>
      
      onFileSelection(syntheticEvent)
    }
  }

  const handleUploadClick = () => {
    setConfirmDialogOpen(true)
  }

  const handleConfirmUpload = () => {
    setConfirmDialogOpen(false)
    onUploadCSV()
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !isUploading && onOpenChange(open)}>
        <DialogTrigger asChild>
          <Button
            variant={buttonVariant}
            size={buttonSize}
            className={cn("gap-2", buttonClassName)}
            onClick={() => onOpenChange(true)}
          >
            <FileUp className="h-4 w-4" />
            {buttonLabel}
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden bg-muted/20 border rounded-xl">
          <DialogHeader className="p-4 pb-3 border-b bg-background">
            <DialogTitle className="flex items-center gap-2 text-lg font-medium">
              <Upload className="h-5 w-5 text-primary" />
              Upload CSV Files
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8 rounded-full"
              onClick={onCloseDialog}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogHeader>

          <div className="p-4 max-h-[calc(80vh-8rem)] overflow-y-auto space-y-4 bg-background">
            {/* File List */}
            <AnimatePresence>
              {stagedFiles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Selected Files ({stagedFiles.length})</h3>
                    {!isUploading && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => document.getElementById("csv-file-input")?.click()}
                      >
                        <Upload className="h-3 w-3" />
                        Add More
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                    {stagedFiles.map((sf) => (
                      <motion.div
                        key={sf.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "p-3 rounded-md border",
                          sf.error ? "border-destructive/50 bg-destructive/5" : "border-border bg-background",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {/* File Icon */}
                          <div
                            className={cn(
                              "p-1.5 rounded-md flex-shrink-0",
                              sf.error ? "bg-destructive/10" : "bg-primary/10",
                            )}
                          >
                            <FileText className={cn("h-4 w-4", sf.error ? "text-destructive" : "text-primary")} />
                          </div>

                          {/* File Info */}
                          <div className="min-w-0 flex-shrink-0 w-[120px]">
                            <p className="text-sm font-medium truncate" title={sf.file.name}>
                              {sf.file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(sf.file.size)}</p>
                          </div>

                          {/* Table Name Input */}
                          <div className="flex-1 min-w-0">
                            {!sf.error && (
                              <div className="space-y-1">
                                <label htmlFor={`tableName-${sf.id}`} className="text-xs font-medium block">
                                  Table Name:
                                </label>
                                <Input
                                  id={`tableName-${sf.id}`}
                                  value={sf.proposedTableName}
                                  onChange={(e) => onUpdateProposedTableName(sf.id, e.target.value)}
                                  placeholder="Enter table name"
                                  className={cn(
                                    "h-8 text-sm",
                                    !sf.proposedTableName.trim() && "border-orange-400 focus-visible:ring-orange-400",
                                  )}
                                  disabled={isUploading}
                                />
                              </div>
                            )}

                            {/* Error Message */}
                            {sf.error ? (
                              <div className="flex items-center gap-1.5 text-xs text-destructive">
                                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>{sf.error}</span>
                              </div>
                            ) : (
                              !sf.proposedTableName.trim() && (
                                <p className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Table name is required
                                </p>
                              )
                            )}
                          </div>

                          {/* Delete Button */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-full flex-shrink-0"
                                  onClick={() => onRemoveStagedFile(sf.id)}
                                  disabled={isUploading}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Remove file</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Drag & Drop Area - Only show when no files are selected */}
            {stagedFiles.length === 0 && (
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer",
                  isDragging
                    ? "border-primary bg-primary/5 scale-[0.99]"
                    : "border-muted-foreground/30 hover:border-primary/50 bg-muted/10",
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <label htmlFor="csv-file-input" className="block w-full h-full cursor-pointer">
                  <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                    <motion.div
                      initial={{ scale: 1 }}
                      animate={{ scale: isDragging ? 1.1 : 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <Upload className="h-10 w-10 text-primary/70 mb-2" />
                    </motion.div>
                    <p className="font-medium text-sm">
                      {isDragging ? "Drop files here" : "Drag & drop files or click to browse"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      CSV files only, up to {formatFileSize(maxFileSize)} each
                    </p>
                  </div>
                </label>
              </div>
            )}

            <Input
              id="csv-file-input"
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              multiple
              onChange={onFileSelection}
              className="sr-only"
              disabled={isUploading}
            />

            {/* Upload Progress */}
            <AnimatePresence>
              {isUploading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {uploadProgress < 10 && "Preparing files..."}
                      {uploadProgress >= 10 && uploadProgress < 90 && "Processing data..."}
                      {uploadProgress >= 90 && "Finalizing..."}
                    </span>
                    <span className="text-primary font-medium">{Math.round(uploadProgress)}%</span>
                  </div>
                  
                  <Progress value={uploadProgress} className="h-2.5" />
                  
                  <div className="bg-muted/20 rounded-md p-3 border text-xs">
                    <p className="font-medium mb-1 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                      This process might take several minutes for large files
                    </p>
                    <ul className="space-y-1 pl-5 text-muted-foreground">
                      <li className="list-disc">Processing {validFilesForUploadCount} files with potentially many rows</li>
                      <li className="list-disc">Analyzing data types and structure</li>
                      <li className="list-disc">Creating database tables</li>
                      <li className="list-disc">Do not close this window</li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-background flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {validFilesForUploadCount > 0
                ? `${validFilesForUploadCount} file(s) ready to upload`
                : stagedFiles.length > 0
                  ? "Fix errors to continue"
                  : "Select files to begin"}
            </p>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onCloseDialog} disabled={isUploading}>
                Cancel
              </Button>

              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleUploadClick}
                disabled={isUploading || validFilesForUploadCount === 0}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload {validFilesForUploadCount > 0 ? `(${validFilesForUploadCount})` : ""}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Replace Existing Knowledge Base
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-2">
                Uploading these files will <strong>delete all your existing tables</strong> and replace them with only these new files.
              </p>
              <p>
                This action cannot be undone. Are you sure you want to continue?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmUpload}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Yes, Replace Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
