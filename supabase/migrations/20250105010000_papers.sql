-- Papers / Library persistence
create table if not exists public.papers (
  id uuid primary key,
  session_id uuid,
  type text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  metadata jsonb not null default '{}'::jsonb,
  blueprint jsonb not null default '{}'::jsonb
);

create index if not exists idx_papers_type on public.papers(type);
create index if not exists idx_papers_created on public.papers(created_at);

alter table public.papers enable row level security;

create policy "select papers for all" on public.papers for select using (true);
create policy "insert papers for authenticated" on public.papers for insert with check (auth.role() = 'authenticated');
create policy "update papers owner" on public.papers for update using (auth.uid() = created_by);
create policy "delete papers owner" on public.papers for delete using (auth.uid() = created_by);
