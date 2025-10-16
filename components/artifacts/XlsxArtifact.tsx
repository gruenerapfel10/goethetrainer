'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Download } from 'lucide-react';
import type { ArtifactData } from '@/contexts/artifacts-context';

interface XlsxArtifactProps {
  artifact: ArtifactData;
}

export function XlsxArtifact({ artifact }: XlsxArtifactProps) {
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const s3Url = artifact.content;

  useEffect(() => {
    const fetchPresignedUrl = async () => {
      try {
        const response = await fetch('/api/files/presigned-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ s3Url }),
        });

        if (!response.ok) throw new Error('Failed to get presigned URL');

        const data = await response.json();
        setPresignedUrl(data.presignedUrl);
      } catch (err) {
        console.error('Error fetching presigned URL:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPresignedUrl();
  }, [s3Url]);

  const handleDownload = async () => {
    try {
      if (!presignedUrl) return;
      
      const filename = artifact.title.endsWith('.xlsx') 
        ? artifact.title 
        : `${artifact.title}.xlsx`;
      
      // Fetch the file as a blob
      const response = await fetch(presignedUrl);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const officeViewerUrl = presignedUrl 
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(presignedUrl)}`
    : '';

  return (
    <div className="w-full h-full bg-background relative flex flex-col">
      <div className="flex items-center justify-between gap-2 p-3 border-b border-border bg-muted/30">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{artifact.title}</p>
          <p className="text-xs text-muted-foreground">Excel Spreadsheet</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleDownload}
            disabled={!presignedUrl}
            className="p-2 rounded-md hover:bg-accent transition-colors disabled:opacity-50"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          {presignedUrl && (
            <a
              href={presignedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-md hover:bg-accent transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : error || !presignedUrl ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Unable to preview spreadsheet</p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Download Spreadsheet
              </button>
            </div>
          </div>
        ) : (
          <iframe
            src={officeViewerUrl}
            className="w-full h-full border-0"
            title={artifact.title}
          />
        )}
      </div>
    </div>
  );
}
