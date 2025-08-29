ALTER TABLE "Chat" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_updated_at_idx" ON "Chat" USING btree ("updatedAt");

-- Update crawler-agent to web-agent
UPDATE "Message"
SET "agentType" = 'web-agent'
WHERE "agentType" = 'crawler-agent';

-- Update deepresearch-agent to web-agent
UPDATE "Message"
SET "agentType" = 'web-agent'
WHERE "agentType" = 'deepresearch-agent';

-- This migration consolidates legacy crawler-agent and deepresearch-agent entries into the unified web-agent