import { Room } from "./building-data";

// 각 층의 이미지 정보 및 크롭 영역
export interface FloorImageConfig {
  imageUrl: string;
  fullW: number;    // 원본 이미지 전체 너비
  fullH: number;    // 원본 이미지 전체 높이
  cropY: number;    // 해당 층 섹션 시작 y (전체 이미지 기준)
  cropH: number;    // 해당 층 섹션 높이
  rowOrigin: number; // 그리드 row 0이 대응하는 이미지 y 좌표
  rowScale: number;  // 그리드 1 row = 몇 픽셀
}

// 이미지 내 x 좌표 계산에 사용하는 공통 상수
const ORIGIN_X = 60;   // 그리드 col 0의 이미지 x 좌표
const COL_SCALE = 38;  // 그리드 1 col = 38픽셀

// floor-1-2.png : 2층(위) + 1층(아래)  (992 × 1403)
// floor-3-5.png : 5층(위) + 4층(중) + 3층(아래)  (992 × 1403)
export const FLOOR_CONFIGS: Record<number, FloorImageConfig> = {
  1: {
    imageUrl: "/floor-1-2.png",
    fullW: 992, fullH: 1403,
    cropY: 750, cropH: 600,
    rowOrigin: 760 - 3 * 92, // row 3이 y≈760에 있음
    rowScale: 92,
  },
  2: {
    imageUrl: "/floor-1-2.png",
    fullW: 992, fullH: 1403,
    cropY: 30, cropH: 710,
    rowOrigin: 50,
    rowScale: 68,
  },
  3: {
    imageUrl: "/floor-3-5.png",
    fullW: 992, fullH: 1403,
    cropY: 895, cropH: 440,
    rowOrigin: 910,
    rowScale: 44,
  },
  4: {
    imageUrl: "/floor-3-5.png",
    fullW: 992, fullH: 1403,
    cropY: 465, cropH: 420,
    rowOrigin: 478,
    rowScale: 44,
  },
  5: {
    imageUrl: "/floor-3-5.png",
    fullW: 992, fullH: 1403,
    cropY: 30, cropH: 420,
    rowOrigin: 45,
    rowScale: 44,
  },
};

export function getFloorConfig(floor: number): FloorImageConfig | null {
  return FLOOR_CONFIGS[floor] ?? null;
}

// 방의 중심 픽셀 좌표 (전체 이미지 기준)
export function getRoomCenter(room: Room): { x: number; y: number } | null {
  const config = FLOOR_CONFIGS[room.floor];
  if (!config) return null;
  return {
    x: ORIGIN_X + (room.col + room.width / 2) * COL_SCALE,
    y: config.rowOrigin + (room.row + room.height / 2) * config.rowScale,
  };
}
