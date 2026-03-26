"use client";

import { FLOORS, Room, RoomType } from "@/lib/building-data";

interface Props {
  activeFloor: number;
  highlightedRooms: string[];
  startRoomId?: string;
  endRoomId?: string;
  onRoomClick?: (room: Room) => void;
}

const ROOM_COLORS: Record<RoomType, string> = {
  classroom: "#dbeafe",    // 파랑
  lab: "#d1fae5",          // 초록
  office: "#fef9c3",       // 노랑
  restroom: "#f3f4f6",     // 회색
  staircase: "#e0e7ff",    // 인디고
  elevator: "#ede9fe",     // 보라
  storage: "#fce7f3",      // 핑크
  corridor: "#f9fafb",     // 연회색
  entrance: "#fed7aa",     // 주황
  other: "#e5e7eb",        // 중간 회색
};

const CELL = 52; // 셀 크기 (px)
const ISO_X = 0.866; // cos(30deg)
const ISO_Y = 0.5;   // sin(30deg)
const DEPTH = 18;    // 아이소메트릭 높이감

// 그리드 좌표 → 아이소메트릭 화면 좌표
function toIso(col: number, row: number) {
  const x = (col - row) * CELL * ISO_X;
  const y = (col + row) * CELL * ISO_Y;
  return { x, y };
}

function RoomBlock({
  room,
  highlighted,
  isStart,
  isEnd,
  onClick,
}: {
  room: Room;
  highlighted: boolean;
  isStart: boolean;
  isEnd: boolean;
  onClick?: () => void;
}) {
  const { col, row, width, height, type, name } = room;

  // 4개 꼭짓점 (top-left, top-right, bottom-right, bottom-left)
  const tl = toIso(col, row);
  const tr = toIso(col + width, row);
  const br = toIso(col + width, row + height);
  const bl = toIso(col, row + height);

  // 윗면 (top face)
  const topPoints = `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`;

  // 왼쪽 면 (left face)
  const leftPoints = `${bl.x},${bl.y} ${bl.x},${bl.y + DEPTH} ${tl.x},${tl.y + DEPTH} ${tl.x},${tl.y}`;

  // 오른쪽 면 (right face)
  const rightPoints = `${br.x},${br.y} ${br.x},${br.y + DEPTH} ${bl.x},${bl.y + DEPTH} ${bl.x},${bl.y}`;

  let fillColor = ROOM_COLORS[type];
  let strokeColor = "#cbd5e1";
  let strokeWidth = 1;

  if (isStart) { fillColor = "#3b82f6"; strokeColor = "#1d4ed8"; strokeWidth = 2; }
  else if (isEnd) { fillColor = "#ef4444"; strokeColor = "#991b1b"; strokeWidth = 2; }
  else if (highlighted) { fillColor = "#93c5fd"; strokeColor = "#3b82f6"; strokeWidth = 2; }

  const leftFill = isStart ? "#2563eb" : isEnd ? "#dc2626" : highlighted ? "#60a5fa" : shadeColor(fillColor, -15);
  const rightFill = isStart ? "#1d4ed8" : isEnd ? "#b91c1c" : highlighted ? "#3b82f6" : shadeColor(fillColor, -30);

  // 텍스트 위치 (윗면 중심)
  const cx = (tl.x + br.x) / 2;
  const cy = (tl.y + br.y) / 2;

  const shortName = name.length > 8 ? name.slice(0, 7) + "…" : name;
  const showLabel = type !== "corridor";

  return (
    <g
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      {/* 왼쪽 면 */}
      <polygon points={leftPoints} fill={leftFill} stroke={strokeColor} strokeWidth={strokeWidth} />
      {/* 오른쪽 면 */}
      <polygon points={rightPoints} fill={rightFill} stroke={strokeColor} strokeWidth={strokeWidth} />
      {/* 윗면 */}
      <polygon points={topPoints} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
      {/* 라벨 */}
      {showLabel && (
        <text
          x={cx}
          y={cy + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={width >= 2 ? 8.5 : 7}
          fill={isStart || isEnd ? "#fff" : "#374151"}
          fontWeight={highlighted ? "600" : "400"}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {shortName}
        </text>
      )}
      {/* 출발/도착 마커 */}
      {(isStart || isEnd) && (
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize={14} style={{ pointerEvents: "none" }}>
          {isStart ? "🟢" : "🔴"}
        </text>
      )}
    </g>
  );
}

// 색상 어둡게/밝게
function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0xff) + percent));
  return `rgb(${r},${g},${b})`;
}

export default function IsometricBuilding({
  activeFloor,
  highlightedRooms,
  startRoomId,
  endRoomId,
  onRoomClick,
}: Props) {
  const rooms = FLOORS[activeFloor] || [];

  // SVG 뷰박스 계산
  const maxCol = Math.max(...rooms.map((r) => r.col + r.width), 16);
  const maxRow = Math.max(...rooms.map((r) => r.row + r.height), 6);

  const minX = (0 - maxRow) * CELL * ISO_X - 20;
  const minY = -DEPTH - 10;
  const width = (maxCol + maxRow) * CELL * ISO_X + 40;
  const height = (maxCol + maxRow) * CELL * ISO_Y + DEPTH + 40;

  // 렌더 순서: row 오름차순, col 오름차순 (뒤에서 앞으로)
  const sorted = [...rooms].sort((a, b) => a.row - b.row || a.col - b.col);

  return (
    <div className="overflow-auto w-full">
      <svg
        viewBox={`${minX} ${minY} ${width} ${height}`}
        width="100%"
        style={{ minHeight: 260, maxHeight: 400 }}
      >
        {sorted.map((room) => (
          <RoomBlock
            key={room.id}
            room={room}
            highlighted={highlightedRooms.includes(room.id)}
            isStart={room.id === startRoomId}
            isEnd={room.id === endRoomId}
            onClick={onRoomClick ? () => onRoomClick(room) : undefined}
          />
        ))}
      </svg>

      {/* 범례 */}
      <div className="flex flex-wrap gap-2 px-4 pb-2 text-xs text-gray-500">
        {[
          { color: ROOM_COLORS.classroom, label: "강의실" },
          { color: ROOM_COLORS.lab, label: "실험실" },
          { color: ROOM_COLORS.office, label: "교무실/행정" },
          { color: "#3b82f6", label: "출발" },
          { color: "#ef4444", label: "도착" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm border border-gray-300" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
