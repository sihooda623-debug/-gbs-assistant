"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("이메일 또는 비밀번호가 틀렸어요");
    } else {
      router.push("/");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* 상단 */}
      <div className="bg-blue-600 text-white px-6 pt-16 pb-10 text-center">
        <div className="text-4xl mb-3">🔬</div>
        <h1 className="text-2xl font-bold">GBS 어시스트</h1>
        <p className="text-blue-200 text-sm mt-1">경기북과학고 학생 생활 도우미</p>
      </div>

      {/* 로그인 폼 */}
      <div className="flex-1 px-6 pt-8">
        <h2 className="text-lg font-bold text-gray-800 mb-6">로그인</h2>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gbs.hs.kr"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-60 mt-2"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-blue-600 font-semibold">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
