'use client';

import * as React from 'react';
import { PanelRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ChatPanelInterface } from '@/components/chat-panel-interface';
import type { UIMessage } from 'ai';
import type { VisibilityType } from '@/components/visibility-selector';

const CHAT_PANEL_COOKIE_NAME = 'chat_panel_state';
const CHAT_PANEL_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const CHAT_PANEL_WIDTH = 400;
const CHAT_PANEL_WIDTH_MOBILE = '20rem';
const CHAT_PANEL_WIDTH_ICON = 48;
const CHAT_PANEL_KEYBOARD_SHORTCUT = 'k';

type ChatPanelContextProps = {
  state: 'expanded' | 'collapsed';
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleChatPanel: () => void;
};

const ChatPanelContext = React.createContext<ChatPanelContextProps | null>(null);

function useChatPanel() {
  const context = React.useContext(ChatPanelContext);
  if (!context) {
    throw new Error('useChatPanel must be used within a ChatPanelProvider.');
  }
  return context;
}

const ChatPanelProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
>(
  (
    {
      defaultOpen = false,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile();
    const [openMobile, setOpenMobile] = React.useState(false);

    // Internal state of the chat panel
    const [_open, _setOpen] = React.useState(defaultOpen);
    const open = openProp ?? _open;
    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === 'function' ? value(open) : value;
        if (setOpenProp) {
          setOpenProp(openState);
        } else {
          _setOpen(openState);
        }

        // Set cookie to keep the chat panel state
        document.cookie = `${CHAT_PANEL_COOKIE_NAME}=${openState}; path=/; max-age=${CHAT_PANEL_COOKIE_MAX_AGE}`;
      },
      [setOpenProp, open]
    );

    // Helper to toggle the chat panel
    const toggleChatPanel = React.useCallback(() => {
      return isMobile
        ? setOpenMobile((open) => !open)
        : setOpen((open) => !open);
    }, [isMobile, setOpen, setOpenMobile]);

    // Add keyboard shortcut to toggle the chat panel
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.key === CHAT_PANEL_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          toggleChatPanel();
        }
      };

      // Use capture phase with high priority
      document.addEventListener('keydown', handleKeyDown, { capture: true });
      return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [toggleChatPanel]);

    // State for styling
    const state = open ? 'expanded' : 'collapsed';

    const contextValue = React.useMemo<ChatPanelContextProps>(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleChatPanel,
      }),
      [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleChatPanel]
    );

    return (
      <ChatPanelContext.Provider value={contextValue}>
        <div
          style={
            {
              '--chat-panel-width': `${CHAT_PANEL_WIDTH}px`,
              '--chat-panel-width-icon': `${CHAT_PANEL_WIDTH_ICON}px`,
              ...style,
            } as React.CSSProperties
          }
          className={cn(
            'group/chat-panel-wrapper flex min-h-svh w-full',
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      </ChatPanelContext.Provider>
    );
  }
);
ChatPanelProvider.displayName = 'ChatPanelProvider';

const ChatPanel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    side?: 'left' | 'right';
    variant?: 'panel' | 'floating';
    collapsible?: 'offcanvas' | 'icon' | 'none';
    chatId?: string;
    initialMessages?: Array<UIMessage>;
    selectedChatModel?: string;
    selectedVisibilityType?: VisibilityType;
    isReadonly?: boolean;
    isAdmin?: boolean;
    chat?: {
      title: string;
      customTitle?: string | null;
    };
  }
>(
  (
    {
      side = 'right',
      variant = 'panel',
      collapsible = 'icon',
      className,
      children,
      chatId = 'chat-panel',
      initialMessages = [],
      selectedChatModel = 'gpt-4o-mini',
      selectedVisibilityType = 'private',
      isReadonly = false,
      isAdmin = false,
      chat,
      ...props
    },
    ref
  ) => {
    const { isMobile, state, openMobile, setOpenMobile } = useChatPanel();

    if (isMobile) {
      return (
        <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
          <SheetContent
            data-chat-panel="panel"
            data-mobile="true"
            className="w-[--chat-panel-width] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl p-0 [&>button]:hidden shadow-blue"
            style={
              {
                '--chat-panel-width': CHAT_PANEL_WIDTH_MOBILE,
              } as React.CSSProperties
            }
            side={side}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Chat Panel</SheetTitle>
              <SheetDescription>Displays the mobile chat panel.</SheetDescription>
            </SheetHeader>
            <div className="flex h-full w-full flex-col">
              {children || (
                <ChatPanelInterface
                  id={chatId}
                  initialMessages={initialMessages}
                  selectedChatModel={selectedChatModel}
                  selectedVisibilityType={selectedVisibilityType}
                  isReadonly={isReadonly}
                  isAdmin={isAdmin}
                  chat={chat}
                />
              )}
            </div>
          </SheetContent>
        </Sheet>
      );
    }

    // Desktop version - behaves like a sidebar that pushes content
    return (
      <aside
        ref={ref}
        className={cn(
          'group/chat-panel fixed top-0 right-0 z-10 flex h-screen shrink-0 flex-col bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-l border-border shadow-blue transition-all duration-200 ease-in-out overflow-hidden',
          state === 'expanded' ? 'w-[var(--chat-panel-width)]' : 'w-[var(--chat-panel-width-icon)]',
          side === 'left' && 'left-0 right-auto border-l-0 border-r',
          className
        )}
        data-state={state}
        data-side={side}
        onWheel={(e) => {
          e.stopPropagation();
        }}
        onTouchMove={(e) => {
          e.stopPropagation();
        }}
        {...props}
      >
        {children || (
          <ChatPanelInterface
            id={chatId}
            initialMessages={initialMessages}
            selectedChatModel={selectedChatModel}
            selectedVisibilityType={selectedVisibilityType}
            isReadonly={isReadonly}
            isAdmin={isAdmin}
            chat={chat}
          />
        )}
      </aside>
    );
  }
);
ChatPanel.displayName = 'ChatPanel';

const ChatPanelTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleChatPanel } = useChatPanel();

  return (
    <Button
      ref={ref}
      data-chat-panel="trigger"
      variant="ghost"
      size="icon"
      className={cn('h-7 w-7 hover:bg-primary/10 hover:text-primary dark:hover:bg-blue-600/20 dark:hover:text-blue-400', className)}
      onClick={(event) => {
        onClick?.(event);
        toggleChatPanel();
      }}
      {...props}
    >
      <PanelRight />
      <span className="sr-only">Toggle Chat Panel</span>
    </Button>
  );
});
ChatPanelTrigger.displayName = 'ChatPanelTrigger';

const ChatPanelRail = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'>
>(({ className, ...props }, ref) => {
  return null; // No rail needed for the new sidebar-style layout
});
ChatPanelRail.displayName = 'ChatPanelRail';

const ChatPanelInset = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'main'>
>(({ className, ...props }, ref) => {
  const { state } = useChatPanel();
  
  return (
    <main
      ref={ref}
      className={cn(
        'relative flex w-full flex-1 flex-col bg-background min-h-screen transition-all duration-200 ease-in-out',
        // Add right padding when chat panel is expanded
        state === 'expanded' ? 'pr-[var(--chat-panel-width)]' : 'pr-[var(--chat-panel-width-icon)]',
        className
      )}
      {...props}
    />
  );
});
ChatPanelInset.displayName = 'ChatPanelInset';

export {
  ChatPanel,
  ChatPanelProvider,
  ChatPanelTrigger,
  ChatPanelRail,
  ChatPanelInset,
  useChatPanel,
};