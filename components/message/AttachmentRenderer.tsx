'use client';

import { motion } from 'framer-motion';
import { PreviewAttachment } from '../preview-attachment';

interface Attachment {
  url?: string;
  name?: string;
  contentType?: string;
  size?: number;
}

interface AttachmentRendererProps {
  attachments: Attachment[];
  messageId: string;
}

export const AttachmentRenderer = ({
  attachments,
  messageId,
}: AttachmentRendererProps) => {
  if (attachments.length === 0) return null;

  return (
    <motion.div
      className="flex flex-row justify-end gap-2 mb-2"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      {attachments.map((attachment: Attachment, index: number) => {
        const attachmentKey = `attachment-${messageId}-${index}`;
        const isFromFileSearch = attachment.url?.startsWith('s3://') ||
          attachment.contentType === 'application/pdf';

        return (
          <PreviewAttachment
            key={attachmentKey}
            attachment={attachment}
            isSearchFile={isFromFileSearch}
            allAttachments={attachments}
          />
        );
      })}
    </motion.div>
  );
};