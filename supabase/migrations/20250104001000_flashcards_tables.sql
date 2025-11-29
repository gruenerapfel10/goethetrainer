-- Minimal flashcard tables to replace Firebase storage

create table if not exists public.flashcard_decks (
  id uuid primary key,
  owner_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text default 'draft',
  type text default 'standard',
  cards jsonb default '[]'::jsonb,
  settings jsonb default '{"schedulerId":"fsrs-lite","feedbackPolicyId":"ternary"}'::jsonb,
  categories text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.flashcard_sessions (
  id uuid primary key,
  deck_id uuid references public.flashcard_decks(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  started_at timestamptz default now(),
  status text default 'active',
  answers jsonb default '[]'::jsonb,
  current_index integer default 0,
  session jsonb,
  created_at timestamptz default now()
);

alter table public.flashcard_decks enable row level security;
alter table public.flashcard_sessions enable row level security;

create policy "flashcard_decks owner" on public.flashcard_decks
  for all using (owner_id = auth.uid());
create policy "flashcard_sessions owner" on public.flashcard_sessions
  for all using (user_id = auth.uid());
