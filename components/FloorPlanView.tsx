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

export default function FloorPlanView({ step }: Props) {
  // 계단 이동
  if (step.isStairs) {
    const goUp = (step.stairTo ?? 0) > (step.stairFrom ?? 0);
    return (
      <div className="w-full rounded-lg overflow-hidden"
        style={{ background: "linear-gradient(135deg, #312e81 0%, #4338ca 100%)" }}>
        <div className="flex flex-col items-center justify-center py-12 gap-5">
          <span className="text-5xl">🪜</span>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <span className="text-white/60 text-xs">현재</span>
              <span className="bg-white/20 text-white font-bold text-2xl px-6 py-3 rounded-lg">
                {step.stairFrom}층
              </span>
            </div>
            <span className="text-4xl text-white/80">{goUp ? "↑" : "↓"}</span>
            <div className="flex flex-col items-center gap-1">
              <span className="text-white/60 text-xs">이동</span>
              <span className="bg-white text-indigo-700 font-bold text-2xl px-6 py-3 rounded-lg shadow-lg">
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

  const SVG_WIDTH = 1000;
  const SVG_HEIGHT = 900;
  const SCALE = 10;

  // 경로 포인트
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
    <div className="w-full rounded-lg overflow-hidden border border-gray-200">
      <div className="flex items-center gap-2 px-3 py-2" style={{ background: accent }}>
        <span className="text-white font-bold text-sm">{step.floor}층</span>
        {step.isOutdoor && (
          <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">실외 구간</span>
        )}
      </div>

      <div className="relative w-full bg-white flex items-center justify-center" style={{ minHeight: "700px" }}>
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          style={{ width: "100%", maxWidth: "900px", height: "auto", pointerEvents: "none" }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 건물 테두리와 복도 */}
          {/* 강의동 박스 (좌측) */}
          <rect x={0} y={0} width={80} height={100} fill="none" stroke="#999" strokeWidth={2} />
          {/* 본관 박스 (중앙 하단) */}
          <rect x={0} y={100} width={1000} height={250} fill="none" stroke="#999" strokeWidth={2} />
          {/* 실험동 박스 (우측) */}
          <rect x={920} y={0} width={80} height={100} fill="none" stroke="#999" strokeWidth={2} />

          {/* 복도 라인 */}
          <line x1={0} y1={50} x2={1000} y2={50} stroke="#ddd" strokeWidth={8} /> {/* 가로 복도 */}
          <line x1={40} y1={0} x2={40} y2={150} stroke="#ddd" strokeWidth={6} /> {/* 세로 복도 */}
          <line x1={960} y1={0} x2={960} y2={150} stroke="#ddd" strokeWidth={6} /> {/* 세로 복도 */}

          {/* 방들 그리기 */}
          {rooms.map((room) => {
            if (!room.imageX || !room.imageY) return null;

            const isInPath = pathRoomSet.has(room.id);
            const x = room.imageX * SCALE;
            const y = room.imageY * SCALE;

            let color = "#e5e7eb";
            if (room.building === "강의동") color = "#dbeafe";
            if (room.building === "실험동") color = "#dcfce7";
            if (room.building === "본관") color = "#fef9c3";
            if (room.type === "corridor") color = "#f1f5f9";
            if (room.type === "staircase") color = "#e0e7ff";
            if (isInPath) color = "rgba(251, 191, 36, 0.7)";

            return (
              <g key={room.id}>
                <circle cx={x} cy={y} r={12} fill={color} stroke="#666" strokeWidth={1} />
                <text
                  x={x}
                  y={y + 22}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#333"
                  style={{ userSelect: "none", pointerEvents: "none" }}
                >
                  {room.name}
                </text>
              </g>
            );
          })}

          {/* 경로 */}
          {pathPoints.length > 1 && (
            <>
              <polyline points={polyline} stroke={glowColor} strokeWidth={16} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.3} />
              <polyline points={polyline} stroke={pathColor} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
            </>
          )}

          {/* 마커 */}
          {startPos && (
            <g>
              <circle cx={startPos.x} cy={startPos.y} r={16} fill="#22c55e" stroke="white" strokeWidth={2} />
              <text x={startPos.x} y={startPos.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="white" fontWeight="bold">S</text>
            </g>
          )}
          {endPos && (
            <g>
              <circle cx={endPos.x} cy={endPos.y} r={16} fill="#ef4444" stroke="white" strokeWidth={2} />
              <text x={endPos.x} y={endPos.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="white" fontWeight="bold">E</text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
