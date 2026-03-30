"use client";

import { useState } from "react";
import { Room, searchRooms } from "@/lib/building-data";
import { findPath, PathStep } from "@/lib/pathfinding";
import FloorPlanView from "@/components/FloorPlanView";

const STEP_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  indoor:  { bg: "bg-gray-50",   border: "border-primary-200",   icon: "🚶" },
  outdoor: { bg: "bg-amber-50",  border: "border-amber-200",  icon: "☀️" },
  stairs:  { bg: "bg-indigo-50", border: "border-indigo-200", icon: "🪜" },
  arrive:  { bg: "bg-success-50",  border: "border-success-200",  icon: "🎯" },
};

function getStepStyle(step: PathStep, isLast: boolean) {
  if (isLast && !step.isStairs) return STEP_STYLES.arrive;
  if (step.isStairs) return STEP_STYLES.stairs;
  if (step.isOutdoor) return STEP_STYLES.outdoor;
  return STEP_STYLES.indoor;
}

export default function MapPage() {
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [fromResults, setFromResults] = useState<Room[]>([]);
  const [toResults, setToResults] = useState<Room[]>([]);
  const [fromRoom, setFromRoom] = useState<Room | null>(null);
  const [toRoom, setToRoom] = useState<Room | null>(null);

  const [steps, setSteps] = useState<PathStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"search" | "navigate">("search");

  function handleFromChange(val: string) {
    setFromQuery(val);
    setFromRoom(null);
    setFromResults(searchRooms(val));
    resetPath();
  }

  function handleToChange(val: string) {
    setToQuery(val);
    setToRoom(null);
    setToResults(searchRooms(val));
    resetPath();
  }

  function selectFrom(room: Room) {
    setFromRoom(room);
    setFromQuery(room.name);
    setFromResults([]);
    resetPath();
  }

  function selectTo(room: Room) {
    setToRoom(room);
    setToQuery(room.name);
    setToResults([]);
    resetPath();
  }

  function resetPath() {
    setSteps([]);
    setCurrentStep(0);
    setMode("search");
    setError("");
  }

  async function handleSearch() {
    if (!fromRoom || !toRoom) {
      setError("출발지와 목적지를 모두 선택해주세요.");
      return;
    }
    const result = findPath(fromRoom.id, toRoom.id);
    if (!result || result.length === 0) {
      setError("경로를 찾을 수 없습니다.");
      return;
    }

    setSteps(result);
    setCurrentStep(0);
    setMode("navigate");
    setError("");

    // OpenRouter로 경로 설명 개선 (백그라운드)
    try {
      const response = await fetch("/api/enhance-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steps: result,
          fromRoom: fromRoom.name,
          toRoom: toRoom.name,
        }),
      });

      if (response.ok) {
        const { steps: enhancedSteps } = await response.json();
        setSteps(enhancedSteps);
      }
    } catch (error) {
      console.warn("Failed to enhance path descriptions:", error);
      // 실패해도 원본 설명으로 계속 진행
    }
  }

  function prevStep() { setCurrentStep((s) => Math.max(0, s - 1)); }
  function nextStep() { setCurrentStep((s) => Math.min(steps.length - 1, s + 1)); }

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const style = step ? getStepStyle(step, isLast) : STEP_STYLES.indoor;

  return (
    <div className="flex flex-col pb-24 min-h-screen" style={{ background: "#f0f4ff" }}>
      {/* 수정 중 배너 */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2">
        <span className="text-amber-500 text-base">🚧</span>
        <p className="text-xs font-semibold text-amber-700">길찾기 기능 수정 중입니다 — 경로가 부정확할 수 있어요</p>
      </div>

      {/* 헤더 */}
      <div style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)" }} className="px-4 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
            <span className="text-xl">🗺️</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">교내 길찾기</h1>
            <p className="text-primary-200 text-xs">층별 평면도로 안내</p>
          </div>
        </div>
      </div>

      {/* 검색 영역 */}
      <div className="mx-4 -mt-3 bg-white rounded-lg shadow-md px-4 py-4 flex flex-col gap-2.5 z-10 relative">
        {/* 출발지 */}
        <div className="relative">
          <div className={`flex items-center gap-2.5 border-2 rounded-xl px-3 py-2.5 transition-colors
            ${fromRoom ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-gray-50 focus-within:border-emerald-300"}`}>
            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <input
              type="text"
              placeholder="출발지 검색"
              value={fromQuery}
              onChange={(e) => handleFromChange(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400"
            />
            {fromRoom && (
              <button onClick={() => { setFromRoom(null); setFromQuery(""); resetPath(); }}
                className="w-5 h-5 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-500 text-xs shrink-0">✕</button>
            )}
          </div>
          {fromResults.length > 0 && (
            <ul className="absolute z-30 left-0 right-0 bg-white border border-gray-200 rounded-xl mt-1 shadow-xl overflow-hidden">
              {fromResults.map((r) => (
                <li key={r.id} onClick={() => selectFrom(r)}
                  className="px-4 py-3 text-sm cursor-pointer hover:bg-emerald-50 flex justify-between items-center border-b border-gray-200 last:border-0">
                  <span className="font-medium text-gray-800">{r.name}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {r.building} {r.floor}층
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 구분선 */}
        <div className="flex items-center gap-2 px-2">
          <div className="w-px h-4 bg-gray-200 ml-[11px]" />
          <span className="text-xs text-gray-300 ml-1">↓</span>
        </div>

        {/* 도착지 */}
        <div className="relative">
          <div className={`flex items-center gap-2.5 border-2 rounded-xl px-3 py-2.5 transition-colors
            ${toRoom ? "border-danger-400 bg-danger-50" : "border-gray-200 bg-gray-50 focus-within:border-danger-300"}`}>
            <div className="w-6 h-6 bg-danger-500 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">E</span>
            </div>
            <input
              type="text"
              placeholder="목적지 검색"
              value={toQuery}
              onChange={(e) => handleToChange(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400"
            />
            {toRoom && (
              <button onClick={() => { setToRoom(null); setToQuery(""); resetPath(); }}
                className="w-5 h-5 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-500 text-xs shrink-0">✕</button>
            )}
          </div>
          {toResults.length > 0 && (
            <ul className="absolute z-30 left-0 right-0 bg-white border border-gray-200 rounded-xl mt-1 shadow-xl overflow-hidden">
              {toResults.map((r) => (
                <li key={r.id} onClick={() => selectTo(r)}
                  className="px-4 py-3 text-sm cursor-pointer hover:bg-danger-50 flex justify-between items-center border-b border-gray-200 last:border-0">
                  <span className="font-medium text-gray-800">{r.name}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {r.building} {r.floor}층
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="text-xs text-danger-500 text-center">{error}</p>}

        <button
          onClick={handleSearch}
          disabled={!fromRoom || !toRoom}
          className="w-full disabled:opacity-40 text-white rounded-xl py-3 text-sm font-bold transition-all active:scale-95"
          style={{ background: (!fromRoom || !toRoom) ? "#d1d5db" : "linear-gradient(90deg, #1d4ed8, #2563eb)" }}
        >
          길찾기 시작
        </button>
      </div>

      {/* 네비게이션 뷰 */}
      {mode === "navigate" && step && (
        <div className="flex flex-col px-4 pt-4 gap-3">

          {/* 단계 진행 바 */}
          <div className="bg-white rounded-lg px-4 py-3 flex items-center gap-3 ">
            <span className="text-xs font-bold text-primary-500 bg-gray-100 px-2.5 py-1 rounded-full shrink-0">
              {currentStep + 1} / {steps.length}
            </span>
            <div className="flex-1 flex gap-1 items-center overflow-hidden">
              {steps.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`transition-all rounded-full h-2 ${i === currentStep ? "bg-primary-500 flex-[2]" : "bg-gray-200 flex-1"}`}
                  title={s.instruction}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400 shrink-0">{isLast ? "마지막 단계" : `${steps.length - currentStep - 1}단계 남음`}</span>
          </div>

          {/* 현재 단계 카드 */}
          <div className="bg-white rounded-lg overflow-hidden  border border-gray-200">
            {/* 카드 헤더 */}
            <div className={`px-4 py-3 flex items-center gap-3 ${style.bg} border-b ${style.border}`}>
              <span className="text-2xl">{style.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-gray-800 leading-tight">{step.instruction}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {step.isStairs
                    ? `${step.stairFrom}층 → ${step.stairTo}층`
                    : `${step.floor}층${step.isOutdoor ? " · 실외 구간" : ""}`}
                </p>
              </div>
              {step.isOutdoor && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700 shrink-0">실외</span>
              )}
            </div>

            {/* 평면도 */}
            <div className="p-3">
              <FloorPlanView step={step} />
            </div>

            {/* 상세 설명 */}
            <div className="mx-3 mb-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
              <p className="text-sm text-gray-700 leading-relaxed">{step.detail}</p>
            </div>
          </div>

          {/* 이전/다음 버튼 */}
          <div className="flex gap-2.5">
            <button
              onClick={prevStep}
              disabled={isFirst}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 disabled:opacity-20 bg-white active:bg-gray-50 transition-all"
            >
              ← 이전
            </button>
            <button
              onClick={nextStep}
              disabled={isLast}
              className="flex-[2] py-3 rounded-xl text-sm font-bold transition-all active:scale-95 text-white"
              style={{ background: isLast ? "#22c55e" : "linear-gradient(90deg, #1d4ed8, #2563eb)" }}
            >
              {isLast ? "🎯 도착!" : "다음 단계 →"}
            </button>
          </div>

          {/* 전체 경로 요약 */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden ">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">전체 경로</span>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-gray-400">{steps.length}단계</span>
            </div>
            <ul className="px-3 py-1">
              {steps.map((s, i) => {
                const st = getStepStyle(s, i === steps.length - 1);
                const active = i === currentStep;
                return (
                  <li
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`flex items-center gap-3 py-2.5 cursor-pointer border-b border-gray-200 last:border-0 rounded-xl px-2 my-0.5 transition-colors ${active ? "bg-gray-50" : "hover:bg-gray-50"}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 ${active ? "bg-gray-100" : "bg-gray-100"}`}>
                      {st.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${active ? "font-semibold text-primary-500" : "text-gray-600"}`}>
                        {s.instruction}
                      </p>
                      <p className="text-xs text-gray-400">
                        {s.isStairs ? `${s.stairFrom}층 → ${s.stairTo}층` : `${s.floor}층${s.isOutdoor ? " · 실외" : ""}`}
                      </p>
                    </div>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* 검색 전 안내 */}
      {mode === "search" && (
        <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 gap-4 text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #dbeafe, #ede9fe)" }}>
            <span className="text-4xl">🏫</span>
          </div>
          <div>
            <p className="text-base font-bold text-gray-800">어디로 갈까요?</p>
            <p className="text-sm text-gray-400 mt-1">출발지와 목적지를 검색하면<br />층별 평면도로 안내해드려요</p>
          </div>
          <div className="w-full mt-2 grid grid-cols-2 gap-2">
            {[
              { icon: "🏢", title: "본관", desc: "계단·행정실·교무실" },
              { icon: "📚", title: "강의동", desc: "강의실 201~505" },
              { icon: "🔬", title: "실험동", desc: "과학 실험실" },
              { icon: "⚠️", title: "2층 연결", desc: "실외 통로 이용" },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-lg p-3 text-left  border border-gray-200">
                <span className="text-xl">{item.icon}</span>
                <p className="text-xs font-semibold text-gray-700 mt-1">{item.title}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
