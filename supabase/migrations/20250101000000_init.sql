-- Core schema for Supabase migration from Firestore

create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  is_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Chats
create table if not exists public.chats (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  custom_title text,
  visibility text check (visibility in ('private','public')) default 'private',
  is_pinned boolean default false,
  model_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages
create table if not exists public.messages (
  id uuid primary key,
  chat_id uuid references public.chats(id) on delete cascade,
  user_id uuid references auth.users(id),
  role text check (role in ('user','assistant')) not null,
  parts jsonb not null,
  attachments jsonb default '[]'::jsonb,
  agent_type text,
  model_id text,
  input_tokens integer default 0,
  output_tokens integer default 0,
  created_at timestamptz default now()
);

-- Attachments
create table if not exists public.attachments (
  id uuid primary key,
  chat_id uuid references public.chats(id) on delete cascade,
  user_id uuid references auth.users(id),
  bucket text not null,
  path text not null,
  content_type text,
  size bigint,
  created_at timestamptz default now()
);

-- Reading list
create table if not exists public.reading_list (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade,
  text text not null,
  translation text not null,
  created_at timestamptz default now()
);

-- System prompts
create table if not exists public.system_prompts (
  assistant_id text primary key,
  prompt text not null,
  updated_at timestamptz default now()
);

-- Sessions
create table if not exists public.sessions (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  metadata jsonb default '{}'::jsonb,
  data jsonb default '{}'::jsonb,
  status text,
  started_at timestamptz default now(),
  ended_at timestamptz
);

-- Session questions and answers
create table if not exists public.session_questions (
  id uuid primary key,
  session_id uuid references public.sessions(id) on delete cascade,
  payload jsonb not null
);

create table if not exists public.session_answers (
  id uuid primary key,
  session_id uuid references public.sessions(id) on delete cascade,
  question_id uuid references public.session_questions(id) on delete cascade,
  answer jsonb,
  result jsonb,
  created_at timestamptz default now()
);

-- Documents
create table if not exists public.documents (
  id uuid primary key,
  user_id uuid references auth.users(id),
  title text,
  kind text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.document_versions (
  id uuid primary key,
  document_id uuid references public.documents(id) on delete cascade,
  content text,
  version integer,
  author text check (author in ('user','ai')),
  is_working_version boolean default false,
  forked_from_version integer,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_chats_user on public.chats(user_id);
create index if not exists idx_messages_chat on public.messages(chat_id);
create index if not exists idx_messages_created on public.messages(created_at);
create index if not exists idx_attachments_chat on public.attachments(chat_id);
create index if not exists idx_reading_list_user on public.reading_list(user_id);
create index if not exists idx_sessions_user on public.sessions(user_id);

-- RLS policies
alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;
alter table public.reading_list enable row level security;
alter table public.sessions enable row level security;
alter table public.session_questions enable row level security;
alter table public.session_answers enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;

create policy "profiles self" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);

create policy "select own or public chats" on public.chats
  for select using (user_id = auth.uid() or visibility = 'public');
create policy "crud own chats" on public.chats
  for all using (user_id = auth.uid());

create policy "select messages for own/public chats" on public.messages
  for select using (
    chat_id in (select id from public.chats where user_id = auth.uid() or visibility='public')
  );
create policy "insert own chat messages" on public.messages
  for insert with check (
    chat_id in (select id from public.chats where user_id = auth.uid())
  );

create policy "own attachments" on public.attachments
  for all using (user_id = auth.uid());

create policy "own reading list" on public.reading_list
  for all using (user_id = auth.uid());

create policy "own sessions" on public.sessions
  for all using (user_id = auth.uid());

create policy "session_questions owner" on public.session_questions
  for all using (
    session_id in (select id from public.sessions where user_id = auth.uid())
  );
create policy "session_answers owner" on public.session_answers
  for all using (
    session_id in (select id from public.sessions where user_id = auth.uid())
  );

create policy "own documents" on public.documents
  for all using (user_id = auth.uid());
create policy "versions via own docs" on public.document_versions
  for all using (
    document_id in (select id from public.documents where user_id = auth.uid())
  );

