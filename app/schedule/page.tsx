"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SCHOOL_EVENTS, type SchoolEvent } from "@/lib/school-events";

type Homework = {
  id: string;
  activity_type: string;
  title: string;
  due_date: string;
  completed: boolean;
};


const EVENT_COLOR: Record<SchoolEvent["type"], string> = {
  holiday: "bg-danger-500",
  exam:    "bg-warning-400",
  event:   "bg-primary-500",
};
const EVENT_TEXT: Record<SchoolEvent["type"], string> = {
  holiday: "text-danger-600",
  exam:    "text-warning-600",
  event:   "text-primary-600",
};

// ───── 탭 / 분류 ─────
const TABS = [
  { key: "all",    label: "전체" },
  { key: "school", label: "🏫 학교" },
  { key: "rne",    label: "🔬 R&E" },
  { key: "club",   label: "🎯 동아리" },
  { key: "after",  label: "📚 방과후" },
];

const TYPE_META: Record<string, { emoji: string; label: string; color: string }> = {
  school: { emoji: "🏫", label: "학교",   color: "bg-primary-100 text-primary-700" },
  rne:    { emoji: "🔬", label: "R&E",    color: "bg-purple-100 text-purple-700" },
  club:   { emoji: "🎯", label: "동아리", color: "bg-success-100 text-success-700" },
  after:  { emoji: "📚", label: "방과후", color: "bg-warning-100 text-warning-700" },
};

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary-400 bg-white";
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// ───── 캘린더 컴포넌트 ─────
function Calendar({
  homework,
  onSelectDate,
  selectedDate,
  userGrade,
}: {
  homework: Homework[];
  onSelectDate: (d: string) => void;
  selectedDate: string | null;
  userGrade: number | null;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 숙제 마감일 set
  const hwDates = new Set(homework.filter(h => !h.completed).map(h => h.due_date));
  // 학사일정 날짜 맵 (grade 필터: undefined=전체, 숫자=해당학년만)
  const visibleEvents = SCHOOL_EVENTS.filter(ev => !ev.grade || ev.grade === userGrade);
  const eventMap: Record<string, SchoolEvent[]> = {};
  for (const ev of visibleEvents) {
    const [ey, em] = ev.date.split("-").map(Number);
    if (ey === year && em - 1 === month) {
      if (!eventMap[ev.date]) eventMap[ev.date] = [];
      eventMap[ev.date].push(ev);
    }
  }

  function toDateStr(d: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // 6행 맞추기
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); }}
          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
        >‹</button>
        <span className="text-sm font-bold text-gray-800">{year}년 {month + 1}월</span>
        <button
          onClick={() => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); }}
          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
        >›</button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={`text-center text-xs font-medium py-1 ${i === 0 ? "text-danger-400" : i === 6 ? "text-primary-400" : "text-gray-400"}`}>
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const dateStr = toDateStr(d);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const hasHw = hwDates.has(dateStr);
          const evList = eventMap[dateStr] ?? [];
          const isSun = i % 7 === 0;
          const isSat = i % 7 === 6;

          return (
            <button
              key={i}
              onClick={() => onSelectDate(dateStr)}
              className={`flex flex-col items-center py-1 rounded-xl transition-colors ${isSelected ? "bg-primary-600" : isToday ? "bg-primary-50" : "hover:bg-gray-50"}`}
            >
              <span className={`text-xs font-medium ${
                isSelected ? "text-white" :
                isToday ? "text-primary-600 font-bold" :
                isSun ? "text-danger-400" : isSat ? "text-primary-400" : "text-gray-700"
              }`}>{d}</span>
              <div className="flex gap-0.5 mt-0.5 h-2 items-center">
                {evList.slice(0, 2).map((ev, j) => (
                  <div key={j} className={`w-1 h-1 rounded-full ${isSelected ? "bg-white" : EVENT_COLOR[ev.type]}`} />
                ))}
                {hasHw && <div className={`w-1 h-1 rounded-full ${isSelected ? "bg-yellow-200" : "bg-yellow-400"}`} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="flex gap-3 mt-3 pt-3 border-t border-gray-50 flex-wrap">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-danger-500" /><span className="text-xs text-gray-400">공휴일</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-warning-400" /><span className="text-xs text-gray-400">시험</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary-500" /><span className="text-xs text-gray-400">학사일정</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400" /><span className="text-xs text-gray-400">숙제마감</span></div>
        <span className="text-xs text-gray-300 ml-auto">※ 1학년 기준</span>
      </div>
    </div>
  );
}

