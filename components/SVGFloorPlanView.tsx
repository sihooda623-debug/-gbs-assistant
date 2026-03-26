"use client";

import { getRoomsOnFloor } from "@/lib/building-data";
import { PathStep } from "@/lib/pathfinding";

interface Props {
  step: PathStep;
}

const CELL = 120;
const BUILDING_COLORS: Record<string, string> = {
  강의동: "#dbeafe",
  실험동: "#dcfce7",
  본관: "#fef9c3",
  외부: "#f3f4f6",
};

const TYPE_COLORS: Record<string, string> = {
  corridor: "#f0f0f0",
  staircase: "#e0e7ff",
  elevator: "#f5e6ff",
  entrance: "#ffe6e6",
};

export default function SVGFloorPlanView({ step }: Props) {
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

  // 경로에 포함된 방 ID 세트
  const pathRoomSet = new Set(step.pathRoomIds);

  // 좌표 변환: col→y축(세로), row→x축(가로)로 회전
  // U자 모양: 강의동(위좌), 본관(아래), 실험동(위우)
  const transformCoord = (col: number, row: number) => {
    if (row < 3) {
      // 강의동/실험동 (위쪽)
      // 강의동: col 0-7 → 가장 아래부터 위로 (반전)
      // 실험동: col 13-22 → 가장 아래부터 위로 (반전)
      let yOffset: number;
      if (col < 8) {
        // 강의동 (col 0-7)
        yOffset = (7 - col) * CELL + 20;
      } else {
        // 실험동 (col 13-22)
        yOffset = (22 - col) * CELL + 20;
      }
      return {
        x: row * CELL + 20,
        y: yOffset,
      };
    } else {
      // 본관 (아래쪽)
      return {
        x: col * CELL + 20,
        y: (row - 3) * CELL + 650,
      };
    }
  };

  // SVG 뷰박스 계산
  const viewBoxWidth = 23 * CELL;
  const viewBoxHeight = 7 * CELL;

  // 경로 포인트 계산
  const pathPoints = step.pathRoomIds
    .map(id => {
      const room = rooms.find(r => r.id === id);
      if (!room) return null;
      const coord = transformCoord(room.col + room.width / 2, room.row + room.height / 2);
      return coord;
    })
    .filter((p): p is { x: number; y: number } => p !== null);

  const polyline = pathPoints.map(p => `${p.x},${p.y}`).join(" ");
  const pathColor = step.isOutdoor ? "#f59e0b" : "#3b82f6";
  const glowColor = step.isOutdoor ? "#fcd34d" : "#93c5fd";

  const firstRoom = rooms.find(r => r.id === step.pathRoomIds[0]);
  const lastRoom = rooms.find(r => r.id === step.pathRoomIds[step.pathRoomIds.length - 1]);
  const startPos = firstRoom ? transformCoord(firstRoom.col + firstRoom.width / 2, firstRoom.row + firstRoom.height / 2) : null;
  const endPos = (lastRoom && lastRoom.id !== firstRoom?.id) ? transformCoord(lastRoom.col + lastRoom.width / 2, lastRoom.row + lastRoom.height / 2) : null;

  const FLOOR_ACCENT: Record<number, string> = {
    1: "#0ea5e9",
    2: "#8b5cf6",
    3: "#10b981",
    4: "#f59e0b",
    5: "#ef4444",
  };
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
      <div className="relative w-full bg-white" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          style={{ width: "100%", height: "100%", pointerEvents: "none" }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 방 그리기 */}
          {rooms.map((room) => {
            const isInPath = pathRoomSet.has(room.id);
            const color = TYPE_COLORS[room.type] || BUILDING_COLORS[room.building] || "#f3f4f6";
            const fillColor = isInPath ? "rgba(251, 191, 36, 0.5)" : color;

            const coord1 = transformCoord(room.col, room.row);
            const coord2 = transformCoord(room.col + room.width, room.row + room.height);
            const x = Math.min(coord1.x, coord2.x);
            const y = Math.min(coord1.y, coord2.y);
            const width = Math.abs(coord2.x - coord1.x);
            const height = Math.abs(coord2.y - coord1.y);

            const centerCoord = transformCoord(room.col + room.width / 2, room.row + room.height / 2);

            return (
              <g key={room.id}>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={fillColor}
                  stroke="#999"
                  strokeWidth={0.5}
                />
                {/* 방 이름 라벨 (모든 방) */}
                <text
                  x={centerCoord.x}
                  y={centerCoord.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={width > 60 ? "11" : "8"}
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
                strokeWidth={12}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.4}
              />
              <polyline
                points={polyline}
                stroke={pathColor}
                strokeWidth={5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={step.isOutdoor ? "8 4" : undefined}
                opacity={0.95}
              />
            </>
          )}

          {/* S 마커 */}
          {startPos && (
            <g>
              <circle cx={startPos.x} cy={startPos.y} r={12} fill="#22c55e" stroke="white" strokeWidth={1.5} />
              <text
                x={startPos.x} y={startPos.y + 0.3}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="10" fill="white" fontWeight="bold"
                style={{ userSelect: "none" }}
              >S</text>
            </g>
          )}

          {/* E 마커 */}
          {endPos && (
            <g>
              <circle cx={endPos.x} cy={endPos.y} r={12} fill="#ef4444" stroke="white" strokeWidth={1.5} />
              <text
                x={endPos.x} y={endPos.y + 0.3}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="10" fill="white" fontWeight="bold"
                style={{ userSelect: "none" }}
              >E</text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
