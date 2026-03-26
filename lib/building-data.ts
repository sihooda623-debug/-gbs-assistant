export type RoomType =
  | "classroom"
  | "lab"
  | "office"
  | "restroom"
  | "staircase"
  | "elevator"
  | "storage"
  | "corridor"
  | "entrance"
  | "other";

export type BuildingType = "강의동" | "본관" | "실험동" | "외부";

export interface Room {
  id: string;
  name: string;
  floor: number;
  building: BuildingType;
  col: number;
  row: number;
  width: number;
  height: number;
  type: RoomType;
  isOutdoor?: boolean; // 실외 구간
}

// ─── 그리드 레이아웃 ───────────────────────────────────────────────────────────
// col  0- 7  row 0-2 : 강의동 (강의실, 복도, 계단)
// col 13-20  row 0-2 : 실험동 (실험실, 복도, 계단)
// col  8-12  row 2   : 실외통로 (2F만, 강의동↔실험동 직접 연결)
// col  0-20  row 3-7 : 본관 (메인 복도, 각종 시설)
//
// 건물 간 연결:
//   2F: 강의동 출입문(col 7, row 2) → 실외통로(col 8-12, row 2) → 실험동 출입문(col 13, row 2)
//   3F+: 강의동(col 7, row 2) → 본관 연결(col 7, row 3) → 본관 복도 → 실험동 연결(col 13, row 3) → 실험동

