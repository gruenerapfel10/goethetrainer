import React from 'react';
import { Button } from '@/components/ui/button';
import { Eye, ArrowUpDown, ChevronDown, Loader2, Database } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CSVTable {
  tableName: string;
  rowCount: number;
  lastUpdated: string;
}

interface CSVTableProps {
  tables: CSVTable[];
  sortField: 'tableName' | 'rowCount' | 'lastUpdated';
  sortDirection: 'asc' | 'desc';
  onSort: (field: 'tableName' | 'rowCount' | 'lastUpdated') => void;
  expandedTables: Set<string>;
  onToggleExpand: (tableName: string) => void;
  isLoading: boolean;
  renderExpandedContent: (table: CSVTable) => React.ReactNode;
}

export default function CSVTableComponent({
  tables,
  sortField,
  sortDirection,
  onSort,
  expandedTables,
  onToggleExpand,
  isLoading,
  renderExpandedContent
}: CSVTableProps) {
  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-2 opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUpDown className="h-4 w-4 ml-2" /> : <ArrowUpDown className="h-4 w-4 ml-2 transform rotate-180" />;
  };

  const HeaderCell = ({ field, label, icon: Icon }: { field: typeof sortField; label: string; icon?: React.ElementType }) => (
    <div
      className="flex-1 px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80 flex items-center"
      onClick={() => onSort(field)}
    >
      {Icon && <Icon className="h-4 w-4 mr-2 opacity-70" />}
      {label}
      {getSortIcon(field)}
    </div>
  );

  if (isLoading) {
    return (
      <div className="border rounded-lg p-8 flex justify-center items-center min-h-[200px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading tables...</p>
        </div>
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground min-h-[200px] flex flex-col justify-center items-center">
        <Database className="h-10 w-10 mb-3 text-muted-foreground/50" />
        <p>No CSV tables found.</p>
        <p className="text-xs">Upload a CSV file to create a new table.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-muted/50 flex">
        <HeaderCell field="tableName" label="Table Name" icon={Database} />
        <HeaderCell field="rowCount" label="Rows" />
        <HeaderCell field="lastUpdated" label="Last Updated" />
        <div className="w-[150px] px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Actions
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {tables.map((table) => (
          <div key={table.tableName}>
            {/* Row Content */}
            <div className="flex items-center hover:bg-muted/50 transition-colors">
              <div className="flex-1 px-4 py-3 text-sm font-medium text-foreground flex items-center">
                <Database className="h-4 w-4 mr-2 text-primary/70 flex-shrink-0" />
                <span className="truncate" title={table.tableName}>{table.tableName}</span>
              </div>
              <div className="flex-1 px-4 py-3 text-sm text-muted-foreground">
                {table.rowCount}
              </div>
              <div className="flex-1 px-4 py-3 text-sm text-muted-foreground">
                {new Date(table.lastUpdated).toLocaleString()}
              </div>
              <div className="w-[150px] px-4 py-3">
                <Collapsible open={expandedTables.has(table.tableName)} onOpenChange={() => onToggleExpand(table.tableName)}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 w-full justify-start">
                      <Eye className="h-4 w-4" />
                      View Data
                      <ChevronDown 
                        className={`h-4 w-4 ml-auto transition-transform duration-200 ${
                          expandedTables.has(table.tableName) ? 'transform rotate-180' : ''
                        }`} 
                      />
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              </div>
            </div>

            {/* Expanded Content */}
            <Collapsible open={expandedTables.has(table.tableName)}>
              <CollapsibleContent>
                {renderExpandedContent(table)}
              </CollapsibleContent>
            </Collapsible>
          </div>
        ))}
      </div>
    </div>
  );
} 