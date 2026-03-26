"use client";

import { useState } from "react";
import { Room, searchRooms } from "@/lib/building-data";
import { findPath, PathStep } from "@/lib/pathfinding";
import FloorPlanView from "@/components/FloorPlanView";

const STEP_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  indoor:  { bg: "bg-blue-50",   border: "border-blue-200",   icon: "🚶" },
  outdoor: { bg: "bg-amber-50",  border: "border-amber-200",  icon: "☀️" },
  stairs:  { bg: "bg-indigo-50", border: "border-indigo-200", icon: "🪜" },
  arrive:  { bg: "bg-green-50",  border: "border-green-200",  icon: "🎯" },
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

  function handleSearch() {
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
  }

  function prevStep() { setCurrentStep((s) => Math.max(0, s - 1)); }
  function nextStep() { setCurrentStep((s) => Math.min(steps.length - 1, s + 1)); }

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const style = step ? getStepStyle(step, isLast) : STEP_STYLES.indoor;

  return (
    <div className="flex flex-col pb-24 min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white px-4 pt-10 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">교내 길찾기</h1>
        <p className="text-sm text-gray-500 mt-0.5">평면도로 안내합니다</p>
      </div>

      {/* 검색 영역 */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 flex flex-col gap-2.5">
        {/* 출발지 */}
        <div className="relative">
          <div className={`flex items-center gap-2.5 border rounded-xl px-4 py-3 bg-white transition-colors
            ${fromRoom ? "border-green-400 bg-green-50" : "border-gray-200 focus-within:border-green-400"}`}>
            <span className="text-green-500 text-lg leading-none">●</span>
            <input
              type="text"
              placeholder="출발지 (예: 강의실 301)"
              value={fromQuery}
              onChange={(e) => handleFromChange(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent"
            />
            {fromRoom && (
              <button onClick={() => { setFromRoom(null); setFromQuery(""); resetPath(); }}
                className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            )}
          </div>
          {fromResults.length > 0 && (
            <ul className="absolute z-30 left-0 right-0 bg-white border border-gray-200 rounded-xl mt-1 shadow-xl overflow-hidden">
              {fromResults.map((r) => (
                <li key={r.id} onClick={() => selectFrom(r)}
                  className="px-4 py-3 text-sm cursor-pointer hover:bg-green-50 flex justify-between items-center border-b border-gray-50 last:border-0">
                  <span className="font-medium text-gray-800">{r.name}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {r.building} {r.floor}층
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center px-4">
          <div className="w-0.5 h-5 bg-gray-200 ml-[7px]" />
        </div>

        {/* 도착지 */}
        <div className="relative">
          <div className={`flex items-center gap-2.5 border rounded-xl px-4 py-3 bg-white transition-colors
            ${toRoom ? "border-red-400 bg-red-50" : "border-gray-200 focus-within:border-red-400"}`}>
            <span className="text-red-500 text-lg leading-none">●</span>
            <input
              type="text"
              placeholder="목적지 (예: 물리실험실)"
              value={toQuery}
              onChange={(e) => handleToChange(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent"
            />
            {toRoom && (
              <button onClick={() => { setToRoom(null); setToQuery(""); resetPath(); }}
                className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            )}
          </div>
          {toResults.length > 0 && (
            <ul className="absolute z-30 left-0 right-0 bg-white border border-gray-200 rounded-xl mt-1 shadow-xl overflow-hidden">
              {toResults.map((r) => (
                <li key={r.id} onClick={() => selectTo(r)}
                  className="px-4 py-3 text-sm cursor-pointer hover:bg-red-50 flex justify-between items-center border-b border-gray-50 last:border-0">
                  <span className="font-medium text-gray-800">{r.name}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {r.building} {r.floor}층
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="text-xs text-red-500 text-center">{error}</p>}

        <button
          onClick={handleSearch}
          disabled={!fromRoom || !toRoom}
          className="w-full bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl py-3 text-sm font-bold transition-colors active:bg-blue-700"
        >
          길찾기 시작
        </button>
      </div>

      {/* 네비게이션 뷰 */}
      {mode === "navigate" && step && (
        <div className="flex flex-col flex-1 px-4 pt-4 gap-4">

          {/* 단계 진행 */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
              {currentStep + 1} / {steps.length} 단계
            </span>
            <div className="flex gap-1.5 items-center">
              {steps.map((s, i) => {
                const st = getStepStyle(s, i === steps.length - 1);
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`transition-all rounded-full ${i === currentStep
                      ? "w-5 h-2.5 bg-blue-600"
                      : "w-2 h-2 bg-gray-300"}`}
                    title={s.instruction}
                  />
                );
              })}
            </div>
          </div>

          {/* 현재 단계 카드 */}
          <div className={`border rounded-2xl overflow-hidden ${style.bg} ${style.border}`}>
            {/* 카드 헤더 */}
            <div className="px-4 pt-4 pb-3 flex items-start gap-3">
              <span className="text-2xl mt-0.5">{style.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-base font-bold text-gray-900">{step.instruction}</p>
                  {step.isOutdoor && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      실외
                    </span>
                  )}
                </div>
                {!step.isStairs && (
                  <p className="text-xs text-gray-500 mt-0.5">{step.floor}층</p>
                )}
              </div>
            </div>

            {/* 평면도 */}
            <div className="px-3 pb-2">
              <FloorPlanView
                step={step}
                overallFromId={fromRoom?.id ?? ""}
                overallToId={toRoom?.id ?? ""}
              />
            </div>

            {/* 상세 설명 */}
            <div className="mx-3 mb-3 bg-white rounded-xl px-4 py-3">
              <p className="text-sm text-gray-700 leading-relaxed">{step.detail}</p>
            </div>
          </div>

          {/* 이전/다음 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={prevStep}
              disabled={isFirst}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 disabled:opacity-30 active:bg-gray-100 transition-colors"
            >
              ← 이전
            </button>
            <button
              onClick={nextStep}
              disabled={isLast}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${isLast
                ? "bg-green-500 text-white"
                : "bg-blue-600 text-white active:bg-blue-700"}`}
            >
              {isLast ? "🎯 도착!" : "다음 →"}
            </button>
          </div>

          {/* 전체 경로 요약 */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">전체 경로</span>
            </div>
            <ul className="px-4 py-2">
              {steps.map((s, i) => {
                const st = getStepStyle(s, i === steps.length - 1);
                return (
                  <li
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`flex items-center gap-3 py-2.5 cursor-pointer border-b border-gray-50 last:border-0 transition-colors ${i === currentStep ? "opacity-100" : "opacity-50"}`}
                  >
                    <span className="text-base">{st.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${i === currentStep ? "font-semibold text-blue-600" : "text-gray-700"}`}>
                        {s.instruction}
                      </p>
                      <p className="text-xs text-gray-400">
                        {s.isStairs ? `${s.stairFrom}층 → ${s.stairTo}층` : `${s.floor}층${s.isOutdoor ? " · 실외" : ""}`}
                      </p>
                    </div>
                    {i === currentStep && <span className="text-blue-400 text-xs">◀</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* 검색 전 안내 */}
      {mode === "search" && (
        <div className="flex flex-col items-center justify-center flex-1 px-8 py-16 gap-3 text-center">
          <span className="text-5xl">🏫</span>
          <p className="text-base font-semibold text-gray-700">출발지와 목적지를 입력하세요</p>
          <p className="text-sm text-gray-400">
            교실 이름을 검색하면<br />
            평면도로 경로를 안내해드립니다
          </p>
          <div className="mt-4 flex flex-col gap-1.5 text-xs text-gray-400 text-left bg-gray-100 rounded-xl px-4 py-3">
            <p>🏢 <strong>본관</strong>: 계단·엘리베이터·행정실 등</p>
            <p>📚 <strong>강의동</strong>: 강의실 201~505</p>
            <p>🔬 <strong>실험동</strong>: 각 과학 실험실</p>
            <p>⚠️ 2층 강의동↔실험동: 실외 통로 이용</p>
          </div>
        </div>
      )}
    </div>
  );
}
