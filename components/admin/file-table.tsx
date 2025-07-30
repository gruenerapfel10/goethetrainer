// components/admin/file-table.tsx
import React from 'react';
import { useTranslations } from 'next-intl';
import {
  FileIcon,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  Loader2,
  HelpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Archive,
  Eraser,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FileInfo {
  key: string;
  documentId: string;
  size: number;
  lastModified: string;
  sharePointUrl?: string | null;
  status?: string;
  isIngested?: boolean;
  fileName?: string;
}

type SortField = 'key' | 'size' | 'lastModified' | 'status';
type SortDirection = 'asc' | 'desc';

interface FileTableProps {
  files: FileInfo[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  selectedFiles: string[];
  setSelectedFiles: (documentIds: string[]) => void;
  onDeleteSingle: (documentId: string) => void;
  isLoading: boolean;
  isSystemBusy?: boolean; // New prop to disable actions during operations
}

export default function FileTable({
                                    files,
                                    sortField,
                                    sortDirection,
                                    onSort,
                                    selectedFiles,
                                    setSelectedFiles,
                                    onDeleteSingle,
                                    isLoading,
                                    isSystemBusy = false, // Default to false
                                  }: FileTableProps) {
  const t = useTranslations('files.columns');
  const tStatus = useTranslations('files.statusMappings');
  const tLocale = useTranslations(); // For accessing 'locale' if defined at root

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  const toggleSelectAll = () => {
    if (files.length > 0 && selectedFiles.length === files.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(files.map((file) => file.documentId));
    }
  };

  const toggleSelectFile = (documentId: string) => {
    if (selectedFiles.includes(documentId)) {
      setSelectedFiles(selectedFiles.filter((id) => id !== documentId));
    } else {
      setSelectedFiles([...selectedFiles, documentId]);
    }
  };

  const formatFileSize = (sizeInBytes: number) => {
    if (sizeInBytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(sizeInBytes) / Math.log(1024));
    return `${(sizeInBytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="outline" className="text-xs px-2 py-0.5"><HelpCircle className="h-3 w-3 mr-1"/>{tStatus('unknown') || 'Unknown'}</Badge>;

    let variant: 'default' | 'destructive' | 'success' | 'secondary' | 'outline' = 'outline';
    let IconComponent: React.ElementType = HelpCircle;
    let statusText = status;
    let animateSpin = false;

    switch (status.toUpperCase()) {
      case 'NEW': variant = 'outline'; statusText = tStatus('new') ||'New'; IconComponent = FileIcon; break;
      case 'SYNCED_FROM_SHAREPOINT': variant = 'secondary'; statusText = tStatus('synced') || 'Synced'; IconComponent = Clock; break;
      case 'UPLOADED_TO_S3': variant = 'secondary'; statusText = tStatus('uploaded') || 'Uploaded'; IconComponent = Clock; break;
      case 'METADATA_STORED': variant = 'secondary'; statusText = tStatus('metadataStored') || 'Meta Stored'; IconComponent = Clock; break;
      case 'PENDING_INGESTION': variant = 'secondary'; statusText = tStatus('pendingIngestion') || 'Pending'; IconComponent = Clock; break;
      case 'INGESTION_IN_PROGRESS': variant = 'secondary'; statusText = tStatus('ingestionInProgress') || 'Ingesting'; IconComponent = Loader2; animateSpin = true; break;
      case 'BEDROCK_PROCESSING': variant = 'secondary'; statusText = tStatus('bedrockProcessing') || 'Processing'; IconComponent = Loader2; animateSpin = true; break;
      case 'INDEXED': variant = 'success'; statusText = tStatus('indexed') || 'Indexed'; IconComponent = CheckCircle2; break;
      case 'FAILED_INGESTION': variant = 'destructive'; statusText = tStatus('failedIngestion') || 'Failed'; IconComponent = XCircle; break;
      case 'PENDING_DELETION': variant = 'destructive'; statusText = tStatus('pendingDeletion') || 'Deleting'; IconComponent = Trash2; break;
      case 'DELETED': variant = 'outline'; statusText = tStatus('deleted') || 'Deleted'; IconComponent = Eraser; break;
      case 'ARCHIVED': variant = 'outline'; statusText = tStatus('archived') || 'Archived'; IconComponent = Archive; break;
      default: // @ts-ignore
        statusText = tStatus(status.toLowerCase(), {}, status); IconComponent = HelpCircle; break;
    }

    const badgeInnerContent = (
      <>
        <IconComponent className={`h-3 w-3 mr-1 ${animateSpin ? 'animate-spin' : ''}`} />
        <span className="truncate">{statusText}</span>
      </>
    );

    const badgeElement = (
      <Badge variant={variant} className="max-w-full truncate flex items-center text-xs px-2 py-0.5 leading-tight">
        {badgeInnerContent}
      </Badge>
    );

    const tooltipTextKey = `${status.toLowerCase()}_tooltip`;
    // Fallback to statusText if tooltip key not found OR if the specific status text is generic enough.
    const defaultTooltipText = statusText.length > 12 ? statusText : ''; // Only show tooltip for long text by default
    // @ts-ignore
    const tooltipText = tStatus(tooltipTextKey, {}, defaultTooltipText);

    if (tooltipText || status.toUpperCase() === 'FAILED_INGESTION') { // Always show tooltip for failed ingestion or if text is defined
      return (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>{badgeElement}</TooltipTrigger>
            <TooltipContent><p>{tooltipText || statusText}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return badgeElement;
  };

  const renderLoadingIndicator = () => (
    <div className="p-8 text-center col-span-full">
      <div className="flex flex-col items-center justify-center animate-in fade-in">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-base font-medium text-muted-foreground">
          {t('loading') || 'Loading files...'}
        </p>
      </div>
    </div>
  );

  const renderNoFilesRow = () => (
    <div className="p-6 text-center text-muted-foreground col-span-full">
      {t('noFiles') || 'No files found'}
    </div>
  );

  const gridColsClass = "grid-cols-[40px,minmax(250px,2fr),100px,110px,minmax(140px,1fr),80px]";

  // Determine if actions should be disabled
  const actionsDisabled = isLoading || isSystemBusy;

  return (
    <div className="bg-background rounded-lg border border-input overflow-x-auto relative">
      <div className={`min-w-[800px]`}>
        {/* Header Row */}
        <div className={`grid ${gridColsClass} gap-2 p-3 border-b border-input text-xs font-medium text-muted-foreground tracking-wider`}>
          <div className="flex items-center justify-center">
            <Checkbox
              checked={files.length > 0 && selectedFiles.length === files.length && files.length > 0}
              onCheckedChange={toggleSelectAll}
              aria-label={t('selectAll') || "Select all files"}
              disabled={actionsDisabled || files.length === 0}
            />
          </div>
          <Button variant="ghost" size="sm" className="justify-start p-0 h-auto hover:bg-transparent font-medium text-muted-foreground hover:text-foreground" onClick={() => onSort('key')}>
            {t('name')} {getSortIcon('key')}
          </Button>
          <Button variant="ghost" size="sm" className="justify-end p-0 h-auto hover:bg-transparent font-medium text-muted-foreground hover:text-foreground w-full" onClick={() => onSort('size')}>
            {t('size')} {getSortIcon('size')}
          </Button>
          <Button variant="ghost" size="sm" className="justify-end p-0 h-auto hover:bg-transparent font-medium text-muted-foreground hover:text-foreground w-full" onClick={() => onSort('lastModified')}>
            {t('date')} {getSortIcon('lastModified')}
          </Button>
          <Button variant="ghost" size="sm" className="justify-center p-0 h-auto hover:bg-transparent font-medium text-muted-foreground hover:text-foreground w-full" onClick={() => onSort('status')}>
            {t('status')} {getSortIcon('status')}
          </Button>
          <div className="flex items-center justify-end pr-2">
            {t('actions')}
          </div>
        </div>

        {/* Body Rows */}
        <div className="divide-y divide-border relative">
          {(isLoading && files.length === 0) ? (
            renderLoadingIndicator()
          ) : (!isLoading && files.length === 0) ? (
            renderNoFilesRow()
          ) : (
            files.map((file) => (
              <div key={file.documentId} className={`grid ${gridColsClass} gap-2 p-3 text-sm items-center hover:bg-muted/30 transition-colors}`}>
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={selectedFiles.includes(file.documentId)}
                    onCheckedChange={() => toggleSelectFile(file.documentId)}
                    aria-label={t('selectFile', { name: file.key }) || `Select ${file.key}`}
                    disabled={actionsDisabled}
                  />
                </div>
                <div className="flex items-center gap-2 min-w-0 text-foreground">
                  <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate" title={file.key}>{file.fileName}</span>
                </div>
                <div className="text-muted-foreground text-right">{formatFileSize(file.size)}</div>
                <div className="text-muted-foreground text-right">
                  {new Date(file.lastModified).toLocaleDateString(tLocale('locale') || undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
                <div className="flex items-center justify-center">
                  {getStatusBadge(file.status)}
                </div>
                <div className="flex justify-end items-center gap-1 pr-1">
                  {file.sharePointUrl && (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-500" asChild>
                            <a href={file.sharePointUrl} target="_blank" rel="noopener noreferrer" aria-label={t('viewOnSharePointTooltip') || "View on SharePoint"}>
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>{t('viewOnSharePointTooltip') || "View on SharePoint"}</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 text-destructive hover:text-destructive/80 ${actionsDisabled ? 'cursor-not-allowed' : ''}`}
                          onClick={() => onDeleteSingle(file.documentId)}
                          disabled={actionsDisabled}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {actionsDisabled && isSystemBusy ?
                            (t('tooltips.disabledDuringOperation') || "Disabled during operation") :
                            (t('deleteFileTooltip') || "Delete file")
                          }
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* System Busy Overlay - positioned outside the scrollable area */}
      {/*{isSystemBusy && files.length > 0 && (*/}
      {/*  <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center pointer-events-none rounded-lg">*/}
      {/*    <div className="bg-card/95 border rounded-lg p-3 shadow-lg">*/}
      {/*      <div className="flex items-center gap-2 text-sm text-muted-foreground">*/}
      {/*        <Loader2 className="h-4 w-4 animate-spin"/>*/}
      {/*        <span>{t('status.tableDisabledDuringOperation') || 'Actions disabled during operation'}</span>*/}
      {/*      </div>*/}
      {/*    </div>*/}
      {/*  </div>*/}
      {/*)}*/}
    </div>
  );
}