'use client';

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, Check, AlertCircle } from 'lucide-react';
import { useLogo } from '../../../context/logo-context';

interface LogoImage {
  id: string;
  url: string;
  name: string;
  uploadedAt: number;
  isActive: boolean;
}

export default function LogoManagementSection() {
  const t = useTranslations('chatManagement');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const {
    state: { currentLogo, availableLogos, isLoading, defaultLogoUrl },
    setCurrentLogo,
    removeLogo,
    refreshLogos,
  } = useLogo();

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        toast.error(t('invalidFileType'));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('fileTooLarge'));
        return;
      }

      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    },
    [t],
  );

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files?.[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect],
  );

  // Upload file to the server and refresh the logos list
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/logos/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Upload failed');
      }

      await response.json();
      toast.success(t('uploadSuccess'));

      // Refresh logos after upload - this will just add the logo to available logos
      // without making it the current logo
      await refreshLogos();

      setSelectedFile(null);
      setPreview(null);

      const fileInput = document.getElementById(
        'logo-upload',
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('uploadError'));
    }
  }, [selectedFile, t, refreshLogos]);

  // Set the selected logo as the current logo
  const handleSetLogo = useCallback(
    (logo: LogoImage) => {
      setCurrentLogo({
        ...logo,
        isActive: true,
      });
      toast.success(t('logoSelected'));
    },
    [setCurrentLogo, t],
  );

  // Delete the specified logo
  const handleDeleteLogo = useCallback(
    async (logoId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await removeLogo(logoId);
        toast.success(t('imageDeleted'));
      } catch (error) {
        console.error('Delete error:', error);
        toast.error(t('deleteError'));
      }
    },
    [removeLogo, t],
  );

  // Determine what logo URL to display in the current logo section
  const displayLogoUrl = currentLogo?.url || defaultLogoUrl;
  const isDefaultLogo = currentLogo?.id === 'default' || !currentLogo;

  return (
    <Card className="w-full bg-card border-border shadow-sm">
      <CardHeader className="border-b border-border/30 pb-3">
        <CardTitle className="text-xl font-medium flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 7h5m5 0h10M2 12h10m5 0h5M2 17h5m5 0h10" />
          </svg>
          {t('logoManagement')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Upload Section with Drag & Drop */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2 text-foreground/80">
            {t('uploadNewLogo')}
          </h3>
          <div
            className={`relative rounded-lg overflow-hidden transition-all duration-200 ${
              isDragging
                ? 'bg-accent/20 border-accent border-2'
                : 'bg-background border border-border/50 hover:border-border/80'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
              {!preview ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Upload className="w-8 h-8 text-primary/70" />
                  </div>
                  <p className="text-center text-sm mb-1 font-medium">
                    {isDragging ? t('dropFileHere') : t('dragAndDrop')}
                  </p>
                  <p className="text-center text-xs text-muted-foreground mb-4">
                    {t('orClickToUpload')}
                  </p>
                  <label
                    htmlFor="logo-upload"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 cursor-pointer"
                  >
                    {t('selectFile')}
                  </label>
                </>
              ) : (
                <div className="w-full">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium">{t('preview')}</h4>
                    <button
                      onClick={() => {
                        setPreview(null);
                        setSelectedFile(null);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="relative rounded-md overflow-hidden bg-background/50 h-48 flex items-center justify-center mb-4">
                    <Image
                      src={preview}
                      alt={t('preview')}
                      fill
                      className="object-contain"
                      sizes="(min-width: 1024px) 50vw, 100vw"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground truncate max-w-xs">
                      {selectedFile?.name}
                    </p>
                    <Button
                      onClick={handleUpload}
                      disabled={isLoading}
                      className="gap-2"
                    >
                      {isLoading ? (
                        <div className="h-4 w-4 border-2 border-foreground/30 border-t-foreground/90 rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {t('uploadButton')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Current Logo Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground/80">
              {t('currentLogo')}
            </h3>
            {isDefaultLogo && (
              <span className="text-xs text-muted-foreground bg-background/70 px-2 py-1 rounded-full">
                Default logo
              </span>
            )}
          </div>
          <div className="relative rounded-lg overflow-hidden bg-background/50 border border-border/50 py-6">
            <div className="relative mx-auto w-72 h-24">
              {displayLogoUrl ? (
                <Image
                  src={displayLogoUrl}
                  alt={t('currentLogo')}
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {t('noLogosUploaded')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Uploaded Logos Grid */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground/80">
              {t('uploadedLogos')}
            </h3>
            <span className="text-xs text-muted-foreground">
              {availableLogos.length}{' '}
              {availableLogos.length === 1 ? t('logo') : t('logos')}
            </span>
          </div>
          {isLoading && !availableLogos.length ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <div className="h-6 w-6 border-2 border-foreground/30 border-t-foreground/90 rounded-full animate-spin mr-2" />
              <span>{t('loading')}</span>
            </div>
          ) : availableLogos.length === 0 ? (
            <div className="text-center py-12 bg-background/50 rounded-lg border border-border/50">
              <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                {t('noLogosUploaded')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableLogos.map((logo) => {
                const isActive = currentLogo?.id === logo.id;
                return (
                  <div
                    key={logo.id}
                    onClick={() => handleSetLogo(logo as any)}
                    className={`group relative overflow-hidden rounded-lg border transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'border-border/50 hover:border-border hover:bg-background/70'
                    }`}
                  >
                    <div
                      className={`absolute top-2 right-2 z-10 ${
                        isActive
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100'
                      } transition-opacity duration-200`}
                    >
                      <button
                        onClick={(e) => handleDeleteLogo(logo.id, e)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-background/90 backdrop-blur-sm hover:bg-background text-muted-foreground hover:text-destructive transition-colors shadow-sm"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {isActive && (
                      <div className="absolute top-2 left-2 z-10">
                        <div className="w-6 h-6 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                          <Check className="w-3 h-3" />
                        </div>
                      </div>
                    )}

                    <div className="pt-6 pb-3 px-4">
                      <div className="relative bg-background/50 rounded-md h-32 flex items-center justify-center p-4 mb-2 overflow-hidden">
                        <Image
                          src={logo.url}
                          alt={logo.name || t('uploadedLogo')}
                          fill
                          className="object-contain p-2"
                          sizes="(max-width: 640px) 100vw, 33vw"
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          {new Date(logo.uploadedAt || '').toLocaleDateString()}
                        </span>
                        <span className="text-xs max-w-[150px] truncate text-foreground/70">
                          {logo.name}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-2 opacity-70">
          {t('poweredBy')} {t('brand')}
        </div>
      </CardContent>
    </Card>
  );
}
