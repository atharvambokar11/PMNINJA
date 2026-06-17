-- Run this in your Supabase SQL Editor

-- 1. Profiles Table (extends auth.users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text not null,
  free_mocks_left integer default 1,
  total_sessions integer default 0,
  streak integer default 0,
  last_session_date date,
  average_score numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Sessions Table
create table public.sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  question_id integer,
  question_text text,
  status text default 'started', -- 'started', 'completed'
  score numeric,
  feedback jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Transcripts Table
create table public.transcripts (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions(id) not null,
  role text not null, -- 'user', 'assistant' // or 'system'
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Payments Table
create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  plan text not null, -- '5_sessions', '10_sessions'
  amount integer not null,
  status text default 'pending', -- 'pending', 'verified'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (enable RLS)
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.transcripts enable row level security;
alter table public.payments enable row level security;

-- Policies
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can view own sessions" on public.sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions" on public.sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions" on public.sessions for update using (auth.uid() = user_id);
create policy "Users can view own transcripts" on public.transcripts for select using (auth.uid() in (select user_id from sessions where id = session_id));
create policy "Users can insert own transcripts" on public.transcripts for insert with check (auth.uid() in (select user_id from sessions where id = session_id));
create policy "Users can view own payments" on public.payments for select using (auth.uid() = user_id);
create policy "Users can insert own payments" on public.payments for insert with check (auth.uid() = user_id);
