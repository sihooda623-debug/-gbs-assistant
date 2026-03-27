-- Realtime 활성화
BEGIN;
  -- chat_messages 테이블에 realtime 활성화
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
COMMIT;