// ───── 메인 페이지 ─────
export default function SchedulePage() {
  const [tab, setTab] = useState("all");
  const [homework, setHomework] = useState<Homework[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [userGrade, setUserGrade] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [type, setType] = useState("school");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // 프로필에서 학년 가져오기
    const { data: profile } = await supabase.from("profiles")
      .select("grade").eq("id", user.id).single();
    if (profile) setUserGrade(profile.grade);
    // 숙제 목록
    const { data } = await supabase.from("homework")
      .select("*").eq("user_id", user.id)
      .order("due_date", { ascending: true });
    setHomework((data ?? []) as Homework[]);
  }

  async function fetchHomework() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("homework")
      .select("*").eq("user_id", user.id)
      .order("due_date", { ascending: true });
    setHomework((data ?? []) as Homework[]);
  }

  async function save() {
    if (!title.trim() || !dueDate) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("homework").insert({
      user_id: user.id, activity_type: type,
      title, due_date: dueDate,
    });
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
    setTitle(""); setDueDate(""); setType("school"); setShowForm(false);
    await fetchHomework();
    setLoading(false);
  }

  async function toggle(id: string, completed: boolean) {
    await supabase.from("homework").update({ completed: !completed }).eq("id", id);
    setHomework((prev) => prev.map((h) => h.id === id ? { ...h, completed: !completed } : h));
  }

  async function remove(id: string) {
    await supabase.from("homework").delete().eq("id", id);
    setHomework((prev) => prev.filter((h) => h.id !== id));
  }

  function dDay(due: string) {
    const diff = Math.ceil((new Date(due).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
    if (diff < 0) return { label: `D+${Math.abs(diff)}`, urgent: false, past: true };
    if (diff === 0) return { label: "D-Day", urgent: true, past: false };
    return { label: `D-${diff}`, urgent: diff <= 3, past: false };
  }

  // 선택한 날짜의 학사일정 (grade 필터 적용)
  const selectedEvents = selectedDate
    ? SCHOOL_EVENTS.filter(e => e.date === selectedDate && (!e.grade || e.grade === userGrade))
    : [];

  // 선택한 날짜의 숙제
  const selectedHw = selectedDate
    ? homework.filter(h => h.due_date === selectedDate)
    : [];

  const filtered = homework.filter((h) => {
    if (selectedDate) return h.due_date === selectedDate && (tab === "all" || h.activity_type === tab);
    if (tab !== "all" && h.activity_type !== tab) return false;
    if (!showCompleted && h.completed) return false;
    return true;
  });

  const incomplete = homework.filter((h) => !h.completed);
  const _d = new Date();
  const today = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,"0")}-${String(_d.getDate()).padStart(2,"0")}`;

  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 */}
      <div className="bg-white px-4 pt-10 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">일정</h1>
          <span className="text-xs text-gray-400">미완료 {incomplete.length}개</span>
        </div>
        {/* 탭 */}
        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                tab === t.key ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-3 pb-28">
        {/* 캘린더 */}
        <Calendar
          homework={homework}
          selectedDate={selectedDate}
          onSelectDate={(d) => setSelectedDate(prev => prev === d ? null : d)}
          userGrade={userGrade}
        />

        {/* 선택한 날짜 학사일정 */}
        {selectedDate && selectedEvents.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {selectedEvents.map((ev, i) => (
              <div key={i} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${
                ev.type === "holiday" ? "bg-danger-50 border-danger-100" :
                ev.type === "exam" ? "bg-warning-50 border-warning-100" :
                "bg-primary-50 border-primary-100"
              }`}>
                <span className={`text-xs font-semibold shrink-0 ${EVENT_TEXT[ev.type]}`}>
                  {ev.type === "holiday" ? "공휴일" : ev.type === "exam" ? "시험" : "학사일정"}
                </span>
                <span className="text-sm text-gray-700 flex-1">{ev.title}</span>
                {ev.grade && (
                  <span className="text-xs text-gray-400 shrink-0">{ev.grade}학년</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 선택 날짜 표시 + 해제 */}
        {selectedDate && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              {new Date(selectedDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
            </span>
            <button onClick={() => setSelectedDate(null)} className="text-xs text-gray-400">전체 보기</button>
          </div>
        )}

        {/* 숙제 없음 메시지 (선택 날짜) */}
        {selectedDate && selectedHw.length === 0 && selectedEvents.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-4">이 날 일정이 없어요</p>
        )}

        {/* 등록 폼 */}
        {showForm ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="내용 (예: 수학 수행평가 준비, 동아리 보고서)" className={inputClass} />
            <div>
              <p className="text-xs text-gray-400 mb-2">분류</p>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(TYPE_META).map(([k, v]) => (
                  <button key={k} onClick={() => setType(k)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-colors ${
                      type === k ? "border-primary-600 bg-primary-50 text-primary-700" : "border-gray-200 text-gray-500"
                    }`}>
                    {v.emoji} {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">마감일</label>
              <input type="date" value={dueDate} min={today}
                onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">취소</button>
              <button onClick={save} disabled={loading || !title.trim() || !dueDate}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-50">등록</button>
            </div>
          </div>
        ) : (
          <button onClick={() => { setShowForm(true); if (selectedDate) setDueDate(selectedDate); }}
            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 font-medium">
            + 숙제 · 수행 등록
          </button>
        )}

        {/* 리스트 */}
        {!selectedDate && filtered.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-12">
            {showCompleted || !homework.some(h => !h.completed && (tab === "all" || h.activity_type === tab))
              ? "등록된 항목이 없어요"
              : "미완료 항목이 없어요 🎉"}
          </div>
        )}

        {filtered.map((h) => {
          const { label, urgent, past } = dDay(h.due_date);
          const meta = TYPE_META[h.activity_type] ?? TYPE_META.school;
          return (
            <div key={h.id} className={`bg-white rounded-2xl border p-4 flex items-center gap-3 ${
              h.completed ? "border-gray-100 opacity-60" :
              urgent ? "border-danger-100" : "border-gray-100"
            }`}>
              <button onClick={() => toggle(h.id, h.completed)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  h.completed ? "bg-success-500 border-success-500" : "border-gray-300"
                }`}>
                {h.completed && <span className="text-white text-xs">✓</span>}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${h.completed ? "line-through text-gray-400" : "text-gray-800"}`}>
                  {h.title}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(h.due_date).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} 마감
                  </span>
                </div>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${
                h.completed ? "bg-gray-100 text-gray-400" :
                past ? "bg-gray-100 text-gray-500" :
                urgent ? "bg-danger-100 text-danger-600" : "bg-primary-100 text-primary-600"
              }`}>
                {h.completed ? "완료" : label}
              </span>
              <button onClick={() => remove(h.id)} className="text-gray-300 text-xs shrink-0 p-1">✕</button>
            </div>
          );
        })}

        {!selectedDate && homework.some((h) => h.completed) && (
          <button onClick={() => setShowCompleted((v) => !v)}
            className="text-xs text-gray-400 text-center py-2 mt-1">
            {showCompleted
              ? "완료 항목 숨기기 ↑"
              : `완료된 항목 보기 (${homework.filter(h => h.completed).length}개) ↓`}
          </button>
        )}
      </div>
    </div>
  );
}
