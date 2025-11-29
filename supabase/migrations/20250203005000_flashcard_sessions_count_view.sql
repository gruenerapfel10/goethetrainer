-- View to expose session counts per deck
create or replace view public.flashcard_sessions_per_deck as
select deck_id, count(*) as session_count
from public.flashcard_sessions
group by deck_id;

grant select on public.flashcard_sessions_per_deck to authenticated;
