"use client";

import { useState, useEffect } from "react";
import { COMMON_SCHEDULE, TYPE_STYLE, FRIDAY_CUTOFF_TIME } from "@/lib/schedule";
import { getFullName } from "@/lib/teachers";
import { supabase } from "@/lib/supabase";
import MealTab from "@/components/MealTab";

const DAYS = ["월", "화", "수", "목", "금"];
const DAY_IDX: Record<string, number> = { 월: 0, 화: 1, 수: 2, 목: 3, 금: 4 };

type PeriodData = {
  weekday: number;
  classTime: number;
  teacher: string;
  subject: string;
  room: string;
};

type Profile = {
  grade: number;
  class_num: number;
  club_name: string;
  after_name: string;
  after_day: string;
  after_time: string; // JSON 배열 문자열
};

export default function TimetablePage() {
  const [mainTab, setMainTab] = useState<"timetable" | "meal">("timetable");
  const [tab, setTab] = useState<"daily" | "weekly">("daily");
  const [grade, setGrade] = useState("1");
  const [classNum, setClassNum] = useState("1");
  const [timetable, setTimetable] = useState<PeriodData[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);

  const todayIdx = new Date().getDay() - 1;
  const [selectedDay, setSelectedDay] = useState(todayIdx >= 0 && todayIdx <= 4 ? todayIdx : 0);
  const isFriday = selectedDay === 4;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        fetchTimetable("1", "1");
        return;
      }
      supabase.from("profiles")
        .select("grade, class_num, club_name, after_name, after_day, after_time")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setProfile(data as Profile);
            const g = String(data.grade ?? 1);
            const c = String(data.class_num ?? 1);
            setGrade(g);
            setClassNum(c);
            fetchTimetable(g, c);
          } else {
            fetchTimetable("1", "1");
          }
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchTimetable(g = grade, c = classNum) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/timetable?grade=${g}&class=${c}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      // timetable은 2D 배열: timetable[weekday][period]
      setTimetable(data.timetable || []);
    } catch (err) {
      console.error("시간표 로드 실패:", err);
      setError("시간표를 불러오지 못했어요");
    }
    setLoading(false);
  }

  const dayPeriods: PeriodData[] = timetable[selectedDay] ?? [];
  const afterDayIdx = profile?.after_day ? DAY_IDX[profile.after_day] : -1;
  const isAfterDay = afterDayIdx === selectedDay;
  const afterTimes: string[] = (() => {
    try { return JSON.parse(profile?.after_time ?? "[]"); }
    catch { return profile?.after_time ? [profile.after_time] : []; }
  })();

  // 금요일에 숨길 항목 판단
  function isHidden(item: typeof COMMON_SCHEDULE[number]) {
    return isFriday && item.startTime >= FRIDAY_CUTOFF_TIME;
  }

  return (
    <div className="flex flex-col">
      <div className="bg-white px-4 pt-10 pb-0 border-b border-gray-100">
        {/* 상단 탭: 시간표 / 급식 */}
        <div className="flex gap-1 mb-0">
          <button
            onClick={() => setMainTab("timetable")}
            className={`flex-1 py-2.5 text-sm font-bold rounded-t-xl transition-colors ${mainTab === "timetable" ? "text-primary-600 border-b-2 border-primary-600" : "text-gray-400"}`}
          >시간표</button>
          <button
            onClick={() => setMainTab("meal")}
            className={`flex-1 py-2.5 text-sm font-bold rounded-t-xl transition-colors ${mainTab === "meal" ? "text-primary-600 border-b-2 border-primary-600" : "text-gray-400"}`}
          >급식</button>
        </div>
      </div>

      {mainTab === "meal" && <MealTab />}
      {mainTab === "timetable" && <div className="flex flex-col">
      <div className="bg-white px-4 pt-3 pb-3 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">시간표</h1>

        {/* 학년/반 선택 */}
        <div className="flex gap-2 mt-3">
          <select value={grade} onChange={(e) => setGrade(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
            {[1,2,3].map((g) => <option key={g} value={g}>{g}학년</option>)}
          </select>
          <select value={classNum} onChange={(e) => setClassNum(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
            {[1,2,3,4,5].map((c) => <option key={c} value={c}>{c}반</option>)}
          </select>
          <button onClick={() => fetchTimetable()}
            className="bg-primary-600 text-white px-4 rounded-xl text-sm font-medium">
            조회
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mt-3">
          {(["daily","weekly"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === t ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600"}`}>
              {t === "daily" ? "일과표" : "주간 시간표"}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">불러오는 중...</div>
      )}
      {error && <div className="px-4 py-4 text-danger-500 text-sm text-center">{error}</div>}

      {/* 일과표 */}
      {!loading && tab === "daily" && (
        <div className="px-4 pt-4 flex flex-col gap-2 pb-4">
          {/* 요일 선택 */}
          <div className="flex gap-1 mb-2">
            {DAYS.map((d, i) => (
              <button key={d} onClick={() => setSelectedDay(i)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedDay === i ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                {d}
              </button>
            ))}
          </div>

          {COMMON_SCHEDULE.map((item, idx) => {
            if (isHidden(item)) return null;

            const style = TYPE_STYLE[item.type];
            const periodMatch = item.period.match(/^(\d)교시/);
            const periodNum = periodMatch ? Number(periodMatch[1]) : null;
            const subject = periodNum ? dayPeriods[periodNum - 1] : null;

            // 수요일 7교시 + 동아리 있으면 표시
            const isWedClub = selectedDay === 2 && periodNum === 7 && !!profile?.club_name;
            // 방과후: 해당 요일 + 해당 교시 (구버전 "(방과후)" 포함 이름도 인식)
            const isAfterPeriod = isAfterDay && afterTimes.some(t =>
              t.replace(" (방과후)", "") === item.period || t === item.period
            );

            return (
              <div key={idx} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${style.bg}`}>
                <div className="text-xs text-gray-400 w-20 shrink-0">
                  <div>{item.startTime}</div>
                  <div>{item.endTime}</div>
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-semibold ${style.text}`}>{item.period}</div>
                  {subject?.subject && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {subject.subject}
                      {isWedClub && profile?.club_name ? ` (${profile.club_name})` : ""}
                      {subject.teacher ? ` · ${getFullName(subject.teacher, subject.subject)} 선생님` : ""}
                      {subject.room && ` · ${subject.room}`}
                    </div>
                  )}
                  {isAfterPeriod && profile?.after_name && (
                    <div className="text-xs text-purple-600 font-medium mt-0.5">
                      방과후: {profile.after_name}
                    </div>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
              </div>
            );
          })}

          {isFriday && (
            <div className="text-center text-xs text-gray-400 py-2">🏠 6교시 후 하교</div>
          )}
        </div>
      )}

      {/* 주간 시간표 */}
      {!loading && tab === "weekly" && (
        <div className="px-4 pt-4 pb-4">
          <div className="flex gap-1 mb-4">
            {DAYS.map((d, i) => (
              <button key={d} onClick={() => setSelectedDay(i)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  selectedDay === i ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                {d}
              </button>
            ))}
          </div>

          {timetable.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-10">시간표를 불러오는 중이에요</div>
          ) : (
            <div className="flex flex-col gap-2">
              {dayPeriods.map((subject, idx) => {
                if (!subject?.subject) return null;
                const periodNum = idx + 1;
                // 금요일 6교시 이후 숨김
                if (isFriday && periodNum > 6) return null;

                const isWedClub = selectedDay === 2 && periodNum === 7 && !!profile?.club_name;
                const isAfterPeriod = isAfterDay && afterTimes.some(t =>
                  t.replace(" (방과후)", "") === `자습 ${periodNum}교시` || t === `자습 ${periodNum}교시`
                );

                return (
                  <div key={idx} className="flex items-center gap-3 bg-primary-50 px-4 py-3 rounded-xl">
                    <div className="w-8 h-8 bg-primary-600 text-white rounded-lg flex items-center justify-center text-sm font-bold shrink-0">
                      {periodNum}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-primary-700">
                        {subject.subject}
                        {isWedClub && profile?.club_name ? ` (${profile.club_name})` : ""}
                      </div>
                      <div className="text-xs text-gray-500">
                        {subject.teacher ? `${getFullName(subject.teacher, subject.subject)} 선생님` : ""}
                        {subject.room && <span> · {subject.room}</span>}
                        {isAfterPeriod && profile?.after_name ? ` · 방과후: ${profile.after_name}` : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
              {isFriday && (
                <div className="text-center text-xs text-gray-400 py-2">🏠 6교시 후 하교</div>
              )}
            </div>
          )}
        </div>
      )}
      </div>}
    </div>
  );
}
