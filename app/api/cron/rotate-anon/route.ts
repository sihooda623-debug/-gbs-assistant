import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

export async function POST(req: NextRequest) {
  try {
    // Vercel Cron 검증 (선택사항)
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date().toISOString().split("T")[0];

    // 1. 오늘의 모든 사용자 조회
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
    if (!allUsers || allUsers.users.length === 0) {
      return NextResponse.json({ success: true, message: "No users" });
    }

    const userIds = allUsers.users.map((u) => u.id);

    // 2. 기존 번호 삭제 (오늘)
    await supabaseAdmin
      .from("anon_daily_ids")
      .delete()
      .eq("date", today);

    // 3. 새 번호 배정 (1~9999 범위에서 중복 없이)
    const shuffledNumbers = Array.from({ length: Math.min(userIds.length, 9999) }, (_, i) => i + 1)
      .sort(() => Math.random() - 0.5);

    const newRecords = userIds.slice(0, 9999).map((userId, idx) => ({
      user_id: userId,
      anon_number: shuffledNumbers[idx],
      date: today,
    }));

    const { error } = await supabaseAdmin
      .from("anon_daily_ids")
      .insert(newRecords);

    if (error) {
      console.error("익명 번호 갱신 실패:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${newRecords.length}명의 익명 번호 갱신 완료`,
    });
  } catch (err) {
    console.error("Cron 에러:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
