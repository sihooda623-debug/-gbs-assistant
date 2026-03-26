"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const STEPS = ["기본정보", "R&E", "동아리", "방과후"];

const CLUBS = [
  { name: "LIMES", desc: "수학반" },
  { name: "NEO", desc: "현대물리 및 반도체 탐구반" },
  { name: "CHEX", desc: "화학실험반" },
  { name: "In Vitro", desc: "생명과학반" },
  { name: "UNREVR", desc: "과학융합반" },
  { name: "NEXT", desc: "로봇탐구토론반" },
  { name: "RootM", desc: "수학체험반" },
  { name: "Andamiro", desc: "물리탐구토론반" },
  { name: "E.Q.", desc: "응용화학반" },
  { name: "GLOBE", desc: "환경 및 에너지 탐구반" },
  { name: "Pulcherrima", desc: "천체관측반" },
  { name: "SADA", desc: "인공지능연구개발반" },
  { name: "Na'PLACE", desc: "응용수학반" },
  { name: "LAONZENA", desc: "수학탐구반" },
  { name: "T.I.P.S", desc: "물리실험탐구반" },
  { name: "EDTA", desc: "화학탐구반" },
  { name: "DNA", desc: "생명과학탐구반" },
  { name: "Archi", desc: "기상현상 및 건축반" },
];

const RNE_FIELDS = ["수학", "물리", "화학", "생명", "지구과학", "정보"];

const AFTER_SCHOOL_PERIODS = [
  { period: "자습 1교시", startTime: "18:50", endTime: "19:40" },
  { period: "자습 2교시", startTime: "19:50", endTime: "20:40" },
  { period: "자습 3교시", startTime: "20:50", endTime: "21:40" },
];

