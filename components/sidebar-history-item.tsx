import type { Chat } from '@/lib/db/queries';
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from './ui/sidebar';
import Link from 'next/link';
import {
  CheckCircleFillIcon,
  EditIcon,
  GlobeIcon,
  LockIcon,
  MoreHorizontalIcon,
  PinIcon,
  ShareIcon,
  TrashIcon,
  PinOffIcon,
} from './icons';
import { memo, useState, useEffect } from 'react';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const PureChatItem = ({
  chat,
  isActive,
  onDelete,
  onRename,
  onTogglePin,
  setOpenMobile,
  pinnedCount,
}: {
  chat: Chat;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  onRename: (chatId: string, newTitle: string) => void;
  onTogglePin: (chatId: string, isPinned: boolean) => void;
  setOpenMobile: (open: boolean) => void;
  pinnedCount: number;
}) => {
  const { visibilityType, setVisibilityType } = useChatVisibility({
    chatId: chat.id,
    initialVisibility: chat.visibility,
  });
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(chat.customTitle || chat.title);
  const [isMobile, setIsMobile] = useState(false);
  const t = useTranslations();

  // Check if device is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const handleRename = () => {
    if (newTitle.trim()) {
      onRename(chat.id, newTitle.trim());
      setIsRenameDialogOpen(false);
    }
  };

  const handleTogglePin = () => {
    if (!chat.isPinned && pinnedCount >= 5) {
      toast.error(t('chat.maxPinnedReached'));
      return;
    }
    onTogglePin(chat.id, !chat.isPinned);
  };

  return (
    <>
      <SidebarMenuItem className="group/menu-item">
        <div className="relative flex items-center w-full">
          <SidebarMenuButton
            asChild
            isActive={isActive}
            tooltip={chat.customTitle || chat.title}
            className="flex-1 min-w-0 pr-12"
          >
            <Link
              href={`/chat/${chat.id}`}
              onClick={() => {
                setOpenMobile(false);
              }}
              className="flex items-center w-full h-full"
            >
              <span className="truncate">
                {chat.customTitle || chat.title}
              </span>
            </Link>
          </SidebarMenuButton>

          <div className={`absolute right-1 inset-y-0 flex items-center ${isMobile ? 'opacity-100' : 'opacity-0 group-hover/menu-item:opacity-100'} transition-opacity`}>
            <DropdownMenu modal={true}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-6 w-6 flex items-center justify-center"
                  showOnHover={false}
                >
                  <MoreHorizontalIcon className="h-3 w-3" />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>

              <DropdownMenuContent side="bottom" align="end">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setIsRenameDialogOpen(true)}
                >
                  <EditIcon className="mr-2 h-4 w-4" />
                  <span>{t('chat.rename')}</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleTogglePin}
                >
                  {chat.isPinned ? (
                    <>
                      <PinOffIcon className="mr-2 h-4 w-4" />
                      <span>{t('chat.unpin')}</span>
                    </>
                  ) : (
                    <>
                      <PinIcon className="mr-2 h-4 w-4" />
                      <span>{t('chat.pin')}</span>
                    </>
                  )}
                </DropdownMenuItem>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    <ShareIcon className="mr-2 h-4 w-4" />
                    <span>{t('chat.share')}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem
                        className="cursor-pointer flex-row justify-between"
                        onClick={() => {
                          setVisibilityType('private');
                        }}
                      >
                        <div className="flex flex-row gap-2 items-center">
                          <LockIcon size={12} />
                          <span>{t('privacy.private.label')}</span>
                        </div>
                        {visibilityType === 'private' ? (
                          <CheckCircleFillIcon />
                        ) : null}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer flex-row justify-between"
                        onClick={() => {
                          setVisibilityType('public');
                        }}
                      >
                        <div className="flex flex-row gap-2 items-center">
                          <GlobeIcon />
                          <span>{t('privacy.public.label')}</span>
                        </div>
                        {visibilityType === 'public' ? <CheckCircleFillIcon /> : null}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>

                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
                  onSelect={() => onDelete(chat.id)}
                >
                  <TrashIcon className="mr-2 h-4 w-4" />
                  <span>{t('chat.delete')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </SidebarMenuItem>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('chat.renameChat')}</DialogTitle>
            <DialogDescription>
              {t('chat.enterNewTitle')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={chat.title}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              {t('chat.cancel')}
            </Button>
            <Button onClick={handleRename}>{t('chat.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const ChatItem = memo(PureChatItem, (prevProps, nextProps) => {
  if (
    prevProps.isActive !== nextProps.isActive ||
    prevProps.chat.isPinned !== nextProps.chat.isPinned ||
    prevProps.chat.customTitle !== nextProps.chat.customTitle
  )
    return false;
  return true;
});
