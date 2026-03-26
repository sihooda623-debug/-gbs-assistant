"use client";

import { getRoomsOnFloor, getRoomById } from "@/lib/building-data";
import { PathStep } from "@/lib/pathfinding";

interface Props {
  step: PathStep;
}

const FLOOR_ACCENT: Record<number, string> = {
  1: "#0ea5e9",
  2: "#8b5cf6",
  3: "#10b981",
  4: "#f59e0b",
  5: "#ef4444",
};

// 사용자가 제공한 좌표를 기반으로 SVG 렌더
export default function FloorPlanView({ step }: Props) {
  // 계단 이동
  if (step.isStairs) {
    const goUp = (step.stairTo ?? 0) > (step.stairFrom ?? 0);
    return (
      <div className="w-full rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #312e81 0%, #4338ca 100%)" }}>
        <div className="flex flex-col items-center justify-center py-12 gap-5">
          <span className="text-5xl">🪜</span>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <span className="text-white/60 text-xs">현재</span>
              <span className="bg-white/20 text-white font-bold text-2xl px-6 py-3 rounded-2xl">
                {step.stairFrom}층
              </span>
            </div>
            <span className="text-4xl text-white/80">{goUp ? "↑" : "↓"}</span>
            <div className="flex flex-col items-center gap-1">
              <span className="text-white/60 text-xs">이동</span>
              <span className="bg-white text-indigo-700 font-bold text-2xl px-6 py-3 rounded-2xl shadow-lg">
                {step.stairTo}층
              </span>
            </div>
          </div>
          <p className="text-white/60 text-sm">계단을 이용해 이동합니다</p>
        </div>
      </div>
    );
  }

  const rooms = getRoomsOnFloor(step.floor);
  if (!rooms || rooms.length === 0) return null;

  const pathRoomSet = new Set(step.pathRoomIds);

  // SVG 크기 설정 (사용자 좌표 범위 기반: 0~100)
  const SVG_WIDTH = 1000;
  const SVG_HEIGHT = 900;
  const SCALE = 10; // 좌표 100 = SVG 1000픽셀

  // 경로 포인트 (imageX, imageY 직접 사용)
  const pathPoints = step.pathRoomIds
    .map(id => {
      const room = getRoomById(id);
      if (!room || room.imageX === undefined || room.imageY === undefined) return null;
      return { x: room.imageX * SCALE, y: room.imageY * SCALE };
    })
    .filter((p): p is { x: number; y: number } => p !== null);

  const polyline = pathPoints.map(p => `${p.x},${p.y}`).join(" ");
  const pathColor = step.isOutdoor ? "#f59e0b" : "#3b82f6";
  const glowColor = step.isOutdoor ? "#fcd34d" : "#93c5fd";

  const firstRoom = getRoomById(step.pathRoomIds[0]);
  const lastRoom = getRoomById(step.pathRoomIds[step.pathRoomIds.length - 1]);
  const startPos = (firstRoom && firstRoom.imageX !== undefined && firstRoom.imageY !== undefined)
    ? { x: firstRoom.imageX * SCALE, y: firstRoom.imageY * SCALE }
    : null;
  const endPos = (lastRoom && lastRoom.id !== firstRoom?.id && lastRoom.imageX !== undefined && lastRoom.imageY !== undefined)
    ? { x: lastRoom.imageX * SCALE, y: lastRoom.imageY * SCALE }
    : null;

  const accent = FLOOR_ACCENT[step.floor] ?? "#6b7280";

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-gray-200">
      {/* 층 라벨 */}
      <div className="flex items-center gap-2 px-3 py-2" style={{ background: accent }}>
        <span className="text-white font-bold text-sm">{step.floor}층</span>
        {step.isOutdoor && (
          <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">실외 구간</span>
        )}
      </div>

      {/* SVG 평면도 */}
      <div className="relative w-full bg-white flex items-center justify-center" style={{ minHeight: "600px" }}>
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          style={{ width: "100%", maxWidth: "900px", height: "auto", pointerEvents: "none" }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 방들 그리기 */}
          {rooms.map((room) => {
            if (!room.imageX || !room.imageY) return null;

            const isInPath = pathRoomSet.has(room.id);
            const size = 30; // 기본 방 크기
            const x = room.imageX * SCALE - size / 2;
            const y = room.imageY * SCALE - size / 2;

            let color = "#e5e7eb"; // 기본 회색
            if (room.building === "강의동") color = "#dbeafe"; // 파랑
            if (room.building === "실험동") color = "#dcfce7"; // 초록
            if (room.building === "본관") color = "#fef9c3"; // 노랑
            if (room.type === "corridor") color = "#f3f4f6";
            if (room.type === "staircase") color = "#e0e7ff";

            if (isInPath) color = "rgba(251, 191, 36, 0.6)"; // 형광

            return (
              <g key={room.id}>
                <circle cx={room.imageX * SCALE} cy={room.imageY * SCALE} r="15" fill={color} stroke="#999" strokeWidth="1" />
                <text
                  x={room.imageX * SCALE}
                  y={room.imageY * SCALE + 25}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#333"
                  fontWeight="500"
                  style={{ userSelect: "none", pointerEvents: "none" }}
                >
                  {room.name}
                </text>
              </g>
            );
          })}

          {/* 경로 글로우 + 선 */}
          {pathPoints.length > 1 && (
            <>
              <polyline
                points={polyline}
                stroke={glowColor}
                strokeWidth={20}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.4}
              />
              <polyline
                points={polyline}
                stroke={pathColor}
                strokeWidth={8}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.95}
              />
            </>
          )}

          {/* S 마커 */}
          {startPos && (
            <g>
              <circle cx={startPos.x} cy={startPos.y} r={18} fill="#22c55e" stroke="white" strokeWidth={2} />
              <text
                x={startPos.x} y={startPos.y + 1}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="14" fill="white" fontWeight="bold"
                style={{ userSelect: "none" }}
              >S</text>
            </g>
          )}

          {/* E 마커 */}
          {endPos && (
            <g>
              <circle cx={endPos.x} cy={endPos.y} r={18} fill="#ef4444" stroke="white" strokeWidth={2} />
              <text
                x={endPos.x} y={endPos.y + 1}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="14" fill="white" fontWeight="bold"
                style={{ userSelect: "none" }}
              >E</text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
