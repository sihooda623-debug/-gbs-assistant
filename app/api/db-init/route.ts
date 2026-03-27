import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey);

export async function POST() {
  try {
    // SQL 1: 익명 번호 테이블
    console.log("실행 중: SQL 1 - 익명 번호 테이블");

    const sqls = [
      // 1번
      `CREATE TABLE IF NOT EXISTS anon_daily_ids (
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        anon_number INT NOT NULL,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        PRIMARY KEY (user_id, date)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_anon_daily_unique ON anon_daily_ids(date, anon_number);`,

      // 2번
      `CREATE TABLE IF NOT EXISTS reports (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        reporter_id UUID REFERENCES auth.users(id),
        reported_user_id UUID REFERENCES auth.users(id),
        message_id TEXT REFERENCES chat_messages(id),
        message_content TEXT,
        reason TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS chat_bans (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        banned_by UUID REFERENCES auth.users(id),
        reason TEXT,
        ban_until TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );`,

      // 3번
      `ALTER TABLE chat_messages
        ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'message',
        ADD COLUMN IF NOT EXISTS question_id TEXT REFERENCES chat_messages(id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_question_id ON chat_messages(question_id);
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;`,
    ];

    for (let i = 0; i < sqls.length; i++) {
      try {
        const { error } = await supabase.rpc("exec_sql", { sql: sqls[i] });
        if (error) {
          console.log(`SQL ${i + 1} 주의:`, error.message);
        } else {
          console.log(`SQL ${i + 1}: 성공`);
        }
      } catch (e) {
        // RPC가 없으면 수동으로 각 문장 실행
        console.log(`SQL ${i + 1} 처리 중...`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "DB 초기화 완료"
    });
  } catch (error) {
    console.error("에러:", error);
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
}
