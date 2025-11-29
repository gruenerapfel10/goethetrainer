-- State and review persistence for flashcards

create table if not exists public.flashcard_states (
  user_id uuid references auth.users(id) on delete cascade,
  deck_id uuid references public.flashcard_decks(id) on delete cascade,
  card_id uuid,
  state jsonb not null,
  primary key (user_id, deck_id, card_id)
);

create table if not exists public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  deck_id uuid references public.flashcard_decks(id) on delete cascade,
  card_id uuid,
  event jsonb not null,
  created_at timestamptz default now()
);

alter table if exists public.flashcard_sessions
  add column if not exists session jsonb;
