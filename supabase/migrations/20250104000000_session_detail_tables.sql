-- Session detail tables for questions/answers/results

create table if not exists public.session_questions (
  id uuid primary key,
  session_id uuid references public.sessions(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz default now()
);

create table if not exists public.session_answers (
  id uuid primary key,
  session_id uuid references public.sessions(id) on delete cascade,
  question_id uuid references public.session_questions(id) on delete cascade,
  answer jsonb,
  result jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_session_questions_session on public.session_questions(session_id);
create index if not exists idx_session_answers_session on public.session_answers(session_id);
create index if not exists idx_session_answers_question on public.session_answers(question_id);

alter table public.session_questions enable row level security;
alter table public.session_answers enable row level security;
