-- 질문/답변 채팅 기능 추가
-- chat_messages: 메시지 타입(일반/질문/답변) + 답글 parent_id 추가

alter table chat_messages
  add column if not exists message_type text default 'message'
    check (message_type in ('message', 'question', 'answer')),
  add column if not exists parent_id uuid references chat_messages(id) on delete cascade;
