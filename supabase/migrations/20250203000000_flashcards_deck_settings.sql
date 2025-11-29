-- Add settings and categories to flashcard decks for persistence beyond in-memory stubs

alter table if exists public.flashcard_decks
  add column if not exists settings jsonb default '{}'::jsonb;

alter table if exists public.flashcard_decks
  add column if not exists categories text[] default '{}';

-- Ensure updated_at stays current on changes (optional convenience)
create or replace function public.set_flashcard_decks_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists flashcard_decks_set_updated_at on public.flashcard_decks;
create trigger flashcard_decks_set_updated_at
before update on public.flashcard_decks
for each row execute function public.set_flashcard_decks_updated_at();
