"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AIChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, mounted]);

  useEffect(() => {
    if (!mounted) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
      } else {
        supabase
          .from("profiles")
          .select("grade, class_num")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data) setProfile(data);
          });
      }
    });
  }, [mounted, router]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    setInputText("");
    setMessages([...messages, { role: "user", content: text }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: text }],
          userProfile: profile,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "오류 발생" }]);
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => [...prev, { role: "assistant", content: "오류 발생" }]);
    }
    setIsLoading(false);
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <Link href="/chat">
          <button className="text-2xl text-gray-400">‹</button>
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">AI 도우미</h1>
          <p className="text-xs text-gray-400">Claude Haiku</p>
        </div>
        <span className="text-2xl">✨</span>
      </div>

      {/* 메시지 */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-5xl mb-4">✨</p>
            <p className="font-bold text-gray-900">AI 도우미에게 물어보세요</p>
            <p className="text-sm text-gray-500 mt-2">학사일정, 시간표 등</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`mb-3 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`px-3 py-2 rounded-lg max-w-xs ${
                msg.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-white border border-gray-200 text-gray-900"
              }`}
            >
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="mb-3 flex justify-start">
            <div className="bg-white border border-gray-200 px-3 py-2 rounded-lg">
              <p className="text-sm text-gray-500">생성 중...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 */}
      <div className="bg-white border-t border-gray-100 p-4 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="메시지..."
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !inputText.trim()}
          className="w-10 h-10 bg-blue-500 text-white rounded-lg flex items-center justify-center disabled:opacity-50"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
