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

const TYPE_META: Record<string, { label: string }> = {
  school:  { label: "학교" },
  general: { label: "기타" },
  rne:     { label: "R&E" },
  club:    { label: "동아리" },
  after:   { label: "방과후" },
};

type PeriodData = { weekday: number; classTime: number; teacher: string; subject: string; room: string };

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
  const [allPeriods, setAllPeriods] = useState<PeriodData[][]>([]);
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
    // 1단계: 로컬 세션 확인 (오프라인 지원)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }

      // 2단계: 캐시된 프로필 먼저 로드
      const cached = localStorage.getItem("cached_profile");
      if (cached) {
        try {
          const cachedProfile = JSON.parse(cached) as Profile;
          setProfile(cachedProfile);
          if (!isWeekend) {
            fetch(`/api/timetable?grade=${cachedProfile.grade}&class=${cachedProfile.class_num}`)
              .then((r) => r.json())
              .then((d) => {
                if (d.timetable) {
                  setAllPeriods(d.timetable);
                  if (d.timetable?.[todayIdx]) setTodayPeriods(d.timetable[todayIdx]);
                }
              })
              .catch(() => {});
          }
          const d = new Date();
          const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
          // 다가오는 숙제 - 캐시 또는 네트워크에서 로드
          Promise.resolve(
            supabase.from("homework").select("*")
              .eq("user_id", session.user.id).eq("completed", false)
              .gte("due_date", todayStr)
              .order("due_date", { ascending: true }).limit(5)
          ).then(({ data: hw }) => { if (hw) setUpcomingHw(hw as Homework[]); })
            .catch(() => {});
          // 오늘 마감 숙제
          Promise.resolve(
            supabase.from("homework").select("*")
              .eq("user_id", session.user.id).eq("completed", false).eq("due_date", todayStr)
          ).then(({ data: hw }) => { if (hw) setTodayHw(hw as Homework[]); })
            .catch(() => {});
        } catch (e) {
          console.error("캐시 로드 실패:", e);
        }
      }
      setAuthChecked(true);

      // 3단계: 백그라운드에서 Supabase 검증 및 업데이트
      Promise.resolve(supabase.auth.getUser()).then(({ data: { user } }) => {
        if (!user) { router.replace("/login"); return; }

        Promise.resolve(
          supabase.from("profiles")
            .select("name, grade, class_num, club_name, after_name, after_day, after_time, rne_name")
            .eq("id", user.id).single()
        ).then(({ data }) => {
          if (!data) { router.replace("/onboarding"); return; }
          setProfile(data as Profile);
          localStorage.setItem("cached_profile", JSON.stringify(data));
          if (!isWeekend) {
            fetch(`/api/timetable?grade=${data.grade}&class=${data.class_num}`)
              .then((r) => r.json())
              .then((d) => {
                if (d.timetable) {
                  setAllPeriods(d.timetable);
                  if (d.timetable?.[todayIdx]) setTodayPeriods(d.timetable[todayIdx]);
                }
              })
              .catch(() => {});
          }
          const d = new Date();
          const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
          Promise.resolve(
            supabase.from("homework").select("*")
              .eq("user_id", user.id).eq("completed", false)
              .gte("due_date", todayStr)
              .order("due_date", { ascending: true }).limit(5)
          ).then(({ data: hw }) => { if (hw) setUpcomingHw(hw as Homework[]); })
            .catch(() => {});
          Promise.resolve(
            supabase.from("homework").select("*")
              .eq("user_id", user.id).eq("completed", false).eq("due_date", todayStr)
          ).then(({ data: hw }) => { if (hw) setTodayHw(hw as Homework[]); })
            .catch(() => {});
        }).catch(() => {});
      }).catch(() => {});
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
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col pb-4 bg-white">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-5 pt-12 pb-8">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-gray-400 text-sm font-medium">{dateStr}</p>
            <h1 className="text-4xl font-bold mt-3 text-gray-800 leading-tight">
              {profile?.name ? (
                <>
                  안녕하세요,
                  <br className="hidden sm:block" />
                  {profile.name}
                </>
              ) : (
                "안녕하세요"
              )}
            </h1>
            {profile && (
              <p className="text-gray-500 text-sm mt-2 font-medium">
                {profile.grade}학년 {profile.class_num}반
              </p>
            )}
          </div>
          <button
            onClick={() => router.push("/profile")}
            className="w-12 h-12 rounded-full bg-gray-50 hover:bg-gray-100 active:scale-95 flex items-center justify-center text-primary-500 font-bold text-lg transition-all ml-4 shrink-0"
            title="프로필"
          >
            {profile?.name?.[0] ?? "?"}
          </button>
        </div>
      </div>

      {/* 현재/다음 교시 카드 */}
      {!isWeekend && (
        <div className="px-5 mt-6">
          <div className="bg-white rounded-lg  border border-gray-200 p-5">
            {current ? (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">지금</p>
                  <p className="text-base font-bold text-gray-800">{current.period}</p>
                  <p className="text-xs text-gray-500">{current.startTime} ~ {current.endTime}</p>
                </div>
                {current.period.match(/^\d교시/) && (() => {
                  const num = Number(current.period[0]);
                  const subj = todayPeriods[num - 1];
                  return subj?.subject ? (
                    <div className="ml-auto text-right">
                      <p className="text-sm font-semibold text-primary-500">{subj.subject}</p>
                      {subj.teacher && (
                        <p className="text-xs text-gray-400">{getFullName(subj.teacher, subj.subject)} 선생님</p>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>
            ) : next ? (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary-500 rounded-full shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">다음</p>
                  <p className="text-base font-bold text-gray-800">{next.period}</p>
                  <p className="text-xs text-gray-500">{next.startTime} ~ {next.endTime}</p>
                </div>
                {next.period.match(/^\d교시/) && (() => {
                  const num = Number(next.period[0]);
                  const subj = todayPeriods[num - 1];
                  return subj?.subject ? (
                    <div className="ml-auto text-right">
                      <p className="text-sm font-semibold text-primary-500">{subj.subject}</p>
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
        <div className="px-5 mt-5 flex gap-2">
          {isClubToday && (
            <div className="flex items-center gap-1.5 bg-success-50 border border-success-100 rounded-full px-3 py-1.5">
              <span className="text-xs font-medium text-success-700">오늘 동아리 · {profile?.club_name}</span>
            </div>
          )}
          {isAfterToday && profile?.after_name && (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
              <span className="text-xs font-medium text-gray-700">방과후 · {profile.after_name}</span>
            </div>
          )}
        </div>
      )}


      {/* 오늘 시간표 */}
      <div className="px-5 mt-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4">{isWeekend ? "주말 시간표" : `${DAYS[todayIdx]}요일 시간표`}</h2>
        {!isWeekend && allPeriods.length > 0 && allPeriods[todayIdx]?.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {allPeriods[todayIdx]
              .map((p, i) => ({ ...p, periodNum: i + 1 }))
              .filter((p) => p.subject)
              .map((p, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-gray-200" : ""}`}>
                  <div className="w-6 h-6 bg-gray-100 text-primary-500 rounded-md flex items-center justify-center text-xs font-bold shrink-0">
                    {p.periodNum}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-800">{p.subject}</span>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      {p.teacher && <span>{getFullName(p.teacher, p.subject)}</span>}
                      {p.room && <span>·</span>}
                      {p.room && <span>{p.room}</span>}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-5 text-center text-gray-400 text-sm">
            {profile ? "시간표를 불러오는 중이에요..." : "프로필을 설정하면 시간표가 표시돼요"}
          </div>
        )}
      </div>

      {isWeekend && (
        <div className="px-5 mt-12 text-center">
          <p className="text-base font-bold text-gray-800">주말이에요!</p>
          <p className="text-sm text-gray-400 mt-1">푹 쉬세요</p>
        </div>
      )}

      {/* 방과후 시간표 */}
      {isAfterToday && afterTimes.length > 0 && (
        <div className="px-5 mt-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">방과후</h2>
          <div className="bg-gray-50 rounded-lg border border-gray-200 px-4 py-3 flex flex-col gap-1">
            {afterTimes.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-400">▸</span>
                <span className="text-sm font-medium text-gray-700">{t}</span>
                <span className="text-xs text-gray-400 ml-auto">{profile?.after_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 오늘 급식 미리보기 */}
      {!isWeekend && lunchFavs.length > 0 && (
        <div className="px-5 mt-8">
          <Link href="/meal">
            <div className="bg-warning-50 border border-warning-100 rounded-lg px-4 py-3 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-warning-700">오늘 좋아하는 거 나와요!</p>
                <p className="text-xs text-warning-500 mt-0.5">{lunchFavs.join(", ")}</p>
              </div>
              <span className="text-warning-300 text-sm">›</span>
            </div>
          </Link>
        </div>
      )}

      {/* 활동 카드 */}
      {profile && (
        <div className="px-5 mt-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">내 활동</h2>
          <div className="grid grid-cols-4 gap-2">
            <Link href="/activity/general">
              <div className="bg-gray-50 rounded-lg p-3 flex flex-col items-center gap-1 active:opacity-70">
                <span className="text-xs font-semibold text-gray-700">기타</span>
              </div>
            </Link>
            <Link href="/activity/rne">
              <div className="bg-gray-50 rounded-lg p-3 flex flex-col items-center gap-1 active:opacity-70">
                <span className="text-xs font-semibold text-gray-700">R&amp;E</span>
                {profile.rne_name && (
                  <span className="text-xs text-gray-400 text-center line-clamp-1">{profile.rne_name}</span>
                )}
              </div>
            </Link>
            <Link href="/activity/club">
              <div className="bg-success-50 rounded-lg p-3 flex flex-col items-center gap-1 active:opacity-70">
                <span className="text-xs font-semibold text-success-700">동아리</span>
                {profile.club_name && (
                  <span className="text-xs text-success-400 text-center line-clamp-1">{profile.club_name}</span>
                )}
              </div>
            </Link>
            <Link href="/activity/after">
              <div className="bg-warning-50 rounded-lg p-3 flex flex-col items-center gap-1 active:opacity-70">
                <span className="text-xs font-semibold text-warning-700">방과후</span>
                {profile.after_name && (
                  <span className="text-xs text-warning-400 text-center line-clamp-1">{profile.after_name}</span>
                )}
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* 숙제 알림 */}
      {upcomingHw.length > 0 && (
        <div className="px-5 mt-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">다가오는 숙제</h2>
          <div className="flex flex-col gap-2">
            {upcomingHw.map((h) => {
              const diff = Math.ceil((new Date(h.due_date).getTime() - new Date().setHours(0,0,0,0)) / 86400000);
              const label = diff === 0 ? "D-Day" : `D-${diff}`;
              const urgent = diff <= 3;
              const actMeta: Record<string, { name: string }> = {
                general: { name: "기타" },
                rne: { name: "R&E" },
                club: { name: "동아리" },
                after: { name: "방과후" },
              };
              const act = actMeta[h.activity_type] ?? { name: "" };
              return (
                <Link key={h.id} href={`/activity/${h.activity_type}`}>
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${urgent ? "bg-danger-50 border-danger-100" : "bg-white border-gray-200"}`}>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{h.title}</p>
                      <p className="text-xs text-gray-400">{act.name} · {new Date(h.due_date).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${urgent ? "bg-danger-100 text-danger-600" : "bg-gray-100 text-primary-500"}`}>
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
          <div className="px-5 mt-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4">오늘의 일정</h2>
            <div className="flex flex-col gap-2">
              {todaySchoolEvents.map((ev, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                  ev.type === "holiday" ? "bg-danger-50 border-danger-100" :
                  ev.type === "exam" ? "bg-warning-50 border-warning-100" :
                  "bg-gray-50 border-gray-200"
                }`}>
                  <span className="text-sm font-medium text-gray-800">{ev.title}</span>
                </div>
              ))}
              {todayHw.map((h) => {
                const meta = TYPE_META[h.activity_type] ?? TYPE_META.school;
                return (
                  <div key={h.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-yellow-50 border-yellow-100">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{h.title}</p>
                      <p className="text-xs text-gray-400">{meta.label} · 오늘 마감</p>
                    </div>
                    <span className="text-xs font-bold text-danger-500 bg-danger-100 px-2 py-1 rounded-full">D-Day</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 프로필 미설정 안내 */}
      {!profile && (
        <div className="px-5 mt-8">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-3">
            <div>
              <p className="text-sm font-semibold text-primary-500">프로필을 설정해보세요</p>
              <p className="text-xs text-primary-500 mt-0.5">
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
