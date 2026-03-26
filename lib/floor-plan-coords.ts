import { Room } from "./building-data";

export interface FloorImageConfig {
  imageUrl: string;
  fullW: number;    // 이미지 너비
  fullH: number;    // 이미지 높이
  cropY: number;    // 표시 시작 y (별도 이미지면 0)
  cropH: number;    // 표시 높이 (별도 이미지면 fullH)
  rowOrigin: number; // 그리드 row 0 → 이미지 y 좌표
  rowScale: number;  // 그리드 1 row = 몇 픽셀
}

// 이미지 내 x 좌표 계산 공통 상수
const ORIGIN_X = 60;   // 그리드 col 0의 이미지 x 좌표
const COL_SCALE = 38;  // 그리드 1 col = 38픽셀

// 층별 개별 이미지 (/floor-1.png ~ /floor-5.png)
// 각 이미지는 기존 합본에서 해당 층 영역을 정확히 크롭한 파일
// - floor-1-2.png (992×1403) 에서:
//     1층: y=750 ~ y=1350  → floor-1.png (992×600)
//     2층: y=30  ~ y=740   → floor-2.png (992×710)
// - floor-3-5.png (992×1403) 에서:
//     3층: y=895 ~ y=1335  → floor-3.png (992×440)
//     4층: y=465 ~ y=885   → floor-4.png (992×420)
//     5층: y=30  ~ y=450   → floor-5.png (992×420)
export const FLOOR_CONFIGS: Record<number, FloorImageConfig> = {
  1: {
    imageUrl: "/floor-1.png",
    fullW: 992, fullH: 440,
    cropY: 0, cropH: 440,
    rowOrigin: -236,  // 원본 rowOrigin(484) - cropStart(720)
    rowScale: 92,
  },
  2: {
    imageUrl: "/floor-2.png",
    fullW: 992, fullH: 510,
    cropY: 0, cropH: 510,
    rowOrigin: 20,    // 원본 rowOrigin(50) - cropStart(30)
    rowScale: 68,
  },
  3: {
    imageUrl: "/floor-3.png",
    fullW: 992, fullH: 440,
    cropY: 0, cropH: 440,
    rowOrigin: 15,    // 원본 rowOrigin(910) - cropStart(895)
    rowScale: 44,
  },
  4: {
    imageUrl: "/floor-4.png",
    fullW: 992, fullH: 420,
    cropY: 0, cropH: 420,
    rowOrigin: 13,    // 원본 rowOrigin(478) - cropStart(465)
    rowScale: 44,
  },
  5: {
    imageUrl: "/floor-5.png",
    fullW: 992, fullH: 420,
    cropY: 0, cropH: 420,
    rowOrigin: 15,    // 원본 rowOrigin(45) - cropStart(30)
    rowScale: 44,
  },
};

export function getFloorConfig(floor: number): FloorImageConfig | null {
  return FLOOR_CONFIGS[floor] ?? null;
}

// 방의 중심 픽셀 좌표 (이미지 기준)
export function getRoomCenter(room: Room): { x: number; y: number } | null {
  const config = FLOOR_CONFIGS[room.floor];
  if (!config) return null;
  return {
    x: ORIGIN_X + (room.col + room.width / 2) * COL_SCALE,
    y: config.rowOrigin + (room.row + room.height / 2) * config.rowScale,
  };
}
