create table if not exists records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  activity_type text,
  title text,
  content text,
  created_at timestamptz default now()
);

create table if not exists homework (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  activity_type text,
  title text,
  due_date date,
  completed boolean default false,
  created_at timestamptz default now()
);

alter table records enable row level security;
alter table homework enable row level security;

create policy "own records" on records for all using (auth.uid() = user_id);
create policy "own homework" on homework for all using (auth.uid() = user_id);
