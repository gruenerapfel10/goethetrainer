-- Add processed flag to messages for chat pipeline state
alter table public.messages
  add column if not exists processed boolean not null default false;

-- Backfill existing rows to default false
update public.messages set processed = coalesce(processed, false);
