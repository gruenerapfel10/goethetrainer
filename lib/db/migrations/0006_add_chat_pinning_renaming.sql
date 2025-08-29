-- Add customTitle column to the Chat table
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "customTitle" TEXT; 