const TIME_OPTIONS = Array.from({ length: 19 }, (_, i) => {
  const hour = Math.floor(i / 2) + 13;
  const min = i % 2 === 0 ? "00" : "30";
  return `${hour}:${min}`;
}); // 13:00 ~ 21:30 (30분 단위)

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // 기본 정보
  const [grade, setGrade] = useState("");
  const [classNum, setClassNum] = useState("");
  const [name, setName] = useState("");

  // R&E
  const [rneDecided, setRneDecided] = useState<boolean | null>(null);
  const [rneField, setRneField] = useState("");
  const [rneName, setRneName] = useState("");
  const [rneTeacher, setRneTeacher] = useState("");
  const [rnePartners, setRnePartners] = useState("");

  // 동아리
  const [clubName, setClubName] = useState("");
  const [clubDay, setClubDay] = useState("");
  const [clubTime, setClubTime] = useState("");
  const [clubPlace, setClubPlace] = useState("");

  // 방과후
  const [afterName, setAfterName] = useState("");
  const [afterDay, setAfterDay] = useState("");
  const [afterTimes, setAfterTimes] = useState<string[]>([]);

  function nextStep() {
    setStep((s) => s + 1);
  }

  async function handleFinish() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { error: upsertError } = await supabase.from("profiles").upsert({
      id: user.id,
      name,
      grade: Number(grade),
      class_num: Number(classNum),
      rne_name: rneDecided ? rneName : (rneField ? `[${rneField} 분야 검토 중]` : ""),
      rne_teacher: rneTeacher,
      rne_partners: rnePartners,
      club_name: clubName,
      club_day: clubName ? "수" : "",
      club_time: clubName ? "16:00" : "",
      club_place: clubPlace,
      after_name: afterName,
      after_day: afterDay,
      after_time: JSON.stringify(afterTimes),
    });
    if (upsertError) {
      alert("저장에 실패했어요: " + upsertError.message);
      setLoading(false);
      return;
    }

    router.push("/");
    setLoading(false);
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* 진행 바 */}
      <div className="bg-white px-6 pt-10 pb-4">
        <div className="flex gap-1 mb-4">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                i <= step ? "bg-blue-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400">{step + 1} / {STEPS.length}</p>
        <h2 className="text-xl font-bold text-gray-900 mt-1">{STEPS[step]} 입력</h2>
      </div>

      <div className="flex-1 px-6 pt-4 flex flex-col gap-4 overflow-y-auto pb-4">

        {/* Step 0: 기본정보 */}
        {step === 0 && (
          <>
            <Field label="이름">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" className={inputClass} />
            </Field>
            <div className="flex gap-3">
              <Field label="학년" className="flex-1">
                <select value={grade} onChange={(e) => setGrade(e.target.value)} className={inputClass}>
                  <option value="">선택</option>
                  <option value="1">1학년</option>
                  <option value="2">2학년</option>
                  <option value="3">3학년</option>
                </select>
              </Field>
              <Field label="반" className="flex-1">
                <select value={classNum} onChange={(e) => setClassNum(e.target.value)} className={inputClass}>
                  <option value="">선택</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}반</option>
                  ))}
                </select>
              </Field>
            </div>
          </>
        )}

        {/* Step 1: R&E */}
        {step === 1 && (
          <>
            <p className="text-sm text-gray-500">R&E가 결정됐나요?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setRneDecided(true)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${
                  rneDecided === true ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"
                }`}
              >
                결정됐어요
              </button>
              <button
                onClick={() => setRneDecided(false)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${
                  rneDecided === false ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"
                }`}
              >
                아직 미결정
              </button>
            </div>

            {/* 미결정: 분야만 선택 */}
            {rneDecided === false && (
              <>
                <p className="text-sm text-gray-500 -mb-1">관심 분야를 선택해요</p>
                <div className="flex flex-wrap gap-2">
                  {RNE_FIELDS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setRneField(f)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors ${
                        rneField === f ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* 결정됨: 상세 입력 */}
            {rneDecided === true && (
              <>
                <p className="text-sm text-gray-500 -mb-1">분야 선택</p>
                <div className="flex flex-wrap gap-2">
                  {RNE_FIELDS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setRneField(f)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors ${
                        rneField === f ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <Field label="R&E 주제">
                  <input value={rneName} onChange={(e) => setRneName(e.target.value)} placeholder="예: 양자컴퓨팅 기초 연구" className={inputClass} />
                </Field>
                <Field label="지도 선생님">
                  <input value={rneTeacher} onChange={(e) => setRneTeacher(e.target.value)} placeholder="예: 김철수 선생님" className={inputClass} />
                </Field>
                <Field label="같이 하는 친구들">
                  <input value={rnePartners} onChange={(e) => setRnePartners(e.target.value)} placeholder="예: 이영희, 박민준" className={inputClass} />
                </Field>
              </>
            )}
          </>
        )}

        {/* Step 2: 동아리 */}
        {step === 2 && (
          <>
            <p className="text-sm text-gray-500">본인의 동아리를 선택해요</p>
            <div className="flex flex-col gap-2">
              {CLUBS.map((club) => (
                <button
                  key={club.name}
                  onClick={() => setClubName(clubName === club.name ? "" : club.name)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-colors ${
                    clubName === club.name
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div>
                    <span className={`font-semibold text-sm ${clubName === club.name ? "text-blue-700" : "text-gray-800"}`}>
                      {club.name}
                    </span>
                    <span className={`text-xs ml-2 ${clubName === club.name ? "text-blue-500" : "text-gray-400"}`}>
                      {club.desc}
                    </span>
                  </div>
                  {clubName === club.name && (
                    <span className="text-blue-600 text-lg">✓</span>
                  )}
                </button>
              ))}
            </div>

            {clubName && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700 mt-1">
                📅 동아리 활동은 <strong>매주 수요일 7교시 (16:00 ~ 16:50)</strong> 고정이에요
              </div>
            )}
          </>
        )}

        {/* Step 3: 방과후 */}
        {step === 3 && (
          <>
            <p className="text-sm text-gray-500">없으면 비워두고 완료해도 돼요</p>
            <Field label="방과후 활동 이름">
              <input value={afterName} onChange={(e) => setAfterName(e.target.value)} placeholder="예: 수학 심화" className={inputClass} />
            </Field>
            <Field label="요일">
              <div className="flex gap-2 flex-wrap">
                {["월","화","수","목","금"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setAfterDay(d)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors ${
                      afterDay === d ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"
                    }`}
                  >
                    {d}요일
                  </button>
                ))}
              </div>
            </Field>
            <Field label="시간 (중복 선택 가능)">
              <p className="text-xs text-gray-400 mb-2">방과후가 있는 교시를 모두 선택해요</p>
              <div className="flex flex-col gap-2">
                {AFTER_SCHOOL_PERIODS.map((p) => {
                  const selected = afterTimes.includes(p.period);
                  return (
                    <button
                      key={p.period}
                      type="button"
                      onClick={() => setAfterTimes(
                        selected
                          ? afterTimes.filter((t) => t !== p.period)
                          : [...afterTimes, p.period]
                      )}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-colors ${
                        selected ? "border-blue-600 bg-blue-50" : "border-gray-200"
                      }`}
                    >
                      <span className={`text-sm font-semibold ${selected ? "text-blue-700" : "text-gray-700"}`}>
                        {p.period}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{p.startTime} ~ {p.endTime}</span>
                        {selected && <span className="text-blue-600">✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Field>
          </>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="px-6 pb-10 pt-4">
        {step < STEPS.length - 1 ? (
          <button onClick={nextStep} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm">
            다음
          </button>
        ) : (
          <button onClick={handleFinish} disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-60">
            {loading ? "저장 중..." : "완료! 시작하기 🚀"}
          </button>
        )}
      </div>
    </div>
  );
}

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 bg-white";

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
      {children}
    </div>
  );
}
