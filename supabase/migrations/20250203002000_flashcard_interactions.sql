-- Granular interaction events per card/session for analytics
create table if not exists public.flashcard_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  deck_id uuid references public.flashcard_decks(id) on delete cascade,
  session_id uuid references public.flashcard_sessions(id) on delete cascade,
  card_id uuid,
  event_type text not null, -- flip, hint, typing_submit, idle, focus, blur, reveal
  timestamp timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

alter table public.flashcard_interactions enable row level security;

create policy "flashcard_interactions owner" on public.flashcard_interactions
  for all using (user_id = auth.uid());
