'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';
import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { ModelSelector } from '@/components/model-selector';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { PlusIcon } from './icons';
import { useSidebar } from './ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { type VisibilityType, VisibilitySelector } from './visibility-selector';
import LanguageSwitcher from './language-switcher';
import { useLogo } from '../context/logo-context';
import { LogoComponent } from './logo-component';

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
      <header className="flex bg-background py-1.5 items-center px-2 md:px-2 gap-2 flex-wrap md:flex-nowrap">
        <div className="flex items-center gap-2">
          <SidebarToggle />

          {/* New Chat Button with Tooltip */}
          {(!open || windowWidth < 768) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="md:px-2 px-2 md:h-[34px]"
                  onClick={() => {
                    router.push('/');
                    router.refresh();
                  }}
                >
                  <PlusIcon />
                  <span className="md:sr-only hidden lg:block">
                    {t('chat.newChat')}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('chat.newChat')}</TooltipContent>
            </Tooltip>
          )}

          {/* Model Selector */}
          {!isReadonly && <ModelSelector selectedModelId={selectedModelId} />}

          {/* Visibility Selector */}
          {!isReadonly && (
            <VisibilitySelector
              chatId={chatId}
              selectedVisibilityType={selectedVisibilityType}
            />
          )}

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Admin Controls */}
          {isAdmin && (
            <>
              <Button
                variant="outline"
                className="md:flex md:px-2 md:h-[34px] hover:bg-accent hover:text-accent-foreground"
                asChild
              >
                <Link href="/admin">{t('chat.adminPortal')}</Link>
              </Button>
              <Button
                variant="outline"
                className="md:flex md:px-2 md:h-[34px] hover:bg-accent hover:text-accent-foreground"
                asChild
              >
                <Link href="/dashboard">{t('chat.dashboard')}</Link>
              </Button>
            </>
          )}
        </div>

        {/* Chat Title - Display if available */}
        {chatTitle && (
          <div className="flex-1 text-center font-medium truncate mx-2">
            {chatTitle}
          </div>
        )}
      </header>

      {/* Client Logo Display with Watermark */}
      <div className="flex justify-center items-center py-4 relative">
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
