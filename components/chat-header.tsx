'use client';
import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';
import { memo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ModelSelector } from '@/components/model-selector';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { useSidebar } from './ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { type VisibilityType, VisibilitySelector } from './visibility-selector';
import { useLogo } from '../context/logo-context';
import { LogoComponent } from './logo-component';
import { NotificationCenter } from './notification-center';

export interface FileSearchResult {
  title: string;
  url: string;
  content: string;
  sizeInBytes?: number;
}

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
  isAdmin = false,
  isDeepResearchEnabled,
  onDeepResearchChange,
  selectedFiles,
  onSelectedFilesChange,
  chatTitle,
  children,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  isAdmin: boolean;
  isDeepResearchEnabled: boolean;
  onDeepResearchChange: (enabled: boolean) => void;
  selectedFiles: FileSearchResult[];
  onSelectedFilesChange: (files: FileSearchResult[]) => void;
  chatTitle?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const { open } = useSidebar();
  const t = useTranslations();
  const { width: windowWidth } = useWindowSize();
  const {
    state: { currentLogo, defaultLogoUrl, isLoading },
  } = useLogo();

  return (
    <div className="sticky top-0">
      <header className="flex bg-background py-1.5 items-center px-2 md:px-2 gap-2 flex-wrap md:flex-nowrap justify-center md:justify-start">
        <div className="flex items-center gap-2">
          <SidebarToggle />

          {/* Model Selector */}
          {!isReadonly && <ModelSelector selectedModelId={selectedModelId} />}

          {/* Visibility Selector */}
          {!isReadonly && (
            <VisibilitySelector
              chatId={chatId}
              selectedVisibilityType={selectedVisibilityType}
            />
          )}

          {/* Children - branching component */}
          {children}

          {/* Notification Center */}
          <NotificationCenter />
        </div>
      </header>

      {/* Client Logo Display with Watermark and Chat Title */}
      <div className="flex flex-col justify-center items-center py-4 relative">
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
    prevProps.selectedModelId === nextProps.selectedModelId &&
    prevProps.chatTitle === nextProps.chatTitle
  );
});
