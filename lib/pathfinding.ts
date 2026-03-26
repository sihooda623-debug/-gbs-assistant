import { Room, getRoomById, BuildingType } from "./building-data";

export interface PathStep {
  stepIndex: number;
  floor: number;
  isOutdoor: boolean;
  isStairs: boolean;
  stairFrom?: number;
  stairTo?: number;
  instruction: string;
  detail: string;
  pathRoomIds: string[]; // 경로 강조할 방 ID 목록 (순서대로)
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function corridor(floor: number, building: BuildingType): Room | undefined {
  if (building === "강의동") return getRoomById(`${floor}_복도_강의동`);
  if (building === "실험동") return getRoomById(`${floor}_복도_실험동`);
  return getRoomById(`${floor}_복도북_본관`) ?? getRoomById(`${floor}_복도북`);
}

function stairs(floor: number, building: "강의동" | "실험동" | "본관"): Room | undefined {
  if (building === "강의동") return getRoomById(`${floor}_계단_강의동`);
  if (building === "실험동") return getRoomById(`${floor}_계단_실험동`);
  return getRoomById(`${floor}_계단중앙_본관`) ?? getRoomById(`${floor}_계단중앙`);
}

// 건물 → 본관 연결 노드
function buildingToBonggwanConnector(floor: number, building: "강의동" | "실험동"): Room | undefined {
  if (floor === 2) {
    if (building === "강의동") return getRoomById("2_본관연결_강의동쪽");
    return undefined; // 2층 실험동↔본관 직접 연결 없음
  }
  return getRoomById(`${floor}_${building}본관연결`);
}

// 방 → 본관 복도까지의 경로 ID 배열
function pathToBonggwan(from: Room): string[] {
  const floor = from.floor;
  const building = from.building as BuildingType;
  const path: string[] = [from.id];

  if (building === "본관") {
    const bc = corridor(floor, "본관");
    if (bc) path.push(bc.id);
    return path;
  }

  const c = corridor(floor, building);
  if (c) path.push(c.id);

  const conn = buildingToBonggwanConnector(floor, building as "강의동" | "실험동");
  if (conn) path.push(conn.id);

  const bc = corridor(floor, "본관");
  if (bc) path.push(bc.id);

  return path;
}

// 본관 복도 → 목적지 방까지의 경로 ID 배열
function pathFromBonggwan(to: Room): string[] {
  const floor = to.floor;
  const building = to.building as BuildingType;
  const path: string[] = [];

  if (building === "본관") {
    const bc = corridor(floor, "본관");
    if (bc) path.push(bc.id);
    path.push(to.id);
    return path;
  }

  const bc = corridor(floor, "본관");
  if (bc) path.push(bc.id);

  const conn = buildingToBonggwanConnector(floor, building as "강의동" | "실험동");
  if (conn) path.push(conn.id);

  const c = corridor(floor, building);
  if (c) path.push(c.id);

  path.push(to.id);
  return path;
}

function uniq(ids: string[]): string[] {
  return [...new Set(ids)];
}

// ─── 같은 층 ───────────────────────────────────────────────────────────────────

function sameFloorPath(from: Room, to: Room): PathStep[] {
  const floor = from.floor;
  const fb = from.building as BuildingType;
  const tb = to.building as BuildingType;

  // 같은 건물
  if (fb === tb) {
    const c = corridor(floor, fb);
    return [{
      stepIndex: 0, floor, isOutdoor: false, isStairs: false,
      instruction: `${from.name} → ${to.name}`,
      detail: `${floor}층 [${fb}] 복도를 따라 이동합니다.`,
      pathRoomIds: uniq([from.id, ...(c ? [c.id] : []), to.id]),
    }];
  }

  // 2층 강의동 ↔ 실험동: 실외통로
  if (floor === 2 &&
    ((fb === "강의동" && tb === "실험동") || (fb === "실험동" && tb === "강의동"))) {
    const outdoor = getRoomById("2_실외통로");
    const fromExit = getRoomById(`2_출입문_${fb}`);
    const toExit = getRoomById(`2_출입문_${tb}`);
    const fc = corridor(2, fb);
    const tc = corridor(2, tb);
    return [
      {
        stepIndex: 0, floor: 2, isOutdoor: false, isStairs: false,
        instruction: `${from.name} → 출입문`,
        detail: `[${fb}] 복도를 따라 외부 출입문으로 이동합니다.`,
        pathRoomIds: uniq([from.id, ...(fc ? [fc.id] : []), ...(fromExit ? [fromExit.id] : [])]),
      },
      {
        stepIndex: 1, floor: 2, isOutdoor: true, isStairs: false,
        instruction: "실외 통로 통과",
        detail: "건물 밖 통로를 통해 이동합니다. 비가 오면 우산을 챙기세요.",
        pathRoomIds: uniq([...(fromExit ? [fromExit.id] : []), ...(outdoor ? [outdoor.id] : []), ...(toExit ? [toExit.id] : [])]),
      },
      {
        stepIndex: 2, floor: 2, isOutdoor: false, isStairs: false,
        instruction: `입장 → ${to.name}`,
        detail: `[${tb}] 출입문으로 들어와 복도를 따라 목적지로 이동합니다.`,
        pathRoomIds: uniq([...(toExit ? [toExit.id] : []), ...(tc ? [tc.id] : []), to.id]),
      },
    ];
  }

  // 강의동/실험동 → 본관
  if (tb === "본관") {
    const path = pathToBonggwan(from);
    return [{
      stepIndex: 0, floor, isOutdoor: false, isStairs: false,
      instruction: `${from.name} → ${to.name}`,
      detail: `[${fb}] → [본관] 연결 통로를 통해 이동합니다.`,
      pathRoomIds: uniq([...path, to.id]),
    }];
  }

  // 본관 → 강의동/실험동
  if (fb === "본관") {
    return [{
      stepIndex: 0, floor, isOutdoor: false, isStairs: false,
      instruction: `${from.name} → ${to.name}`,
      detail: `[본관] → [${tb}] 연결 통로를 통해 이동합니다.`,
      pathRoomIds: uniq([from.id, ...pathFromBonggwan(to)]),
    }];
  }

  // 3층+ 강의동 ↔ 실험동: 본관 경유
  if ((fb === "강의동" && tb === "실험동") || (fb === "실험동" && tb === "강의동")) {
    return [{
      stepIndex: 0, floor, isOutdoor: false, isStairs: false,
      instruction: `${from.name} → ${to.name}`,
      detail: `[${fb}] → 본관 경유 → [${tb}] 이동합니다.`,
      pathRoomIds: uniq([...pathToBonggwan(from), ...pathFromBonggwan(to)]),
    }];
  }

  // fallback
  return [{
    stepIndex: 0, floor, isOutdoor: false, isStairs: false,
    instruction: `${from.name} → ${to.name}`,
    detail: `${floor}층 이동`,
    pathRoomIds: [from.id, to.id],
  }];
}

// ─── 다른 층 ───────────────────────────────────────────────────────────────────

function crossFloorPath(from: Room, to: Room): PathStep[] {
  const fb = from.building as BuildingType;
  const tb = to.building as BuildingType;
  const goUp = to.floor > from.floor;

  // 계단 선택: 같은 건물이면 그 건물 계단, 아니면 본관 계단
  const stairBuilding: "강의동" | "실험동" | "본관" =
    (fb === "강의동" && tb === "강의동") ? "강의동" :
    (fb === "실험동" && tb === "실험동") ? "실험동" :
    "본관";

  const fromStair = stairs(from.floor, stairBuilding);
  const toStair = stairs(to.floor, stairBuilding);
  if (!fromStair || !toStair) return [];

  const steps: PathStep[] = [];

  // Step 1: 출발 → 계단
  {
    let path: string[];
    if (fb === stairBuilding) {
      const c = corridor(from.floor, fb);
      path = uniq([from.id, ...(c ? [c.id] : []), fromStair.id]);
    } else {
      // 다른 건물에 있으므로 본관 경유하여 본관 계단으로
      path = uniq([...pathToBonggwan(from), fromStair.id]);
    }
    steps.push({
      stepIndex: 0, floor: from.floor, isOutdoor: false, isStairs: false,
      instruction: `${from.name} → 계단`,
      detail: `[${fb}] ${from.floor}층 복도를 따라 계단으로 이동합니다.`,
      pathRoomIds: path,
    });
  }

  // Step 2: 계단 이동 (층 변경)
  steps.push({
    stepIndex: 1, floor: from.floor, isOutdoor: false, isStairs: true,
    stairFrom: from.floor, stairTo: to.floor,
    instruction: `${from.floor}층 → ${to.floor}층 계단 ${goUp ? "올라가기 ▲" : "내려가기 ▼"}`,
    detail: `계단을 이용해 ${from.floor}층에서 ${to.floor}층으로 ${goUp ? "올라갑니다" : "내려갑니다"}.`,
    pathRoomIds: [fromStair.id, toStair.id],
  });

  // Step 3: 계단 → 목적지
  {
    let path: string[];
    if (tb === stairBuilding) {
      const c = corridor(to.floor, tb);
      path = uniq([toStair.id, ...(c ? [c.id] : []), to.id]);
    } else {
      // 계단(본관)에서 목적지 건물로
      path = uniq([toStair.id, ...pathFromBonggwan(to)]);
    }
    steps.push({
      stepIndex: 2, floor: to.floor, isOutdoor: false, isStairs: false,
      instruction: `${to.floor}층 도착 → ${to.name}`,
      detail: `[${tb}] ${to.floor}층 복도를 따라 목적지로 이동합니다.`,
      pathRoomIds: path,
    });
  }

  steps.forEach((s, i) => { s.stepIndex = i; });
  return steps;
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

export function findPath(fromId: string, toId: string): PathStep[] | null {
  const from = getRoomById(fromId);
  const to = getRoomById(toId);
  if (!from || !to) return null;

  if (fromId === toId) {
    return [{
      stepIndex: 0, floor: from.floor, isOutdoor: false, isStairs: false,
      instruction: `목적지: ${from.name}`,
      detail: "현재 위치가 목적지입니다.",
      pathRoomIds: [from.id],
    }];
  }

  if (from.floor === to.floor) return sameFloorPath(from, to);
  return crossFloorPath(from, to);
}
