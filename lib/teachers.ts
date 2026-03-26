/**
 * 컴시간알리미에서 나오는 2글자 이름 → 풀네임 매핑
 * subject(과목) + teacher(2글자) 조합으로 구분
 * (같은 2글자라도 과목이 다르면 다른 선생님)
 */

// 과목 상관없이 유일한 경우
const TEACHER_MAP: Record<string, string> = {
  "김세": "김세희",
  "조동": "조동기",
  "홍창": "홍창욱",
  "양하": "양하영",
  "강은": "강은지",
  "이후": "이후정",
  "백민": "백민준",
  "임수": "임수빈",
  "오상": "오상림",
  "박동": "박동희",
  "김정": "김정민",
  "이진": "이진희",
  "박성": "박성진",
  "전선": "전선영",
  "김진": "김진영",
  "김선": "김선아",
};

// 같은 2글자인데 과목에 따라 다른 선생님
const TEACHER_BY_SUBJECT: Record<string, Record<string, string>> = {
  "임기": {
    "공영1": "임기홍",
    "공영2": "임기홍",
    "공수1": "임기묵",
    "공수2": "임기묵",
    "default": "임기홍", // 기본값
  },
};

export function getFullName(teacher: string, subject: string): string {
  if (!teacher) return "";

  // 과목 기반 구분 필요한 경우
  if (TEACHER_BY_SUBJECT[teacher]) {
    const subjectMap = TEACHER_BY_SUBJECT[teacher];
    return subjectMap[subject] ?? subjectMap["default"] ?? teacher;
  }

  // 일반 매핑
  return TEACHER_MAP[teacher] ?? teacher;
}
