"use client";

import { getRoomById } from "@/lib/building-data";
import { PathStep } from "@/lib/pathfinding";
import { getFloorConfig, getRoomCenter } from "@/lib/floor-plan-coords";

interface Props {
  step: PathStep;
  overallFromId: string;
  overallToId: string;
}

export default function FloorPlanView({ step, overallFromId, overallToId }: Props) {
  // 계단 단계: 이미지 대신 층 이동 표시
  if (step.isStairs) {
    const goUp = (step.stairTo ?? 0) > (step.stairFrom ?? 0);
    return (
      <div className="w-full rounded-2xl bg-indigo-50 border-2 border-indigo-200 flex flex-col items-center justify-center py-10 gap-4">
        <span className="text-6xl">🪜</span>
        <div className="flex items-center gap-4 font-bold text-lg">
          <span className="bg-white border border-indigo-300 rounded-xl px-5 py-2 text-indigo-700">
            {step.stairFrom}층
          </span>
          <span className="text-3xl text-indigo-500">{goUp ? "▲" : "▼"}</span>
          <span className="bg-indigo-600 text-white rounded-xl px-5 py-2">
            {step.stairTo}층
          </span>
        </div>
        <p className="text-sm text-indigo-400">계단을 이용해 이동합니다</p>
      </div>
    );
  }

  const config = getFloorConfig(step.floor);
  if (!config) return null;

  const { imageUrl, fullW, fullH, cropY, cropH } = config;

  // 경로 포인트 계산
  const pathPoints = step.pathRoomIds
    .map((id) => {
      const room = getRoomById(id);
      if (!room) return null;
      return getRoomCenter(room);
    })
    .filter((p): p is { x: number; y: number } => p !== null);

  // 출발/도착 마커 (해당 층에 있을 때만 표시)
  const startRoom = getRoomById(overallFromId);
  const endRoom = getRoomById(overallToId);
  const startPos =
    startRoom && startRoom.floor === step.floor ? getRoomCenter(startRoom) : null;
  const endPos =
    endRoom && endRoom.floor === step.floor ? getRoomCenter(endRoom) : null;

  const polyline = pathPoints.map((p) => `${p.x},${p.y}`).join(" ");
  const pathColor = step.isOutdoor ? "#f59e0b" : "#00e676";
  const glowColor = step.isOutdoor ? "#fbbf24" : "#00ff88";

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-gray-200 bg-white">
      <svg
        viewBox={`0 ${cropY} ${fullW} ${cropH}`}
        style={{ width: "100%", display: "block", minWidth: 280 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 실제 평면도 이미지 */}
        <image href={imageUrl} x="0" y="0" width={fullW} height={fullH} />

        {/* 경로 외부 발광 효과 */}
        {pathPoints.length > 1 && (
          <>
            <polyline
              points={polyline}
              stroke={glowColor}
              strokeWidth={20}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.2}
            />
            <polyline
              points={polyline}
              stroke={pathColor}
              strokeWidth={8}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={step.isOutdoor ? "18 8" : undefined}
              opacity={0.92}
            />
          </>
        )}

        {/* 중간 경유 점 */}
        {pathPoints.map(
          (p, i) =>
            i > 0 &&
            i < pathPoints.length - 1 && (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={7}
                fill={pathColor}
                stroke="white"
                strokeWidth={2}
                opacity={0.85}
              />
            )
        )}

        {/* 출발 마커 (초록 S) */}
        {startPos && (
          <g>
            <circle cx={startPos.x} cy={startPos.y} r={22} fill="#22c55e" opacity={0.92} />
            <circle cx={startPos.x} cy={startPos.y} r={22} fill="none" stroke="white" strokeWidth={3} />
            <text
              x={startPos.x} y={startPos.y + 1}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="18" fill="white" fontWeight="bold"
              style={{ userSelect: "none" }}
            >
              S
            </text>
          </g>
        )}

        {/* 도착 마커 (빨간 E) */}
        {endPos && (
          <g>
            <circle cx={endPos.x} cy={endPos.y} r={22} fill="#ef4444" opacity={0.92} />
            <circle cx={endPos.x} cy={endPos.y} r={22} fill="none" stroke="white" strokeWidth={3} />
            <text
              x={endPos.x} y={endPos.y + 1}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="18" fill="white" fontWeight="bold"
              style={{ userSelect: "none" }}
            >
              E
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
