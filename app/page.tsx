"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { COMMON_SCHEDULE, FRIDAY_CUTOFF_TIME } from "@/lib/schedule";
import { getFullName } from "@/lib/teachers";
import { FOOD_PREFS } from "./meal/page";
import { SCHOOL_EVENTS } from "@/lib/school-events";

type Homework = { id: string; title: string; due_date: string; completed: boolean; activity_type: string };
type MealItem = { name: string; allergens: number[] };

type Profile = {
  name: string;
  grade: number;
  class_num: number;
  club_name: string;
  after_name: string;
  after_day: string;
  after_time: string;
  rne_name: string;
};

const TYPE_META: Record<string, { emoji: string; label: string }> = {
  school: { emoji: "🏫", label: "학교" },
  rne:    { emoji: "🔬", label: "R&E" },
  club:   { emoji: "🎯", label: "동아리" },
  after:  { emoji: "📚", label: "방과후" },
};

type PeriodData = { weekday: number; classTime: number; teacher: string; subject: string };

const DAYS = ["월", "화", "수", "목", "금"];
const DAY_IDX: Record<string, number> = { 월: 0, 화: 1, 수: 2, 목: 3, 금: 4 };

function getCurrentPeriod() {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  let current = null;
  let next = null;
  for (let i = 0; i < COMMON_SCHEDULE.length; i++) {
    const item = COMMON_SCHEDULE[i];
    if (hhmm >= item.startTime && hhmm < item.endTime) { current = item; break; }
    if (hhmm < item.startTime && !next) { next = item; break; }
  }
  return { current, next };
}

