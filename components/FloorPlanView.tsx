"use client";

import Image from "next/image";
import { getRoomById } from "@/lib/building-data";
import { PathStep } from "@/lib/pathfinding";
import { getFloorConfig } from "@/lib/floor-plan-coords";

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

  const config = getFloorConfig(step.floor);
  if (!config) return null;

  const { imageUrl, fullW, fullH } = config;
  const accent = FLOOR_ACCENT[step.floor] ?? "#6b7280";

  // 경로 포인트 (imageX, imageY 사용)
  // 좌표가 100 범위라서 992픽셀에 맞게 스케일 필요
  const SCALE = fullW / 100;
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

  console.log("=== FloorPlanView Debug ===");
  console.log("Floor:", step.floor);
  console.log("PathRoomIds:", step.pathRoomIds);
  console.log("SCALE:", SCALE, "fullW:", fullW);
  step.pathRoomIds.forEach(id => {
    const room = getRoomById(id);
    console.log(`Room ${id}:`, room?.name, "imageX:", room?.imageX, "imageY:", room?.imageY);
  });
  console.log("PathPoints length:", pathPoints.length, "Polyline:", polyline);

  const firstRoom = getRoomById(step.pathRoomIds[0]);
  const lastRoom = getRoomById(step.pathRoomIds[step.pathRoomIds.length - 1]);
  const startPos = (firstRoom && firstRoom.imageX !== undefined && firstRoom.imageY !== undefined)
    ? { x: firstRoom.imageX * SCALE, y: firstRoom.imageY * SCALE }
    : null;
  const endPos = (lastRoom && lastRoom.id !== firstRoom?.id && lastRoom.imageX !== undefined && lastRoom.imageY !== undefined)
    ? { x: lastRoom.imageX * SCALE, y: lastRoom.imageY * SCALE }
    : null;

  // 이미지 비율 유지하면서 컨테이너 높이 결정
  const aspectRatio = fullH / fullW;

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-gray-200">
      {/* 층 라벨 */}
      <div className="flex items-center gap-2 px-3 py-2" style={{ background: accent }}>
        <span className="text-white font-bold text-sm">{step.floor}층</span>
        {step.isOutdoor && (
          <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">실외 구간</span>
        )}
      </div>

      {/* 이미지 + SVG 오버레이 */}
      <div className="relative w-full bg-white" style={{ paddingBottom: `${aspectRatio * 100}%`, minHeight: "500px" }}>
        <Image
          src={imageUrl}
          alt={`${step.floor}층 평면도`}
          fill
          style={{ objectFit: "fill" }}
          sizes="100vw"
          priority
        />
        <svg
          viewBox={`0 0 ${fullW} ${fullH}`}
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: "none", overflow: "visible" }}
          preserveAspectRatio="xMidYMid slice"
        >
          {/* 경로 글로우 */}
          {pathPoints.length > 1 && (
            <>
              <polyline
                points={polyline}
                stroke={glowColor}
                strokeWidth={28}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.4}
              />
              <polyline
                points={polyline}
                stroke={pathColor}
                strokeWidth={10}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={step.isOutdoor ? "20 9" : undefined}
                opacity={0.95}
              />
            </>
          )}

          {/* S 마커 */}
          {startPos && (
            <g>
              <circle cx={startPos.x} cy={startPos.y} r={22} fill="#22c55e" stroke="white" strokeWidth={3} />
              <text
                x={startPos.x} y={startPos.y + 1}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="18" fill="white" fontWeight="bold"
                style={{ userSelect: "none" }}
              >S</text>
            </g>
          )}

          {/* E 마커 */}
          {endPos && (
            <g>
              <circle cx={endPos.x} cy={endPos.y} r={22} fill="#ef4444" stroke="white" strokeWidth={3} />
              <text
                x={endPos.x} y={endPos.y + 1}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="18" fill="white" fontWeight="bold"
                style={{ userSelect: "none" }}
              >E</text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
