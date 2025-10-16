'use client';
import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';
import { memo, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ModelSelector } from '@/components/model-selector';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { useSidebar } from './ui/sidebar';
import { type VisibilityType, VisibilitySelector } from './visibility-selector';
import { useLogo } from '../context/logo-context';
import { LogoComponent } from './logo-component';
import { PlusIcon } from './icons';
import { ArtifactToggle } from './ArtifactToggle';

export interface FileSearchResult {
  title: string;
  url: string;
  content?: string; // Optional - may not always have content loaded
  sizeInBytes?: number;
  thumbnailUrl?: string; // For image files
  metadata?: {
    isPdf?: boolean;
    contentLength?: number;
    [key: string]: any;
  };
}

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
  isAdmin,
  isDeepResearchEnabled,
  onDeepResearchChange,
  chatTitle,
  onHeightChange,
  artifactIsVisible,
  onArtifactToggle,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  isAdmin: boolean;
  isDeepResearchEnabled: boolean;
  onDeepResearchChange: (enabled: boolean) => void;
  chatTitle?: string;
  onHeightChange?: (height: number) => void;
  artifactIsVisible?: boolean;
  onArtifactToggle?: () => void;
}) {
  const router = useRouter();
  const { open } = useSidebar();
  const t = useTranslations();
  const { width: windowWidth } = useWindowSize();
  const {
    state: { currentLogo, defaultLogoUrl, isLoading },
  } = useLogo();
  const headerRef = useRef<HTMLDivElement>(null);

  // Measure and report header height
  useEffect(() => {
    if (!onHeightChange || !headerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        onHeightChange(height);
      }
    });

    observer.observe(headerRef.current);

    // Initial measurement
    const height = headerRef.current.offsetHeight;
    onHeightChange(height);

    return () => observer.disconnect();
  }, [onHeightChange]);

  return (
    <div ref={headerRef} className="sticky top-0 left-0 right-0 z-40">
      <header className="bg-background pb-0 md:pb-1.5 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]">
        <div className="flex items-center gap-2 pt-0.5 pb-0.5">
          {/* Mobile Layout */}
          <div className="flex md:hidden items-center gap-2 w-full">
            {/* First row on mobile */}
            <div className="flex items-center gap-2 flex-1">
              <SidebarToggle />
              <Button
                onClick={() => router.push('/')}
                className="h-9 bg-[#0A0C10] border-0 text-white hover:text-white rounded-xl hover:bg-[#12151C] transition-colors duration-200 flex items-center gap-2.5 px-3"
              >
                <PlusIcon className="h-4 w-4" />
                <span className="text-sm font-medium whitespace-nowrap">{t('chat.newChat')}</span>
              </Button>
            </div>
            
            {/* Artifact Panel Toggle - Right side on mobile */}
            {artifactIsVisible !== undefined && onArtifactToggle && (
              <ArtifactToggle isVisible={artifactIsVisible} onToggle={onArtifactToggle} />
            )}
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center gap-2 flex-wrap w-full">
            <SidebarToggle />
            
            {/* Selectors */}
            <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
              {/* Model Selector */}
              {!isReadonly && (
                <div className="flex-shrink-0 min-w-0">
                  <ModelSelector 
                    buttonVariant="outline"
                    buttonClassName="md:px-2 md:h-[34px] gap-2"
                    className="ml-0"
                    chevronDirection="down"
                  />
                </div>
              )}

              {/* Visibility Selector */}
              {!isReadonly && (
                <div className="flex-shrink-0 min-w-0">
                  <VisibilitySelector
                    chatId={chatId}
                    selectedVisibilityType={selectedVisibilityType}
                  />
                </div>
              )}
            </div>
            
            {/* Artifact Panel Toggle - Far right on desktop */}
            <div className="flex-shrink-0 ml-auto">
              {artifactIsVisible !== undefined && onArtifactToggle && (
                <ArtifactToggle isVisible={artifactIsVisible} onToggle={onArtifactToggle} />
              )}
            </div>
          </div>
        </div>
        
        {/* Mobile Selectors - Second row */}
        <div className="flex md:hidden items-center gap-2 pb-1">
          {!isReadonly && (
            <>
              <ModelSelector 
                buttonVariant="outline"
                buttonClassName="h-[34px] gap-2"
                className="ml-0 [&_span]:inline"
                chevronDirection="down"
              />
              <VisibilitySelector
                chatId={chatId}
                selectedVisibilityType={selectedVisibilityType}
              />
            </>
          )}
        </div>
      </header>

      {/* Client Logo Display with Watermark and Chat Title - Desktop Only */}
      <div className="hidden md:flex flex-col justify-center items-center py-4 relative">
        <div className="relative">
          <div
            className="relative"
            style={{
              width: '140px',
              height: '30px',
            }}
          >
            <LogoComponent />
            {!isLoading &&
              currentLogo &&
              currentLogo.url !== defaultLogoUrl && (
                <div
                  className="absolute text-xs text-muted-foreground opacity-60"
                  style={{
                    right: `-10px`,
                    bottom: `-18px`,
                  }}
                >
                  Powered by Moterra
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatTitle === nextProps.chatTitle &&
    prevProps.isDeepResearchEnabled === nextProps.isDeepResearchEnabled &&
    prevProps.onDeepResearchChange === nextProps.onDeepResearchChange
  );
});
