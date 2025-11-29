-- Dummy alteration to refresh schema cache if ended_at was added manually
alter table public.flashcard_sessions alter column status set default 'active';