export default function HomePage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [todayPeriods, setTodayPeriods] = useState<PeriodData[]>([]);
  const [upcomingHw, setUpcomingHw] = useState<Homework[]>([]);
  const [todayHw, setTodayHw] = useState<Homework[]>([]);
  const [lunchFavs, setLunchFavs] = useState<string[]>([]);
  const [, setTick] = useState(0);

  const today = new Date();
  const todayIdx = today.getDay() - 1; // 0=월 ~ 4=금
  const isWeekend = todayIdx < 0 || todayIdx > 4;
  const isFriday = todayIdx === 4;
  const dateStr = today.toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

  // 1분마다 현재 교시 갱신
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // 오늘 급식 + 선호 음식 체크
  useEffect(() => {
    if (isWeekend) return;
    const prefs: string[] = JSON.parse(localStorage.getItem("meal_prefs") ?? "[]");
    const allergens: number[] = JSON.parse(localStorage.getItem("meal_allergens") ?? "[]");
    if (prefs.length === 0 && allergens.length === 0) return;
    const d = today;
    const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
    fetch(`/api/meal?date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        const lunch: MealItem[] = data.meals?.["2"]?.items ?? [];
        const favMatches = lunch
          .filter((item) => prefs.some((pk) => {
            const fp = FOOD_PREFS.find((f) => f.key === pk);
            return fp ? fp.keywords.some((kw) => item.name.includes(kw)) : false;
          }))
          .map((item) => item.name);
        setLunchFavs(favMatches);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace("/login"); return; }
      setAuthChecked(true);

      supabase.from("profiles")
        .select("name, grade, class_num, club_name, after_name, after_day, after_time, rne_name")
        .eq("id", user.id).single()
        .then(({ data }) => {
          if (!data) { router.replace("/onboarding"); return; }
          setProfile(data as Profile);
          if (!isWeekend) {
            fetch(`/api/timetable?grade=${data.grade}&class=${data.class_num}`)
              .then((r) => r.json())
              .then((d) => { if (d.timetable?.[todayIdx]) setTodayPeriods(d.timetable[todayIdx]); });
          }
          const d = new Date();
          const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
          // 다가오는 숙제 (미완료, 마감일 기준 오름차순)
          supabase.from("homework").select("*")
            .eq("user_id", user.id).eq("completed", false)
            .gte("due_date", todayStr)
            .order("due_date", { ascending: true }).limit(5)
            .then(({ data: hw }) => { if (hw) setUpcomingHw(hw as Homework[]); });
          // 오늘 마감 숙제
          supabase.from("homework").select("*")
            .eq("user_id", user.id).eq("completed", false).eq("due_date", todayStr)
            .then(({ data: hw }) => { if (hw) setTodayHw(hw as Homework[]); });
        });
    }).catch(() => {
      setAuthChecked(true); // 에러 시에도 렌더링은 허용
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const { current, next } = getCurrentPeriod();
  const afterTimes: string[] = (() => {
    try { return JSON.parse(profile?.after_time ?? "[]"); } catch { return []; }
  })();
  const isClubToday = todayIdx === 2 && !!profile?.club_name;
  const isAfterToday = profile?.after_day ? DAY_IDX[profile.after_day] === todayIdx : false;

  // 오늘 수업 목록 (금요일은 6교시까지)
  const todayClasses = todayPeriods
    .map((p, i) => ({ ...p, periodNum: i + 1 }))
    .filter((p) => p.subject && !(isFriday && p.periodNum > 6));

  if (!authChecked) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col pb-4">
      {/* 헤더 */}
      <div className="bg-blue-600 text-white px-4 pt-10 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-sm">{dateStr}</p>
            <h1 className="text-2xl font-bold mt-1">
              {profile?.name ? `안녕하세요, ${profile.name} 👋` : "안녕하세요 👋"}
            </h1>
            {profile && (
              <p className="text-blue-100 text-sm mt-0.5">
                {profile.grade}학년 {profile.class_num}반
              </p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="bg-blue-500 hover:bg-blue-400 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 현재/다음 교시 카드 */}
      {!isWeekend && (
        <div className="px-4 -mt-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            {current ? (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">지금</p>
                  <p className="text-base font-bold text-gray-900">{current.period}</p>
                  <p className="text-xs text-gray-500">{current.startTime} ~ {current.endTime}</p>
                </div>
                {current.period.match(/^\d교시/) && (() => {
                  const num = Number(current.period[0]);
                  const subj = todayPeriods[num - 1];
                  return subj?.subject ? (
                    <div className="ml-auto text-right">
                      <p className="text-sm font-semibold text-blue-700">{subj.subject}</p>
                      {subj.teacher && (
                        <p className="text-xs text-gray-400">{getFullName(subj.teacher, subj.subject)} 선생님</p>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>
            ) : next ? (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">다음</p>
                  <p className="text-base font-bold text-gray-900">{next.period}</p>
                  <p className="text-xs text-gray-500">{next.startTime} ~ {next.endTime}</p>
                </div>
                {next.period.match(/^\d교시/) && (() => {
                  const num = Number(next.period[0]);
                  const subj = todayPeriods[num - 1];
                  return subj?.subject ? (
                    <div className="ml-auto text-right">
                      <p className="text-sm font-semibold text-blue-700">{subj.subject}</p>
                      {subj.teacher && (
                        <p className="text-xs text-gray-400">{getFullName(subj.teacher, subj.subject)} 선생님</p>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gray-300 rounded-full shrink-0" />
                <p className="text-sm text-gray-400">오늘 일과가 모두 끝났어요 🌙</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 오늘 활동 배지 */}
      {(isClubToday || isAfterToday) && (
        <div className="px-4 mt-3 flex gap-2">
          {isClubToday && (
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-full px-3 py-1.5">
              <span className="text-sm">🎯</span>
              <span className="text-xs font-medium text-green-700">오늘 동아리 · {profile?.club_name}</span>
            </div>
          )}
          {isAfterToday && profile?.after_name && (
            <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-100 rounded-full px-3 py-1.5">
              <span className="text-sm">📚</span>
              <span className="text-xs font-medium text-purple-700">방과후 · {profile.after_name}</span>
            </div>
          )}
        </div>
      )}

      {/* 오늘 시간표 */}
      {!isWeekend && (
        <div className="px-4 mt-4">
          <h2 className="text-base font-bold text-gray-800 mb-2">
            오늘 시간표 <span className="text-sm font-normal text-gray-400">({DAYS[todayIdx]}요일)</span>
          </h2>
          {todayClasses.length > 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {todayClasses.map((p, i) => {
                const isWedClub = todayIdx === 2 && p.periodNum === 7 && !!profile?.club_name;
                return (
                  <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-gray-50" : ""}`}>
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-md flex items-center justify-center text-xs font-bold shrink-0">
                      {p.periodNum}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-800">{p.subject}</span>
                      {isWedClub && profile?.club_name && (
                        <span className="text-xs text-green-600 ml-1">({profile.club_name})</span>
                      )}
                    </div>
                    {p.teacher && (
                      <span className="text-xs text-gray-400">{getFullName(p.teacher, p.subject)}</span>
                    )}
                  </div>
                );
              })}
              {isFriday && (
                <div className="border-t border-gray-50 px-4 py-2 text-center text-xs text-gray-400">
                  🏠 6교시 후 하교
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-5 text-center text-gray-400 text-sm">
              {profile ? "시간표를 불러오는 중이에요..." : "프로필을 설정하면 시간표가 표시돼요"}
            </div>
          )}
        </div>
      )}

      {isWeekend && (
        <div className="px-4 mt-6 text-center">
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-base font-bold text-gray-800">주말이에요!</p>
          <p className="text-sm text-gray-400 mt-1">푹 쉬세요</p>
        </div>
      )}

      {/* 방과후 시간표 */}
      {isAfterToday && afterTimes.length > 0 && (
        <div className="px-4 mt-4">
          <h2 className="text-base font-bold text-gray-800 mb-2">방과후</h2>
          <div className="bg-purple-50 rounded-2xl border border-purple-100 px-4 py-3 flex flex-col gap-1">
            {afterTimes.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-purple-400">▸</span>
                <span className="text-sm font-medium text-purple-700">{t}</span>
                <span className="text-xs text-purple-400 ml-auto">{profile?.after_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 오늘 급식 미리보기 */}
      {!isWeekend && lunchFavs.length > 0 && (
        <div className="px-4 mt-4">
          <Link href="/meal">
            <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">🍱</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-700">오늘 좋아하는 거 나와요!</p>
                <p className="text-xs text-orange-500 mt-0.5">{lunchFavs.join(", ")}</p>
              </div>
              <span className="text-orange-300 text-sm">›</span>
            </div>
          </Link>
        </div>
      )}

      {/* 활동 카드 */}
      {profile && (
        <div className="px-4 mt-4">
          <h2 className="text-base font-bold text-gray-800 mb-2">내 활동</h2>
          <div className="grid grid-cols-3 gap-2">
            <Link href="/activity/rne">
              <div className="bg-purple-50 rounded-2xl p-3 flex flex-col items-center gap-1 active:opacity-70">
                <span className="text-2xl">🔬</span>
                <span className="text-xs font-semibold text-purple-700">R&amp;E</span>
                {profile.rne_name && (
                  <span className="text-xs text-purple-400 text-center line-clamp-1">{profile.rne_name}</span>
                )}
              </div>
            </Link>
            <Link href="/activity/club">
              <div className="bg-green-50 rounded-2xl p-3 flex flex-col items-center gap-1 active:opacity-70">
                <span className="text-2xl">🎯</span>
                <span className="text-xs font-semibold text-green-700">동아리</span>
                {profile.club_name && (
                  <span className="text-xs text-green-400 text-center line-clamp-1">{profile.club_name}</span>
                )}
              </div>
            </Link>
            <Link href="/activity/after">
              <div className="bg-orange-50 rounded-2xl p-3 flex flex-col items-center gap-1 active:opacity-70">
                <span className="text-2xl">📚</span>
                <span className="text-xs font-semibold text-orange-700">방과후</span>
                {profile.after_name && (
                  <span className="text-xs text-orange-400 text-center line-clamp-1">{profile.after_name}</span>
                )}
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* 숙제 알림 */}
      {upcomingHw.length > 0 && (
        <div className="px-4 mt-4">
          <h2 className="text-base font-bold text-gray-800 mb-2">다가오는 숙제</h2>
          <div className="flex flex-col gap-2">
            {upcomingHw.map((h) => {
              const diff = Math.ceil((new Date(h.due_date).getTime() - new Date().setHours(0,0,0,0)) / 86400000);
              const label = diff === 0 ? "D-Day" : `D-${diff}`;
              const urgent = diff <= 3;
              const actMeta: Record<string, { emoji: string; name: string }> = {
                rne: { emoji: "🔬", name: "R&E" },
                club: { emoji: "🎯", name: "동아리" },
                after: { emoji: "📚", name: "방과후" },
              };
              const act = actMeta[h.activity_type] ?? { emoji: "📋", name: "" };
              return (
                <Link key={h.id} href={`/activity/${h.activity_type}`}>
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${urgent ? "bg-red-50 border-red-100" : "bg-white border-gray-100"}`}>
                    <span className="text-lg">{act.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{h.title}</p>
                      <p className="text-xs text-gray-400">{act.name} · {new Date(h.due_date).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${urgent ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
                      {label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 오늘의 학사일정 + 숙제 */}
      {(() => {
        const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
        const todaySchoolEvents = SCHOOL_EVENTS.filter(
          e => e.date === todayStr && (!e.grade || e.grade === profile?.grade)
        );
        if (todaySchoolEvents.length === 0 && todayHw.length === 0) return null;
        return (
          <div className="px-4 mt-4">
            <h2 className="text-base font-bold text-gray-800 mb-2">오늘의 일정</h2>
            <div className="flex flex-col gap-2">
              {todaySchoolEvents.map((ev, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                  ev.type === "holiday" ? "bg-red-50 border-red-100" :
                  ev.type === "exam" ? "bg-orange-50 border-orange-100" :
                  "bg-blue-50 border-blue-100"
                }`}>
                  <span className="text-lg">{ev.type === "holiday" ? "🏖️" : ev.type === "exam" ? "📝" : "📅"}</span>
                  <span className="text-sm font-medium text-gray-800">{ev.title}</span>
                </div>
              ))}
              {todayHw.map((h) => {
                const meta = TYPE_META[h.activity_type] ?? TYPE_META.school;
                return (
                  <div key={h.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-yellow-50 border-yellow-100">
                    <span className="text-lg">{meta.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{h.title}</p>
                      <p className="text-xs text-gray-400">{meta.label} · 오늘 마감</p>
                    </div>
                    <span className="text-xs font-bold text-red-500 bg-red-100 px-2 py-1 rounded-full">D-Day</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 프로필 미설정 안내 */}
      {!profile && (
        <div className="px-4 mt-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">⚙️</span>
            <div>
              <p className="text-sm font-semibold text-blue-800">프로필을 설정해보세요</p>
              <p className="text-xs text-blue-600 mt-0.5">
                학년·반·동아리를 등록하면
                <br />
                오늘 시간표와 일정이 자동으로 표시돼요
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
