'use client';

import { memo } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import { PaperclipIcon } from '@/components/icons';
import classNames from 'classnames';

function PureAttachmentsButton({
  fileInputRef,
  status,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers['status'];
}) {
  return (
    <button
      data-testid="attachments-button"
      className={classNames(
        'inline-flex items-center justify-center rounded-md p-2 h-8 w-8',
        'text-muted-foreground hover:text-foreground',
        'bg-muted/50 hover:bg-muted/80 border border-border/30 hover:border-border/50',
        'shadow-sm hover:shadow-md transition-all',
        status !== 'ready' && 'opacity-50 cursor-not-allowed',
      )}
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      disabled={status !== 'ready'}
      title="Attach files"
      type="button"
    >
      <PaperclipIcon size={16} />
    </button>
  );
}

export const AttachmentsButton = memo(PureAttachmentsButton);