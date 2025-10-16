'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Download } from 'lucide-react';
import type { ArtifactData } from '@/contexts/artifacts-context';

interface CsvArtifactProps {
  artifact: ArtifactData;
}

export function CsvArtifact({ artifact }: CsvArtifactProps) {
  const [csvData, setCsvData] = useState<string[][] | null>(null);
  const [loading, setLoading] = useState(true);
  const s3Url = artifact.content;

  useEffect(() => {
    const loadCsv = async () => {
      try {
        const response = await fetch(`/api/s3/preview?url=${encodeURIComponent(s3Url)}`);
        if (!response.ok) throw new Error('Failed to load CSV');
        
        const text = await response.text();
        const rows = text.split('\n').map(row => 
          row.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
        );
        setCsvData(rows.filter(row => row.some(cell => cell)));
      } catch (error) {
        console.error('CSV load error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCsv();
  }, [s3Url]);

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/s3/download?url=${encodeURIComponent(s3Url)}`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = artifact.title;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  return (
    <div className="w-full h-full bg-background relative flex flex-col">
      <div className="flex items-center justify-between gap-2 p-3 border-b border-border bg-muted/30">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{artifact.title}</p>
          <p className="text-xs text-muted-foreground">CSV File</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleDownload}
            className="p-2 rounded-md hover:bg-accent transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <a
            href={`/api/s3/preview?url=${encodeURIComponent(s3Url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-md hover:bg-accent transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : csvData ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-border">
              <thead>
                {csvData[0] && (
                  <tr className="bg-muted">
                    {csvData[0].map((header, i) => (
                      <th key={i} className="border border-border px-4 py-2 text-left text-sm font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody>
                {csvData.slice(1).map((row, i) => (
                  <tr key={i} className="hover:bg-muted/50">
                    {row.map((cell, j) => (
                      <td key={j} className="border border-border px-4 py-2 text-sm">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Failed to load CSV</p>
          </div>
        )}
      </div>
    </div>
  );
}
