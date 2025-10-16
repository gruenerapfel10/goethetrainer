'use client';

import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Copy, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CheckCircleFillIcon } from '@/components/icons';
import { toast } from 'sonner';
import { useArtifactsContext } from '@/contexts/artifacts-context';
import { getArtifactFileExtension, getArtifactMimeType } from '@/lib/artifacts/artifact-registry';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ArtifactHeader() {
  const { activeArtifact, loadArtifact, setWorkingVersion } = useArtifactsContext();
  const t = useTranslations('artifacts');
  
  if (!activeArtifact) return null;
  
  const artifact = activeArtifact;
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(artifact.content).then(() => {
      toast.success(t('copiedToClipboard'));
    }).catch(() => {
      toast.error(t('copyFailed'));
    });
  }, [artifact.content, t]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([artifact.content], { type: getArtifactMimeType(artifact.kind as any) });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title}.${getArtifactFileExtension(artifact.kind as any)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('downloaded'));
  }, [artifact, t]);

  const handleExportDocx = useCallback(async () => {
    try {
      const response = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: artifact.content,
          title: artifact.title,
        }),
      });

      if (!response.ok) throw new Error('export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${artifact.title}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('exported as docx');
    } catch (error) {
      toast.error('export failed');
    }
  }, [artifact.content, artifact.title]);

  const handleVersionChange = useCallback(async (version: number) => {
    if (artifact.documentId) {
      await loadArtifact(artifact.documentId, version);
      toast.success(t('switchedToVersion', { version }));
    }
  }, [artifact.documentId, loadArtifact, t]);

  const handleSetWorkingVersion = useCallback(async () => {
    if (artifact.documentId && artifact.version) {
      await setWorkingVersion(artifact.documentId, artifact.version);
    }
  }, [artifact.documentId, artifact.version, setWorkingVersion]);

  const isCurrentVersionWorking = artifact.versions?.find(v => v.version === artifact.version)?.isWorkingVersion;
  const [open, setOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const isDocumentArtifact = artifact.kind === 'text';

  return (
    <div className="relative z-10 px-6 py-4 flex flex-row justify-between items-center border-b dark:border-zinc-800 border-gray-200 bg-white dark:bg-zinc-950">
      <div className="flex flex-row gap-3 items-center">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-lg">{artifact.title}</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-zinc-800 rounded-full">
              {artifact.status === 'streaming' ? t('streaming') : artifact.kind}
            </span>
            {artifact.versions && artifact.versions.length > 0 && (
              <>
                <DropdownMenu open={open} onOpenChange={setOpen}>
                  <DropdownMenuTrigger
                    asChild
                    className="w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground shrink-0"
                  >
                    <Button
                      variant="ghost"
                      className="h-8 px-3 gap-2 text-sm font-normal hover:bg-accent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    >
                      {t('version')} {artifact.version || 1}
                      <ChevronDown className="h-4 w-4 rotate-180" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    side="top"
                    className="border-border/30 rounded-xl bg-muted min-w-[280px]"
                    sideOffset={4}
                    alignOffset={0}
                  >
                    {artifact.versions.map((v) => (
                      <DropdownMenuItem
                        key={v.version}
                        onClick={() => {
                          setOpen(false);
                          handleVersionChange(v.version);
                        }}
                        className="gap-2 md:gap-4 group/item flex flex-row justify-between items-center hover:bg-accent data-[highlighted]:bg-accent focus:bg-accent transition-colors duration-200 cursor-pointer px-2 py-3"
                        data-active={artifact.version === v.version}
                      >
                        <div className="flex flex-row gap-3 items-start">
                          <div className="flex flex-col gap-1 items-start">
                            <div>{t('version')} {v.version}</div>
                            {v.isWorkingVersion && (
                              <div className="text-xs text-muted-foreground">{t('workingVersion')}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                          <CheckCircleFillIcon size={16} />
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  className="h-8 px-4 text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-border rounded-full transition-all duration-200 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-secondary/50"
                  onClick={handleSetWorkingVersion}
                  disabled={isCurrentVersionWorking}
                >
                  {isCurrentVersionWorking ? t('currentWorkingVersion') : t('setWorkingVersion')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 pr-2">
        {isDocumentArtifact ? (
          <DropdownMenu open={exportOpen} onOpenChange={setExportOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="h-9 px-3 gap-2 rounded-lg bg-primary hover:bg-primary/90 border border-primary/20 hover:border-primary/30 shadow-md hover:shadow-lg hover:shadow-primary/10 transition-all duration-300"
              >
                <Download className="w-4 h-4 text-primary-foreground" />
                <span className="text-sm text-primary-foreground">{t('export')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                {t('export')} as {getArtifactFileExtension(artifact.kind as any)}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportDocx}>
                <Download className="w-4 h-4 mr-2" />
                {t('export')} as .docx
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            onClick={handleDownload}
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
            title={t('download')}
          >
            <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </Button>
        )}
        <Button
          onClick={handleCopy}
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
          title={t('copyContent')}
        >
          <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </Button>
      </div>
    </div>
  );
}
