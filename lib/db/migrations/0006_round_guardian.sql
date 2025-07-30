-- Add isPinned column to Chat table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'Chat' AND column_name = 'isPinned') THEN
    ALTER TABLE "Chat" ADD COLUMN "isPinned" boolean DEFAULT false NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
-- Add customTitle column to Chat table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'Chat' AND column_name = 'customTitle') THEN
    ALTER TABLE "Chat" ADD COLUMN "customTitle" text;
  END IF;
END $$;