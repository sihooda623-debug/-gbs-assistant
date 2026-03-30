"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ActivityType = "general" | "rne" | "club" | "after";

const META: Record<ActivityType, { emoji: string; title: string; color: string; bg: string }> = {
  general: { emoji: "📝", title: "기타",  color: "text-gray-700",   bg: "bg-gray-600"   },
  rne:     { emoji: "🔬", title: "R&E",   color: "text-purple-700", bg: "bg-purple-600" },
  club:    { emoji: "🎯", title: "동아리", color: "text-success-700",  bg: "bg-success-600"  },
  after:   { emoji: "📚", title: "방과후", color: "text-warning-700", bg: "bg-warning-600" },
};

type Record_ = { id: string; title: string; content: string; created_at: string };
type Homework = { id: string; title: string; due_date: string; completed: boolean };

export default function ActivityPage() {
  const { type } = useParams<{ type: string }>();
  const router = useRouter();
  const meta = META[type as ActivityType] ?? META.rne;

  const [tab, setTab] = useState<"records" | "homework">("records");
  const [records, setRecords] = useState<Record_[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);

  // 기록장 작성
  const [recTitle, setRecTitle] = useState("");
  const [recContent, setRecContent] = useState("");
  const [showRecForm, setShowRecForm] = useState(false);

  // 숙제 등록
  const [hwTitle, setHwTitle] = useState("");
  const [hwDue, setHwDue] = useState("");
  const [showHwForm, setShowHwForm] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  async function getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  async function fetchAll() {
    const user = await getUser();
    if (!user) return;
    const [{ data: r }, { data: h }] = await Promise.all([
      supabase.from("records").select("*").eq("user_id", user.id).eq("activity_type", type).order("created_at", { ascending: false }),
      supabase.from("homework").select("*").eq("user_id", user.id).eq("activity_type", type).order("due_date", { ascending: true }),
    ]);
    setRecords((r ?? []) as Record_[]);
    setHomework((h ?? []) as Homework[]);
  }

  async function saveRecord() {
    if (!recTitle.trim()) return;
    setLoading(true);
    const user = await getUser();
    if (!user) return;
    await supabase.from("records").insert({
      user_id: user.id, activity_type: type,
      title: recTitle, content: recContent,
    });
    setRecTitle(""); setRecContent(""); setShowRecForm(false);
    await fetchAll();
    setLoading(false);
  }

  async function saveHomework() {
    if (!hwTitle.trim() || !hwDue) return;
    setLoading(true);
    const user = await getUser();
    if (!user) return;
    await supabase.from("homework").insert({
      user_id: user.id, activity_type: type,
      title: hwTitle, due_date: hwDue,
    });
    setHwTitle(""); setHwDue(""); setShowHwForm(false);
    await fetchAll();
    setLoading(false);
  }

  async function toggleHomework(id: string, completed: boolean) {
    await supabase.from("homework").update({ completed: !completed }).eq("id", id);
    setHomework((prev) => prev.map((h) => h.id === id ? { ...h, completed: !completed } : h));
  }

  async function deleteRecord(id: string) {
    await supabase.from("records").delete().eq("id", id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }

  async function deleteHomework(id: string) {
    await supabase.from("homework").delete().eq("id", id);
    setHomework((prev) => prev.filter((h) => h.id !== id));
  }

  function dDay(due: string) {
    const diff = Math.ceil((new Date(due).getTime() - new Date().setHours(0,0,0,0)) / 86400000);
    if (diff < 0) return { label: `D+${Math.abs(diff)}`, urgent: false, past: true };
    if (diff === 0) return { label: "D-Day", urgent: true, past: false };
    return { label: `D-${diff}`, urgent: diff <= 3, past: false };
  }

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-500 bg-white";

  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 */}
      <div className={`${meta.bg} text-white px-4 pt-10 pb-6`}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white/70 text-xl">←</button>
          <div>
            <p className="text-white/70 text-sm">{meta.emoji}</p>
            <h1 className="text-xl font-bold">{meta.title}</h1>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mt-4">
          {(["records", "homework"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === t ? "bg-white/20 text-white" : "text-white/60"
              }`}>
              {t === "records" ? "📝 기록장" : "✅ 숙제"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 pb-6 flex flex-col gap-3">

        {/* 기록장 탭 */}
        {tab === "records" && (
          <>
            {showRecForm ? (
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-3">
                <input value={recTitle} onChange={(e) => setRecTitle(e.target.value)}
                  placeholder="제목 (예: 3월 25일 실험 내용)" className={inputClass} />
                <textarea value={recContent} onChange={(e) => setRecContent(e.target.value)}
                  placeholder="내용을 자유롭게 적어요" rows={5}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-500 bg-white resize-none" />
                <div className="flex gap-2">
                  <button onClick={() => setShowRecForm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">취소</button>
                  <button onClick={saveRecord} disabled={loading || !recTitle.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold disabled:opacity-50">저장</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowRecForm(true)}
                className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 font-medium">
                + 새 기록 추가
              </button>
            )}

            {records.length === 0 && !showRecForm && (
              <div className="text-center text-gray-400 text-sm py-10">아직 기록이 없어요</div>
            )}

            {records.map((r) => (
              <div key={r.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm text-gray-800">{r.title}</p>
                  <button onClick={() => deleteRecord(r.id)} className="text-gray-300 text-xs shrink-0">✕</button>
                </div>
                {r.content && <p className="text-sm text-gray-500 mt-2 whitespace-pre-wrap">{r.content}</p>}
                <p className="text-xs text-gray-300 mt-2">
                  {new Date(r.created_at).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
                </p>
              </div>
            ))}
          </>
        )}

        {/* 숙제 탭 */}
        {tab === "homework" && (
          <>
            {showHwForm ? (
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-3">
                <input value={hwTitle} onChange={(e) => setHwTitle(e.target.value)}
                  placeholder="숙제 내용 (예: 실험 보고서 작성)" className={inputClass} />
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">마감일</label>
                  <input type="date" value={hwDue} onChange={(e) => setHwDue(e.target.value)} className={inputClass} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowHwForm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">취소</button>
                  <button onClick={saveHomework} disabled={loading || !hwTitle.trim() || !hwDue}
                    className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold disabled:opacity-50">등록</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowHwForm(true)}
                className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 font-medium">
                + 숙제 등록
              </button>
            )}

            {homework.length === 0 && !showHwForm && (
              <div className="text-center text-gray-400 text-sm py-10">등록된 숙제가 없어요</div>
            )}

            {homework.map((h) => {
              const { label, urgent, past } = dDay(h.due_date);
              return (
                <div key={h.id} className={`bg-white rounded-lg border p-4 flex items-center gap-3 ${
                  h.completed ? "border-gray-200 opacity-60" : urgent ? "border-danger-100" : "border-gray-200"
                }`}>
                  <button onClick={() => toggleHomework(h.id, h.completed)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      h.completed ? "bg-success-500 border-success-500" : "border-gray-300"
                    }`}>
                    {h.completed && <span className="text-white text-xs">✓</span>}
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${h.completed ? "line-through text-gray-400" : "text-gray-800"}`}>
                      {h.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(h.due_date).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} 마감
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    h.completed ? "bg-gray-100 text-gray-400" :
                    past ? "bg-gray-100 text-gray-400" :
                    urgent ? "bg-danger-100 text-danger-600" : "bg-gray-100 text-primary-500"
                  }`}>
                    {h.completed ? "완료" : label}
                  </span>
                  <button onClick={() => deleteHomework(h.id)} className="text-gray-300 text-xs">✕</button>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
