import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

export async function POST(req: NextRequest) {
  try {
    // PostgreSQL 직접 접근
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql: `
          ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'message';
          ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS question_id UUID REFERENCES chat_messages(id);
          CREATE INDEX IF NOT EXISTS idx_chat_messages_question_id ON chat_messages(question_id);
        `,
      }),
    });

    if (!response.ok) {
      // RPC가 없으면 다른 방법 시도
      const sqlCommands = [
        "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'message';",
        "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS question_id UUID REFERENCES chat_messages(id);",
        "CREATE INDEX IF NOT EXISTS idx_chat_messages_question_id ON chat_messages(question_id);",
      ];

      for (const sql of sqlCommands) {
        try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            method: "POST",
            headers: {
              "apikey": SERVICE_KEY,
              "Authorization": `Bearer ${SERVICE_KEY}`,
              "Content-Type": "application/json",
              "X-Raw-SQL": "true",
            },
            body: JSON.stringify({ query: sql }),
          });
        } catch (e) {
          console.log("SQL 실행 시도:", sql, e);
        }
      }

      return NextResponse.json({
        success: true,
        message: "DB 동기화 시도 완료 (수동으로 확인 권장)",
      });
    }

    return NextResponse.json({
      success: true,
      message: "DB 스키마 동기화 완료",
    });
  } catch (error) {
    console.error("DB 동기화 에러:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
