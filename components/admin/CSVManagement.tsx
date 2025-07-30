'use client';

import React, { useState, useEffect, } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Database, RefreshCw, Search, Info, } from 'lucide-react';
import { toast } from 'sonner';
import CSVTableComponent from '@/components/admin/csv-table';
import UploadModal from '@/components/admin/upload-modal';

interface CSVTable {
  tableName: string;
  actualTableName?: string;
  rowCount: number;
  lastUpdated: string;
}

interface TableColumn {
  columnName: string;
  dataType: string;
}

interface StagedFile {
  id: string;
  file: File;
  proposedTableName: string;
  error?: string;
}

// Constants for validations
const MAX_FILE_SIZE = 1000 * 1024 * 1024; // 1000MB
const SUPPORTED_FILE_TYPES = ['text/csv', 'application/vnd.ms-excel'];

// Add interface for table results
interface TableResult {
  tableName: string;
  actualTableName: string;
  rowCount: number;
  sourceFiles: string[];
  merged: boolean;
  columns: number;
}

export default function CSVManagement() {
  const t = useTranslations('chat');
  
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [tables, setTables] = useState<CSVTable[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableColumns, setTableColumns] = useState<TableColumn[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [isLoadingTableData, setIsLoadingTableData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Sorting state
  type SortField = 'tableName' | 'rowCount' | 'lastUpdated';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('lastUpdated');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setIsLoadingTables(true);
    try {
      const response = await fetch('/api/csv/tables');
      if (response.ok) {
        const data = await response.json();
        setTables(data.tables || []);
      } else {
        toast.error(t('csvFailedToFetchTables'));
        setTables([]);
      }
    } catch (error) {
      console.error("Error fetching tables:", error);
      toast.error(t('csvUnexpectedErrorFetchingTables'));
      setTables([]);
    } finally {
      setIsLoadingTables(false);
    }
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: StagedFile[] = Array.from(e.target.files).map((file, index) => {
        let error = '';
        if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
          error = t('csvErrorInvalidFileType', { supportedTypes: SUPPORTED_FILE_TYPES.join(', ') });
        }
        if (file.size > MAX_FILE_SIZE) {
          error = t('csvErrorFileSizeExceeds', { maxSize: formatFileSize(MAX_FILE_SIZE) });
        }
        if (file.size === 0) {
          error = t('csvErrorFileEmpty');
        }
        const fileName = file.name.replace(/\.(csv|xls|xlsx)$/i, '');
        const proposedTableName = fileName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() || `table_${Date.now()}_${index}`;
        return {
          id: `${file.name}-${file.lastModified}-${file.size}-${Date.now()}-${index}`,
          file,
          proposedTableName,
          error: error || undefined,
        };
      });
      setStagedFiles(prev => {
        const prevIds = new Set(prev.map(f => f.id));
        const uniqueNewFiles = newFiles.filter(nf => !prevIds.has(nf.id));
        return [...prev, ...uniqueNewFiles];
      });
      e.target.value = '';
    }
  };

  const removeStagedFile = (id: string) => {
    setStagedFiles(files => files.filter(f => f.id !== id));
  };

  const updateProposedTableName = (id: string, newName: string) => {
    setStagedFiles(files => files.map(f => 
      f.id === id ? { ...f, proposedTableName: newName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() } : f
    ));
  };

  const uploadCSV = async () => {
    const filesToUpload = stagedFiles.filter(f => !f.error && f.proposedTableName.trim() !== '');
    if (filesToUpload.length === 0) {
      toast.error(t('csvErrorNoValidFiles'));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Show initial processing toast
      const processingToast = toast.loading('Preparing files for upload...');
      
      // First, delete all existing tables
      toast.loading('Clearing previous tables...', { id: processingToast });
      setUploadProgress(5);
      
      const deleteResponse = await fetch('/api/csv/delete-all', { method: 'DELETE' });
      
      if (!deleteResponse.ok) {
        const errorResult = await deleteResponse.json().catch(() => ({}));
        console.warn('Error deleting existing tables:', errorResult);
        toast.warning(t('csvWarningDeletionIssues'));
      }
      
      // Set progress to show we're starting the upload
      setUploadProgress(10);
      toast.loading('Uploading files...', { id: processingToast });

      // Now upload all files in a single request
      const formData = new FormData();
      
      // Add all files and their table names to a single request
      filesToUpload.forEach(stagedFile => {
        formData.append('file', stagedFile.file);
        formData.append('tableName', stagedFile.proposedTableName);
      });
      
      // Calculate total file size for progress tracking
      const totalSize = filesToUpload.reduce((sum, file) => sum + file.file.size, 0);
      const totalFiles = filesToUpload.length;
      const processedFiles = 0;
      
      // Update progress every second to provide feedback during long uploads
      const progressInterval = setInterval(() => {
        // Simulate progress between 10% and 90%
        if (uploadProgress < 90) {
          const newProgress = Math.min(uploadProgress + (1 + Math.random() * 2), 90);
          setUploadProgress(newProgress);
          toast.loading(`Processing ${processedFiles} of ${totalFiles} files... ${Math.round(newProgress)}%`, { id: processingToast });
        }
      }, 1000);
      
      try {
        const response = await fetch('/api/csv/upload', { 
          method: 'POST', 
          body: formData 
        });
        
        // Clear the progress interval
        clearInterval(progressInterval);
        
        if (response.ok) {
          setUploadProgress(100);
          toast.success('Upload complete!', { id: processingToast });
          
          const result = await response.json();
          
          // Count successful tables and merged tables
          const successCount = result.tables.length;
          const mergedCount = result.tables.filter((t: TableResult) => t.merged).length;
          
          // Display success message
          if (mergedCount > 0) {
            toast.success(t('csvSuccessFilesMerged', { 
              count: successCount, 
              mergedCount: mergedCount,
              originalCount: filesToUpload.length
            } as any));
          } else {
            toast.success(t('csvSuccessAllFilesUploaded', { count: successCount } as any));
          }
          
          // Show details for each table
          result.tables.forEach((table: TableResult) => {
            if (table.merged) {
              toast.info(t('csvInfoTableMerged', { 
                tableName: table.tableName,
                fileCount: table.sourceFiles.length,
                files: table.sourceFiles.join(', ')
              } as any));
            } else {
              toast.success(t('csvSuccessFileUpload', { 
                fileName: table.sourceFiles[0],
                tableName: table.tableName
              } as any));
            }
          });
          
          // Clear the staged files and close dialog
          setStagedFiles([]);
          setUploadDialogOpen(false);
        } else {
          setUploadProgress(0);
          toast.error('Upload failed', { id: processingToast });
          
          const errorResult = await response.json().catch(() => ({ message: t('csvErrorUnknownUploadError') }));
          toast.error(t('csvErrorUploadFailed', { message: errorResult.message }));
        }
      } catch (error) {
        clearInterval(progressInterval);
        setUploadProgress(0);
        toast.error('Network error', { id: processingToast });
        console.error(`Error uploading files:`, error);
        toast.error(t('csvErrorNetworkError'));
      }

      // Refresh the table list
      fetchTables();
    } catch (error) {
      console.error('Error during CSV upload process:', error);
      toast.error(t('csvErrorGeneralUploadProcess'));
    } finally {
      setIsUploading(false);
    }
  };

  const viewTable = async (tableNameToView: string) => {
    setSelectedTable(tableNameToView);
    setIsLoadingTableData(true);
    try {
      const structureResponse = await fetch(`/api/csv/structure?tableName=${tableNameToView}`);
      if (structureResponse.ok) {
        const structureData = await structureResponse.json();
        setTableColumns(structureData.columns || []);
      } else { setTableColumns([]); }

      const dataResponse = await fetch(`/api/csv/data?tableName=${tableNameToView}&limit=100`);
      if (dataResponse.ok) {
        const data = await dataResponse.json();
        setTableData(data.rows || []);
      } else { setTableData([]); }
    } catch (error) {
      console.error("Error fetching table data:", error);
      toast.error(t('csvErrorFailedToLoadTableData'));
      setTableColumns([]);
      setTableData([]);
    } finally {
      setIsLoadingTableData(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value.toLowerCase());
  };

  const handleSort = (field: SortField) => {
    setSortDirection(prevDirection => sortField === field ? (prevDirection === 'asc' ? 'desc' : 'asc') : 'asc');
    setSortField(field);
  };

  const toggleTableExpansion = (tableName: string) => {
    const newExpandedTables = new Set(expandedTables);
    if (newExpandedTables.has(tableName)) {
      newExpandedTables.delete(tableName);
    } else {
      newExpandedTables.add(tableName);
      viewTable(tableName);
    }
    setExpandedTables(newExpandedTables);
  };

  const formatFileSize = (sizeInBytes: number) => {
    if (sizeInBytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(sizeInBytes) / Math.log(1024));
    return `${(sizeInBytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  };
  
  const closeUploadDialog = () => {
    if (isUploading) return;
    setUploadDialogOpen(false);
    if (uploadDialogOpen) {
        setStagedFiles([]);
    }
    setUploadProgress(0);
  };

  const validFilesForUploadCount = stagedFiles.filter(f => !f.error && f.proposedTableName.trim() !== '').length;

  const filteredAndSortedTables = tables
    .filter(table => table.tableName.toLowerCase().includes(searchQuery))
    .sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      let comparison = 0;
      if (valA > valB) { comparison = 1; }
      else if (valA < valB) { comparison = -1; }
      return sortDirection === 'asc' ? comparison : comparison * -1;
    });

  return (
    <div className="flex h-full flex-wrap lg:flex-nowrap">
      <div className="w-full md:w-1/3 border-r border-input p-4 space-y-4">
        <h2 className="text-lg font-semibold">{t('csvTitle')}</h2>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>{t('csvAlertTitle')}</AlertTitle>
          <AlertDescription>
            {t('csvAlertDescription')}
          </AlertDescription>
        </Alert>

        <UploadModal 
          isOpen={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          stagedFiles={stagedFiles}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          onFileSelection={handleFileSelection}
          onRemoveStagedFile={removeStagedFile}
          onUpdateProposedTableName={updateProposedTableName}
          onUploadCSV={uploadCSV}
          onCloseDialog={closeUploadDialog}
          validFilesForUploadCount={validFilesForUploadCount}
          maxFileSize={MAX_FILE_SIZE}
          formatFileSize={formatFileSize}
        />
      </div>

      <div className="flex-1 p-4 overflow-hidden lg:overflow-auto">
        <div className="space-y-4">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold flex items-center">
                <Database className="h-5 w-5 mr-2 text-primary"/> {t('csvDatabaseTablesTitle')}
              </h2>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('csvSearchPlaceholder')}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="h-9 pl-8 w-full sm:w-64"
                />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTables()}
              disabled={isLoadingTables}
            >
              {isLoadingTables ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              {t('csvRefreshTablesButton')}
            </Button>
          </div>

          <CSVTableComponent
            tables={filteredAndSortedTables}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            expandedTables={expandedTables}
            onToggleExpand={toggleTableExpansion}
            isLoading={isLoadingTables}
            renderExpandedContent={(table) => (
              <div className="border-t p-4 bg-muted/30">
                {isLoadingTableData && selectedTable === table.tableName ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[500px]">
                    {tableData.length === 0 && tableColumns.length === 0 && selectedTable === table.tableName && (
                      <div className="text-center py-4 text-muted-foreground">
                        {t('csvErrorCouldNotLoadTableData')}
                      </div>
                    )}
                    {tableData.length === 0 && tableColumns.length > 0 && selectedTable === table.tableName && (
                      <div className="text-center py-4 text-muted-foreground">
                        {t('csvNoDataFoundInTable')}
                      </div>
                    )}
                    {tableData.length > 0 && selectedTable === table.tableName && (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-muted sticky top-0">
                                {tableColumns.map((column) => (
                                  <th key={column.columnName} className="border px-4 py-2 text-left text-sm font-medium whitespace-nowrap">
                                    {column.columnName}
                                    <span className="text-xs text-muted-foreground ml-1">
                                      ({column.dataType})
                                    </span>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {tableData.map((row, rowIndex) => (
                                <tr key={rowIndex} className="border-b hover:bg-muted/50">
                                  {tableColumns.map((column) => (
                                    <td key={`${rowIndex}-${column.columnName}`} className="border px-4 py-2 text-sm">
                                      {row[column.columnName] !== null && row[column.columnName] !== undefined ? String(row[column.columnName]) : <span className="italic text-muted-foreground/70">NULL</span>}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {tableData.length >= 100 && (
                          <div className="text-center pt-2 pb-1 text-xs text-muted-foreground">
                            {t('csvShowingFirst100Rows')}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
} 