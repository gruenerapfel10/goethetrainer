alter table public.sessions
  add column if not exists duration integer default 0,
  add column if not exists updated_at timestamptz default now();

create index if not exists idx_sessions_user_start on public.sessions(user_id, started_at desc);
