-- 채팅방
create table if not exists chat_rooms (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('anonymous', 'club', 'rne')),
  name text not null,
  created_by uuid references auth.users on delete set null,
  group_key text, -- 동아리명 or R&E명 (초대 대상 식별용)
  created_at timestamptz default now()
);

-- 채팅방 멤버 (동아리/R&E방용, 초대 수락/거절)
create table if not exists chat_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references chat_rooms on delete cascade,
  user_id uuid references auth.users on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  invited_by uuid references auth.users on delete set null,
  created_at timestamptz default now(),
  unique(room_id, user_id)
);

-- 채팅 메시지
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references chat_rooms on delete cascade,
  user_id uuid references auth.users on delete set null,
  content text,
  image_url text,
  is_anonymous boolean default false,
  created_at timestamptz default now()
);

-- RLS
alter table chat_rooms enable row level security;
alter table chat_members enable row level security;
alter table chat_messages enable row level security;

-- 익명방: 누구나 읽기, 로그인 유저만 쓰기
create policy "anon room read" on chat_rooms for select using (true);
create policy "anon room insert" on chat_rooms for insert with check (auth.uid() = created_by);

-- 멤버: 본인 것만
create policy "own member" on chat_members for all using (auth.uid() = user_id);
create policy "invite member" on chat_members for insert with check (true); -- 방 만들 때 다른 유저도 insert

-- 메시지: 익명방은 누구나, 그 외는 accepted 멤버만
create policy "msg read anon" on chat_messages for select using (
  exists (select 1 from chat_rooms where id = room_id and type = 'anonymous')
  or exists (select 1 from chat_members where room_id = chat_messages.room_id and user_id = auth.uid() and status = 'accepted')
);
create policy "msg insert" on chat_messages for insert with check (
  auth.uid() is not null and (
    exists (select 1 from chat_rooms where id = room_id and type = 'anonymous')
    or exists (select 1 from chat_members where room_id = chat_messages.room_id and user_id = auth.uid() and status = 'accepted')
  )
);

-- 익명방 기본 생성 (고정 ID)
insert into chat_rooms (id, type, name, group_key)
values ('00000000-0000-0000-0000-000000000001', 'anonymous', '익명 질문방', null)
on conflict (id) do nothing;
