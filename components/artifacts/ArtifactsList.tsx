'use client';

import { FileText, Code, Image, Sheet as SheetIcon, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Response } from '@/components/ai-elements/response';
import type { ArtifactData } from '@/contexts/artifacts-context';

interface ArtifactsListProps {
  artifacts: ArtifactData[];
  onSelectArtifact: (documentId: string) => void;
}

export function ArtifactsList({ artifacts, onSelectArtifact }: ArtifactsListProps) {
  if (artifacts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>No artifacts in this chat</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h3 className="font-medium text-sm mb-4">Select an artifact</h3>
      <div className="grid gap-3">
        {artifacts.map((art) => {
          const getIcon = () => {
            switch(art.kind) {
              case 'image': return <Image className="w-4 h-4 text-muted-foreground" />;
              case 'code': return <Code className="w-4 h-4 text-muted-foreground" />;
              case 'sheet': return <SheetIcon className="w-4 h-4 text-muted-foreground" />;
              case 'webpage': return <Globe className="w-4 h-4 text-muted-foreground" />;
              default: return <FileText className="w-4 h-4 text-muted-foreground" />;
            }
          };
          
          const isImage = art.kind === 'image';
          
          return (
            <article
              key={art.documentId}
              onClick={() => onSelectArtifact(art.documentId)}
              className={cn(
                "group relative flex flex-col min-h-0",
                "bg-card hover:bg-accent/5",
                "border hover:border-border",
                "rounded-lg overflow-hidden",
                "cursor-pointer transition-all duration-200",
                "hover:shadow-md",
                "border-border/50"
              )}
            >
              <div className="flex-1 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                    {getIcon()}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                      {art.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground capitalize">
                        {art.kind}
                      </span>
                      {(art.versions?.length ?? 0) > 0 && (
                        <span className="text-xs text-blue-600 dark:text-blue-400">
                          {art.versions?.length} {art.versions?.length === 1 ? 'version' : 'versions'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {art.content && !isImage && (
                  <div className="text-xs prose prose-sm dark:prose-invert max-w-none">
                    <Response>
                      {art.content.length > 400 
                        ? art.content.substring(0, 400) + '...'
                        : art.content}
                    </Response>
                  </div>
                )}
                
                {isImage && (
                  <div className="p-3 bg-muted/30 rounded-md border border-border/30">
                    <div className="flex items-center justify-center h-24">
                      <div className="text-center">
                        <Image className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">
                          Image artifact
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Click to view
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-muted-foreground">
                    Ready
                  </span>
                </div>
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </article>
          );
        })}
      </div>
    </div>
  );
}
