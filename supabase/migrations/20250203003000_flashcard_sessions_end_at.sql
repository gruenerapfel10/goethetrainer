-- Add ended_at column to flashcard_sessions for completion tracking
alter table if exists public.flashcard_sessions
  add column if not exists ended_at timestamptz;