export const FLOORS: Record<number, Room[]> = {

  // ──────────────────────────────────────────────────────────────────────────
  // 1층: 본관만 있음 (강의동/실험동 없음)
  // ──────────────────────────────────────────────────────────────────────────
  1: [
    // 북쪽 방들 (row 3)
    { id: "1_창고",          name: "창고",          floor: 1, building: "본관", col: 0,  row: 3, width: 1, height: 1, type: "storage" },
    { id: "1_샤워실남",      name: "샤워실(남)",    floor: 1, building: "본관", col: 1,  row: 3, width: 1, height: 1, type: "restroom" },
    { id: "1_문서보관실",    name: "문서보관실",    floor: 1, building: "본관", col: 2,  row: 3, width: 1, height: 1, type: "storage" },
    { id: "1_숙직실",        name: "숙직실",        floor: 1, building: "본관", col: 3,  row: 3, width: 1, height: 1, type: "office" },
    { id: "1_장애인화장실여",name: "장애인화장실(여)",floor:1, building:"본관", col: 4,  row: 3, width: 1, height: 1, type: "restroom" },
    { id: "1_화장실여",      name: "화장실(여)",    floor: 1, building: "본관", col: 5,  row: 3, width: 1, height: 1, type: "restroom" },
    { id: "1_계단북",        name: "계단",          floor: 1, building: "본관", col: 6,  row: 3, width: 1, height: 1, type: "staircase" },
    { id: "1_기념관",        name: "기념관",        floor: 1, building: "본관", col: 8,  row: 3, width: 2, height: 2, type: "other" },
    { id: "1_기계실",        name: "기계실",        floor: 1, building: "본관", col: 14, row: 3, width: 2, height: 1, type: "other" },
    { id: "1_전기실",        name: "전기실",        floor: 1, building: "본관", col: 14, row: 4, width: 2, height: 1, type: "other" },
    { id: "1_강당",          name: "강당",          floor: 1, building: "본관", col: 17, row: 3, width: 2, height: 3, type: "other" },
    // 본관 북복도 (row 4)
    { id: "1_복도북",        name: "복도",          floor: 1, building: "본관", col: 0,  row: 4, width: 17, height: 1, type: "corridor" },
    // 중앙 계단/엘리베이터 (row 5)
    { id: "1_계단중앙",      name: "계단",          floor: 1, building: "본관", col: 10, row: 5, width: 1, height: 1, type: "staircase" },
    { id: "1_엘리베이터",    name: "엘리베이터",    floor: 1, building: "본관", col: 11, row: 5, width: 1, height: 1, type: "elevator" },
    { id: "1_화장실남",      name: "화장실(남)",    floor: 1, building: "본관", col: 12, row: 5, width: 1, height: 1, type: "restroom" },
    { id: "1_장애인화장실남",name: "장애인화장실(남)",floor:1, building:"본관", col: 13, row: 5, width: 1, height: 1, type: "restroom" },
    // 본관 남복도 (row 5)
    { id: "1_복도남",        name: "복도",          floor: 1, building: "본관", col: 0,  row: 5, width: 10, height: 1, type: "corridor" },
    // 남쪽 방들 (row 6)
    { id: "1_시설관리실",    name: "시설관리실",    floor: 1, building: "본관", col: 0,  row: 6, width: 2, height: 1, type: "office" },
    { id: "1_인쇄실",        name: "인쇄실",        floor: 1, building: "본관", col: 2,  row: 6, width: 2, height: 1, type: "other" },
    { id: "1_교장실",        name: "교장실",        floor: 1, building: "본관", col: 4,  row: 6, width: 2, height: 1, type: "office" },
    { id: "1_행정실",        name: "행정실",        floor: 1, building: "본관", col: 6,  row: 6, width: 2, height: 1, type: "office" },
    { id: "1_주출입구",      name: "주출입구",      floor: 1, building: "본관", col: 8,  row: 6, width: 2, height: 1, type: "entrance" },
  ],

  // ──────────────────────────────────────────────────────────────────────────
  // 2층: 강의동(좌) + 실외통로 + 실험동(우) + 본관(하)
  // 강의동 ↔ 실험동 = 실외통로로 직접 연결 (본관 안 거침)
  // ──────────────────────────────────────────────────────────────────────────
  2: [
    // ── 강의동 ──
    // 강의실 (row 0)
    { id: "2_강의실201", name: "강의실 201", floor: 2, building: "강의동", col: 0, row: 0, width: 1, height: 1, type: "classroom" },
    { id: "2_강의실202", name: "강의실 202", floor: 2, building: "강의동", col: 1, row: 0, width: 1, height: 1, type: "classroom" },
    { id: "2_강의실203", name: "강의실 203", floor: 2, building: "강의동", col: 2, row: 0, width: 1, height: 1, type: "classroom" },
    { id: "2_강의실204", name: "강의실 204", floor: 2, building: "강의동", col: 3, row: 0, width: 1, height: 1, type: "classroom" },
    { id: "2_강의실205", name: "강의실 205", floor: 2, building: "강의동", col: 4, row: 0, width: 1, height: 1, type: "classroom" },
    { id: "2_1학년교무실", name: "1학년 교무실", floor: 2, building: "강의동", col: 5, row: 0, width: 2, height: 1, type: "office" },
    { id: "2_화장실남_강의동", name: "화장실(남)", floor: 2, building: "강의동", col: 7, row: 0, width: 1, height: 1, type: "restroom" },
    // 강의동 복도 (row 1)
    { id: "2_복도_강의동", name: "복도", floor: 2, building: "강의동", col: 0, row: 1, width: 8, height: 1, type: "corridor" },
    // 강의동 계단 + 출입문 (row 2)
    { id: "2_계단_강의동", name: "계단", floor: 2, building: "강의동", col: 6, row: 2, width: 1, height: 1, type: "staircase" },
    { id: "2_화장실여_강의동", name: "화장실(여)", floor: 2, building: "강의동", col: 5, row: 2, width: 1, height: 1, type: "restroom" },
    { id: "2_출입문_강의동", name: "출입문", floor: 2, building: "강의동", col: 7, row: 2, width: 1, height: 1, type: "entrance" },

    // ── 실외통로 (2F only) ──
    { id: "2_실외통로", name: "실외 통로", floor: 2, building: "외부", col: 8, row: 2, width: 5, height: 1, type: "corridor", isOutdoor: true },

    // ── 실험동 ──
    // 실험동 출입문 + 계단 (row 2)
    { id: "2_출입문_실험동", name: "출입문", floor: 2, building: "실험동", col: 13, row: 2, width: 1, height: 1, type: "entrance" },
    { id: "2_계단_실험동", name: "계단", floor: 2, building: "실험동", col: 14, row: 2, width: 1, height: 1, type: "staircase" },
    { id: "2_화장실여_실험동", name: "화장실(여)", floor: 2, building: "실험동", col: 15, row: 2, width: 1, height: 1, type: "restroom" },
    { id: "2_화장실남_실험동", name: "화장실(남)", floor: 2, building: "실험동", col: 16, row: 2, width: 1, height: 1, type: "restroom" },
    // 실험동 복도 (row 1)
    { id: "2_복도_실험동", name: "복도", floor: 2, building: "실험동", col: 13, row: 1, width: 8, height: 1, type: "corridor" },
    // 실험실 (row 0)
    { id: "2_생명과학실험실1", name: "생명과학실험실Ⅰ", floor: 2, building: "실험동", col: 13, row: 0, width: 2, height: 1, type: "lab" },
    { id: "2_기자재실1", name: "기자재실", floor: 2, building: "실험동", col: 15, row: 0, width: 1, height: 1, type: "storage" },
    { id: "2_생명과학교사연구실", name: "생명과학 교사연구실", floor: 2, building: "실험동", col: 16, row: 0, width: 2, height: 1, type: "office" },
    { id: "2_기자재실2", name: "기자재실", floor: 2, building: "실험동", col: 18, row: 0, width: 1, height: 1, type: "storage" },
    { id: "2_생명과학실험실2", name: "생명과학실험실Ⅱ", floor: 2, building: "실험동", col: 19, row: 0, width: 2, height: 1, type: "lab" },
    { id: "2_원자현미경실", name: "원자·전자현미경실", floor: 2, building: "실험동", col: 21, row: 0, width: 2, height: 1, type: "lab" },
    { id: "2_분자생물학실", name: "분자생물학실", floor: 2, building: "실험동", col: 21, row: 1, width: 2, height: 1, type: "lab" },

    // ── 본관 ──
    // 본관 연결 통로 (강의동쪽, row 3)
    { id: "2_본관연결_강의동쪽", name: "본관 입구", floor: 2, building: "본관", col: 0, row: 3, width: 3, height: 1, type: "entrance" },
    // 본관 북복도 (row 4)
    { id: "2_복도북_본관", name: "복도", floor: 2, building: "본관", col: 0, row: 4, width: 20, height: 1, type: "corridor" },
    // 본관 북쪽 방들 (row 3 일부)
    { id: "2_화장실여_본관", name: "화장실(여)", floor: 2, building: "본관", col: 3, row: 3, width: 1, height: 1, type: "restroom" },
    { id: "2_장애인화장실여_본관", name: "장애인화장실(여)", floor: 2, building: "본관", col: 4, row: 3, width: 1, height: 1, type: "restroom" },
    { id: "2_계단북_본관", name: "계단", floor: 2, building: "본관", col: 5, row: 3, width: 1, height: 1, type: "staircase" },
    { id: "2_학생자치회실", name: "학생자치회실", floor: 2, building: "본관", col: 6, row: 3, width: 2, height: 1, type: "other" },
    { id: "2_민원상담실", name: "민원상담실", floor: 2, building: "본관", col: 8, row: 3, width: 2, height: 1, type: "office" },
    { id: "2_계단중앙_본관", name: "계단", floor: 2, building: "본관", col: 10, row: 4, width: 1, height: 1, type: "staircase" },
    { id: "2_엘리베이터_본관", name: "엘리베이터", floor: 2, building: "본관", col: 11, row: 4, width: 1, height: 1, type: "elevator" },
    { id: "2_화장실남_본관", name: "화장실(남)", floor: 2, building: "본관", col: 12, row: 3, width: 1, height: 1, type: "restroom" },
    { id: "2_장애인화장실남_본관", name: "장애인화장실(남)", floor: 2, building: "본관", col: 13, row: 3, width: 1, height: 1, type: "restroom" },
    { id: "2_영사실", name: "영사실", floor: 2, building: "본관", col: 19, row: 3, width: 1, height: 1, type: "other" },
    // 본관 남복도 (row 5)
    { id: "2_복도남_본관", name: "복도", floor: 2, building: "본관", col: 0, row: 5, width: 20, height: 1, type: "corridor" },
    // 본관 남쪽 방들 (row 6)
    { id: "2_기숙사생활안전부", name: "기숙사 생활안전부", floor: 2, building: "본관", col: 0, row: 6, width: 2, height: 1, type: "office" },
    { id: "2_진로진학상담실", name: "진로진학 상담실", floor: 2, building: "본관", col: 2, row: 6, width: 2, height: 1, type: "office" },
    { id: "2_보건실", name: "보건실", floor: 2, building: "본관", col: 4, row: 6, width: 2, height: 1, type: "other" },
    { id: "2_방송실", name: "방송실", floor: 2, building: "본관", col: 6, row: 6, width: 2, height: 1, type: "other" },
  ],

  // ──────────────────────────────────────────────────────────────────────────
  // 3층: 강의동(좌) + 본관(중앙·하) + 실험동(우)
  // 강의동 ↔ 실험동 = 반드시 본관 경유
  // ──────────────────────────────────────────────────────────────────────────
  3: [
    // ── 강의동 ──
    { id: "3_강의실301", name: "강의실 301", floor: 3, building: "강의동", col: 0, row: 0, width: 1, height: 1, type: "classroom" },
    { id: "3_강의실302", name: "강의실 302", floor: 3, building: "강의동", col: 1, row: 0, width: 1, height: 1, type: "classroom" },
    { id: "3_강의실303", name: "강의실 303", floor: 3, building: "강의동", col: 2, row: 0, width: 1, height: 1, type: "classroom" },
    { id: "3_강의실304", name: "강의실 304", floor: 3, building: "강의동", col: 3, row: 0, width: 1, height: 1, type: "classroom" },
    { id: "3_강의실305", name: "강의실 305", floor: 3, building: "강의동", col: 4, row: 0, width: 1, height: 1, type: "classroom" },
    { id: "3_2학년교무실", name: "2학년 교무실", floor: 3, building: "강의동", col: 5, row: 0, width: 2, height: 1, type: "office" },
    { id: "3_화장실남_강의동", name: "화장실(남)", floor: 3, building: "강의동", col: 7, row: 0, width: 1, height: 1, type: "restroom" },
    { id: "3_복도_강의동", name: "복도", floor: 3, building: "강의동", col: 0, row: 1, width: 8, height: 1, type: "corridor" },
    { id: "3_계단_강의동", name: "계단", floor: 3, building: "강의동", col: 6, row: 2, width: 1, height: 1, type: "staircase" },
    { id: "3_화장실여_강의동", name: "화장실(여)", floor: 3, building: "강의동", col: 5, row: 2, width: 1, height: 1, type: "restroom" },
    // 강의동 → 본관 연결 (row 2~3)
    { id: "3_강의동본관연결", name: "강의동 연결", floor: 3, building: "본관", col: 7, row: 2, width: 1, height: 2, type: "corridor" },

    // ── 실험동 ──
    { id: "3_화학실험실표", name: "화학실험실Ⅱ", floor: 3, building: "실험동", col: 13, row: 0, width: 2, height: 1, type: "lab" },
    { id: "3_기자재실1", name: "기자재실", floor: 3, building: "실험동", col: 15, row: 0, width: 1, height: 1, type: "storage" },
    { id: "3_화학교사연구실", name: "화학교사연구실", floor: 3, building: "실험동", col: 16, row: 0, width: 2, height: 1, type: "office" },
    { id: "3_기자재실2", name: "기자재실", floor: 3, building: "실험동", col: 18, row: 0, width: 1, height: 1, type: "storage" },
    { id: "3_화학실험실1", name: "화학실험실Ⅰ", floor: 3, building: "실험동", col: 19, row: 0, width: 2, height: 1, type: "lab" },
    { id: "3_합성실험실", name: "합성실험실", floor: 3, building: "실험동", col: 21, row: 0, width: 2, height: 1, type: "lab" },
    { id: "3_분석실험실", name: "분석실험실", floor: 3, building: "실험동", col: 21, row: 1, width: 2, height: 1, type: "lab" },
    { id: "3_복도_실험동", name: "복도", floor: 3, building: "실험동", col: 13, row: 1, width: 8, height: 1, type: "corridor" },
    { id: "3_계단_실험동", name: "계단", floor: 3, building: "실험동", col: 14, row: 2, width: 1, height: 1, type: "staircase" },
    { id: "3_화장실여_실험동", name: "화장실(여)", floor: 3, building: "실험동", col: 15, row: 2, width: 1, height: 1, type: "restroom" },
    { id: "3_화장실남_실험동", name: "화장실(남)", floor: 3, building: "실험동", col: 16, row: 2, width: 1, height: 1, type: "restroom" },
    // 실험동 → 본관 연결 (row 2~3)
    { id: "3_실험동본관연결", name: "실험동 연결", floor: 3, building: "본관", col: 13, row: 2, width: 1, height: 2, type: "corridor" },

    // ── 본관 ──
    { id: "3_복도북_본관", name: "복도", floor: 3, building: "본관", col: 0, row: 3, width: 21, height: 1, type: "corridor" },
    { id: "3_화장실여_본관", name: "화장실(여)", floor: 3, building: "본관", col: 0, row: 4, width: 1, height: 1, type: "restroom" },
    { id: "3_장애인화장실여_본관", name: "장애인화장실(여)", floor: 3, building: "본관", col: 1, row: 4, width: 1, height: 1, type: "restroom" },
    { id: "3_계단북_본관", name: "계단", floor: 3, building: "본관", col: 2, row: 4, width: 1, height: 1, type: "staircase" },
    { id: "3_상담실", name: "평가관리실", floor: 3, building: "본관", col: 3, row: 4, width: 2, height: 1, type: "office" },
    { id: "3_교육지원팀", name: "교육지원실(교감실)", floor: 3, building: "본관", col: 5, row: 4, width: 2, height: 1, type: "office" },
    { id: "3_계단중앙_본관", name: "계단", floor: 3, building: "본관", col: 10, row: 4, width: 1, height: 1, type: "staircase" },
    { id: "3_엘리베이터_본관", name: "엘리베이터", floor: 3, building: "본관", col: 11, row: 4, width: 1, height: 1, type: "elevator" },
    { id: "3_화장실남_본관", name: "화장실(남)", floor: 3, building: "본관", col: 12, row: 4, width: 1, height: 1, type: "restroom" },
    { id: "3_장애인화장실남_본관", name: "장애인화장실(남)", floor: 3, building: "본관", col: 13, row: 4, width: 1, height: 1, type: "restroom" },
    { id: "3_역사관", name: "역사관", floor: 3, building: "본관", col: 20, row: 4, width: 1, height: 1, type: "other" },
    { id: "3_복도남_본관", name: "복도", floor: 3, building: "본관", col: 0, row: 5, width: 21, height: 1, type: "corridor" },
    { id: "3_컴퓨터실1", name: "컴퓨터실Ⅱ", floor: 3, building: "본관", col: 0, row: 6, width: 2, height: 1, type: "classroom" },
    { id: "3_컴퓨터실2", name: "교육정보부", floor: 3, building: "본관", col: 2, row: 6, width: 2, height: 1, type: "office" },
    { id: "3_교육정보부", name: "컴퓨터실Ⅰ", floor: 3, building: "본관", col: 4, row: 6, width: 2, height: 1, type: "classroom" },
    { id: "3_교육정보운영부", name: "교육과정운영부", floor: 3, building: "본관", col: 6, row: 6, width: 2, height: 1, type: "office" },
    { id: "3_교무기획부", name: "교무기획부", floor: 3, building: "본관", col: 8, row: 6, width: 2, height: 1, type: "office" },
    { id: "3_회의실", name: "회의실", floor: 3, building: "본관", col: 10, row: 6, width: 2, height: 1, type: "other" },
    { id: "3_시청각실", name: "시청각실/음악실", floor: 3, building: "본관", col: 12, row: 6, width: 2, height: 1, type: "classroom" },
  ],

  // ──────────────────────────────────────────────────────────────────────────
  // 4층: 3층과 동일 구조
  // ──────────────────────────────────────────────────────────────────────────
  4: [
    // ── 강의동 ──
    { id: "4_강의실401", name: "강의실 401", floor: 4, building: "강의동", col: 0, row: 0, width: 1, height: 1, type: "classroom" },
    { id: "4_강의실402", name: "강의실 402", floor: 4, building: "강의동", col: 1, row: 0, width: 1, height: 1, type: "classroom" },
    { id: "4_강의실403", name: "강의실 403", floor: 4, building: "강의동", col: 2, row: 0, width: 1, height: 1, type: "classroom" },
    { id: "4_강의실404", name: "강의실 404", floor: 4, building: "강의동", col: 3, row: 0, width: 1, height: 1, type: "classroom" },
    { id: "4_강의실405", name: "강의실 405", floor: 4, building: "강의동", col: 4, row: 0, width: 1, height: 1, type: "classroom" },
    { id: "4_3학년교무실", name: "3학년 교무실", floor: 4, building: "강의동", col: 5, row: 0, width: 2, height: 1, type: "office" },
    { id: "4_화장실남_강의동", name: "화장실(남)", floor: 4, building: "강의동", col: 7, row: 0, width: 1, height: 1, type: "restroom" },
    { id: "4_복도_강의동", name: "복도", floor: 4, building: "강의동", col: 0, row: 1, width: 8, height: 1, type: "corridor" },
    { id: "4_계단_강의동", name: "계단", floor: 4, building: "강의동", col: 6, row: 2, width: 1, height: 1, type: "staircase" },
    { id: "4_화장실여_강의동", name: "화장실(여)", floor: 4, building: "강의동", col: 5, row: 2, width: 1, height: 1, type: "restroom" },
    { id: "4_강의동본관연결", name: "강의동 연결", floor: 4, building: "본관", col: 7, row: 2, width: 1, height: 2, type: "corridor" },

    // ── 실험동 ──
    { id: "4_물리실험실표", name: "물리학실험실Ⅱ", floor: 4, building: "실험동", col: 13, row: 0, width: 2, height: 1, type: "lab" },
    { id: "4_기자재실1", name: "기자재실", floor: 4, building: "실험동", col: 15, row: 0, width: 1, height: 1, type: "storage" },
    { id: "4_물리학교사연구실", name: "물리학 교사연구실", floor: 4, building: "실험동", col: 16, row: 0, width: 2, height: 1, type: "office" },
    { id: "4_기자재실2", name: "기자재실", floor: 4, building: "실험동", col: 18, row: 0, width: 1, height: 1, type: "storage" },
    { id: "4_물리실험실1", name: "물리실험실Ⅰ", floor: 4, building: "실험동", col: 19, row: 0, width: 2, height: 1, type: "lab" },
    { id: "4_발명공작실", name: "발명공작실", floor: 4, building: "실험동", col: 21, row: 0, width: 2, height: 1, type: "lab" },
    { id: "4_CBL", name: "CBL", floor: 4, building: "실험동", col: 21, row: 1, width: 2, height: 1, type: "classroom" },
    { id: "4_복도_실험동", name: "복도", floor: 4, building: "실험동", col: 13, row: 1, width: 8, height: 1, type: "corridor" },
    { id: "4_계단_실험동", name: "계단", floor: 4, building: "실험동", col: 14, row: 2, width: 1, height: 1, type: "staircase" },
    { id: "4_화장실여_실험동", name: "화장실(여)", floor: 4, building: "실험동", col: 15, row: 2, width: 1, height: 1, type: "restroom" },
    { id: "4_화장실남_실험동", name: "화장실(남)", floor: 4, building: "실험동", col: 16, row: 2, width: 1, height: 1, type: "restroom" },
    { id: "4_물리학실험실2", name: "물리학실험실Ⅱ", floor: 4, building: "실험동", col: 18, row: 2, width: 2, height: 1, type: "lab" },
    { id: "4_실험동본관연결", name: "실험동 연결", floor: 4, building: "본관", col: 13, row: 2, width: 1, height: 2, type: "corridor" },

    // ── 본관 ──
    { id: "4_복도북_본관", name: "복도", floor: 4, building: "본관", col: 0, row: 3, width: 21, height: 1, type: "corridor" },
    { id: "4_화장실여_본관", name: "화장실(여)", floor: 4, building: "본관", col: 0, row: 4, width: 1, height: 1, type: "restroom" },
    { id: "4_장애인화장실여_본관", name: "장애인화장실(여)", floor: 4, building: "본관", col: 1, row: 4, width: 1, height: 1, type: "restroom" },
    { id: "4_계단북_본관", name: "계단", floor: 4, building: "본관", col: 2, row: 4, width: 1, height: 1, type: "staircase" },
    { id: "4_학부모상담실", name: "학부모상주실Ⅱ", floor: 4, building: "본관", col: 3, row: 4, width: 2, height: 1, type: "office" },
    { id: "4_스터디카페", name: "스터디카페Ⅱ", floor: 4, building: "본관", col: 5, row: 4, width: 2, height: 1, type: "other" },
    { id: "4_계단중앙_본관", name: "계단", floor: 4, building: "본관", col: 10, row: 4, width: 1, height: 1, type: "staircase" },
    { id: "4_엘리베이터_본관", name: "엘리베이터", floor: 4, building: "본관", col: 11, row: 4, width: 1, height: 1, type: "elevator" },
    { id: "4_화장실남_본관", name: "화장실(남)", floor: 4, building: "본관", col: 12, row: 4, width: 1, height: 1, type: "restroom" },
    { id: "4_장애인화장실남_본관", name: "장애인화장실(남)", floor: 4, building: "본관", col: 13, row: 4, width: 1, height: 1, type: "restroom" },
    { id: "4_레인보우메이커실", name: "레인보우 메이커실", floor: 4, building: "본관", col: 20, row: 4, width: 1, height: 1, type: "lab" },
    { id: "4_복도남_본관", name: "복도", floor: 4, building: "본관", col: 0, row: 5, width: 21, height: 1, type: "corridor" },
    { id: "4_이학실1", name: "어학실Ⅱ", floor: 4, building: "본관", col: 0, row: 6, width: 2, height: 1, type: "classroom" },
    { id: "4_이학실2", name: "어학실Ⅰ", floor: 4, building: "본관", col: 2, row: 6, width: 2, height: 1, type: "classroom" },
    { id: "4_미래교육연구부", name: "미래교육연구부", floor: 4, building: "본관", col: 4, row: 6, width: 2, height: 1, type: "office" },
    { id: "4_입학전형서류평가실", name: "입학전형 서류평가실", floor: 4, building: "본관", col: 6, row: 6, width: 2, height: 1, type: "office" },
    { id: "4_입학진로상담부", name: "입학진로 상담부", floor: 4, building: "본관", col: 8, row: 6, width: 2, height: 1, type: "office" },
  ],

  // ──────────────────────────────────────────────────────────────────────────
  // 5층: 강의동(좌) + 본관(중앙·하) + 실험동(우)
  // ──────────────────────────────────────────────────────────────────────────
  5: [
    // ── 강의동 ──
    { id: "5_수학세미나실", name: "수학세미나실", floor: 5, building: "강의동", col: 0, row: 0, width: 2, height: 1, type: "classroom" },
    { id: "5_수학교사연구실", name: "수학교사 연구실", floor: 5, building: "강의동", col: 2, row: 0, width: 2, height: 1, type: "office" },
    { id: "5_국어세미나실", name: "국어세미나실", floor: 5, building: "강의동", col: 4, row: 0, width: 2, height: 1, type: "classroom" },
    { id: "5_중국어교과실", name: "중국어교과실", floor: 5, building: "강의동", col: 6, row: 0, width: 2, height: 1, type: "classroom" },
    { id: "5_화장실남_강의동", name: "화장실(남)", floor: 5, building: "강의동", col: 7, row: 0, width: 1, height: 1, type: "restroom" },
    { id: "5_복도_강의동", name: "복도", floor: 5, building: "강의동", col: 0, row: 1, width: 8, height: 1, type: "corridor" },
    { id: "5_학습실V", name: "학습실Ⅴ", floor: 5, building: "강의동", col: 5, row: 2, width: 1, height: 1, type: "classroom" },
    { id: "5_학습실VI", name: "학습실Ⅵ", floor: 5, building: "강의동", col: 6, row: 2, width: 1, height: 1, type: "classroom" },
    { id: "5_계단_강의동", name: "계단", floor: 5, building: "강의동", col: 7, row: 2, width: 1, height: 1, type: "staircase" },
    { id: "5_강의동본관연결", name: "강의동 연결", floor: 5, building: "본관", col: 7, row: 2, width: 1, height: 2, type: "corridor" },

    // ── 실험동 ──
    { id: "5_지구과학실험실1", name: "지구과학실험실Ⅰ", floor: 5, building: "실험동", col: 13, row: 0, width: 2, height: 1, type: "lab" },
    { id: "5_계획실", name: "박편제작실", floor: 5, building: "실험동", col: 15, row: 0, width: 1, height: 1, type: "lab" },
    { id: "5_미래실", name: "미래실", floor: 5, building: "실험동", col: 16, row: 0, width: 1, height: 1, type: "other" },
    { id: "5_용합실", name: "용합실", floor: 5, building: "실험동", col: 16, row: 1, width: 1, height: 1, type: "other" },
    { id: "5_심화실험실", name: "심화실험실", floor: 5, building: "실험동", col: 17, row: 0, width: 2, height: 1, type: "lab" },
    { id: "5_기자재실", name: "기자재실", floor: 5, building: "실험동", col: 19, row: 0, width: 1, height: 1, type: "storage" },
    { id: "5_지구과학교사연구실", name: "지구과학 교사연구실", floor: 5, building: "실험동", col: 20, row: 0, width: 2, height: 1, type: "office" },
    { id: "5_지구과학실험실2", name: "지구과학실험실Ⅱ", floor: 5, building: "실험동", col: 20, row: 1, width: 2, height: 1, type: "lab" },
    { id: "5_복도_실험동", name: "복도", floor: 5, building: "실험동", col: 13, row: 1, width: 7, height: 1, type: "corridor" },
    { id: "5_계단_실험동", name: "계단", floor: 5, building: "실험동", col: 14, row: 2, width: 1, height: 1, type: "staircase" },
    { id: "5_실험동본관연결", name: "실험동 연결", floor: 5, building: "본관", col: 13, row: 2, width: 1, height: 2, type: "corridor" },

    // ── 본관 ──
    { id: "5_복도북_본관", name: "복도", floor: 5, building: "본관", col: 0, row: 3, width: 21, height: 1, type: "corridor" },
    { id: "5_화장실여_본관", name: "화장실(여)", floor: 5, building: "본관", col: 0, row: 4, width: 1, height: 1, type: "restroom" },
    { id: "5_장애인화장실여_본관", name: "장애인화장실(여)", floor: 5, building: "본관", col: 1, row: 4, width: 1, height: 1, type: "restroom" },
    { id: "5_계단북_본관", name: "계단", floor: 5, building: "본관", col: 2, row: 4, width: 1, height: 1, type: "staircase" },
    { id: "5_스튜디오카페1", name: "스튜디오Ⅰ", floor: 5, building: "본관", col: 7, row: 4, width: 1, height: 1, type: "other" },
    { id: "5_스튜디오카페2", name: "스튜디오Ⅱ", floor: 5, building: "본관", col: 8, row: 4, width: 1, height: 1, type: "other" },
    { id: "5_스터디카페1", name: "스터디카페Ⅰ", floor: 5, building: "본관", col: 9, row: 4, width: 1, height: 1, type: "other" },
    { id: "5_계단중앙_본관", name: "계단", floor: 5, building: "본관", col: 10, row: 4, width: 1, height: 1, type: "staircase" },
    { id: "5_엘리베이터_본관", name: "엘리베이터", floor: 5, building: "본관", col: 11, row: 4, width: 1, height: 1, type: "elevator" },
    { id: "5_화장실남_본관", name: "화장실(남)", floor: 5, building: "본관", col: 12, row: 4, width: 1, height: 1, type: "restroom" },
    { id: "5_장애인화장실남_본관", name: "장애인화장실(남)", floor: 5, building: "본관", col: 13, row: 4, width: 1, height: 1, type: "restroom" },
    { id: "5_복도남_본관", name: "복도", floor: 5, building: "본관", col: 0, row: 5, width: 21, height: 1, type: "corridor" },
    { id: "5_학습실I", name: "학습실Ⅰ", floor: 5, building: "본관", col: 0, row: 6, width: 2, height: 1, type: "classroom" },
    { id: "5_학습실II", name: "학습실Ⅱ", floor: 5, building: "본관", col: 2, row: 6, width: 2, height: 1, type: "classroom" },
    { id: "5_학습실III", name: "학습실Ⅲ", floor: 5, building: "본관", col: 4, row: 6, width: 2, height: 1, type: "classroom" },
    { id: "5_학습지도실", name: "학습지도실", floor: 5, building: "본관", col: 6, row: 6, width: 2, height: 1, type: "office" },
    { id: "5_학습실IV", name: "학습실Ⅳ", floor: 5, building: "본관", col: 8, row: 6, width: 2, height: 1, type: "classroom" },
    { id: "5_도서관", name: "도서관", floor: 5, building: "본관", col: 19, row: 5, width: 2, height: 2, type: "other" },
  ],
};

// 모든 방 목록 (검색용)
export const ALL_ROOMS: Room[] = Object.values(FLOORS).flat();

// 이름 또는 번호로 방 검색 (외부/복도/연결통로 제외)
export function searchRooms(query: string): Room[] {
  if (!query.trim()) return [];
  const q = query.trim().toLowerCase();
  return ALL_ROOMS.filter(
    (r) =>
      r.building !== "외부" &&
      r.type !== "corridor" &&
      r.type !== "staircase" &&
      r.type !== "elevator" &&
      (r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q))
  ).slice(0, 10);
}

export function getRoomById(id: string): Room | undefined {
  return ALL_ROOMS.find((r) => r.id === id);
}

// 층의 모든 방 (렌더링용)
export function getRoomsOnFloor(floor: number): Room[] {
  return FLOORS[floor] || [];
}

// 두 방이 같은 건물인지 확인
export function isSameBuilding(a: Room, b: Room): boolean {
  const normA = a.building === "외부" ? "외부" : a.building;
  const normB = b.building === "외부" ? "외부" : b.building;
  return normA === normB;
}
