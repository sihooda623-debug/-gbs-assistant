"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== password2) {
      setError("비밀번호가 일치하지 않아요");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 해요");
      return;
    }

    setLoading(true);
    // 서버 API로 이메일 확인 없이 계정 생성
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError("회원가입에 실패했어요: " + data.error);
      setLoading(false);
      return;
    }

    // 생성 후 바로 로그인
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      setError("가입은 됐는데 로그인에 실패했어요. 로그인 페이지에서 다시 시도해주세요.");
    } else {
      router.push("/onboarding");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 상단 */}
      <div className="bg-white border-b border-gray-200 px-6 pt-16 pb-10 text-center">
        <div className="text-4xl mb-3">🔬</div>
        <h1 className="text-3xl font-bold text-gray-900">GBS 어시스트</h1>
        <p className="text-gray-500 text-sm mt-2">처음 오셨군요! 계정을 만들어요</p>
      </div>

      {/* 회원가입 폼 */}
      <div className="flex-1 px-6 pt-8">
        <h2 className="text-lg font-bold text-gray-800 mb-6">회원가입</h2>

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-400"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자 이상"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-400"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">비밀번호 확인</label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="비밀번호 다시 입력"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-400"
              required
            />
          </div>

          {error && (
            <p className="text-danger-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-60 mt-2"
          >
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-primary-600 font-semibold">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
