import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  // 서비스 키로 이메일 확인 없이 바로 계정 생성
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

  return NextResponse.json({ success: true });
}
