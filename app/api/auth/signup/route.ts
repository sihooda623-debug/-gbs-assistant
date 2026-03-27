import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false },
});

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  // 1. 서비스 키로 이메일 확인 없이 바로 계정 생성
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: data.msg || "회원가입 실패" }, { status: 400 });
  }

  const userId = data.user.id;

  // 2. 익명 번호 배정 (오늘 기준)
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    let anonNumber = Math.floor(Math.random() * 9000) + 1000; // 1000~9999
    let attempts = 0;

    // 중복 체크 및 생성
    while (attempts < 10) {
      const { data: existing } = await supabaseAdmin
        .from("anon_daily_ids")
        .select("user_id")
        .eq("date", today)
        .eq("anon_number", anonNumber)
        .single();

      if (!existing) {
        // 중복 없음, 생성
        await supabaseAdmin
          .from("anon_daily_ids")
          .insert({
            user_id: userId,
            anon_number: anonNumber,
            date: today,
          });
        break;
      }

      // 중복, 다시 시도
      anonNumber = Math.floor(Math.random() * 9000) + 1000;
      attempts++;
    }
  } catch (err) {
    console.error("익명 번호 배정 실패:", err);
    // 번호 배정 실패해도 계정 생성은 진행
  }

  return NextResponse.json({ success: true });
}
