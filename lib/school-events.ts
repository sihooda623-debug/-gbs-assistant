export type SchoolEvent = {
  date: string;
  title: string;
  type: "holiday" | "exam" | "event";
  grade?: number;
};

export const SCHOOL_EVENTS: SchoolEvent[] = [
  // 3월
  { date: "2026-03-25", title: "과학동아리 조직 + 자율동아리 조직", type: "event" },
  { date: "2026-03-25", title: "실험실 안전교육 (7교시)", type: "event" },
  { date: "2026-03-26", title: "학생자치회장 선거", type: "event" },

  // 3월 다섯째 주
  { date: "2026-03-30", title: "학생과학발명품경진대회 (7,8교시)", type: "event" },
  { date: "2026-03-31", title: "R&E 기초교육 2텀 1차 (8,9교시)", type: "event" },
  { date: "2026-03-31", title: "마감: 과학창의융합의 날 신청", type: "event" },

  // 4월
  { date: "2026-04-03", title: "학생자치수련회", type: "event" },
  { date: "2026-04-07", title: "R&E 기초교육 2텀 2차 (8,9교시)", type: "event" },
  { date: "2026-04-07", title: "개교기념일", type: "holiday" },
  { date: "2026-04-10", title: "건강검진", type: "event", grade: 1 },
  { date: "2026-04-20", title: "1차 지필평가", type: "exam" },
  { date: "2026-04-21", title: "1차 지필평가", type: "exam" },
  { date: "2026-04-22", title: "1차 지필평가", type: "exam" },
  { date: "2026-04-23", title: "1차 지필평가", type: "exam" },
  { date: "2026-04-30", title: "과학창의융합의 날", type: "event" },

  // 5월
  { date: "2026-05-01", title: "재량휴업일 (근로자의 날)", type: "holiday" },
  { date: "2026-05-05", title: "어린이날 / 재량휴업일", type: "holiday" },
  { date: "2026-05-08", title: "주제별체험학습", type: "event", grade: 1 },
  { date: "2026-05-15", title: "스승의 날", type: "event" },
  { date: "2026-05-22", title: "체육의 날", type: "event" },
  { date: "2026-05-25", title: "부처님오신날", type: "holiday" },
  { date: "2026-05-26", title: "대체공휴일", type: "holiday" },
  { date: "2026-05-29", title: "학부모 대상 수업공개", type: "event" },

  // 6월
  { date: "2026-06-04", title: "전국동시지방선거 (휴일)", type: "holiday" },
  { date: "2026-06-22", title: "2차 지필평가", type: "exam" },
  { date: "2026-06-23", title: "2차 지필평가", type: "exam" },
  { date: "2026-06-24", title: "2차 지필평가", type: "exam" },
  { date: "2026-06-25", title: "2차 지필평가", type: "exam" },

  // 7월
  { date: "2026-07-10", title: "융합과학탐구 계획발표", type: "event", grade: 1 },
  { date: "2026-07-16", title: "과학동아리 학술발표", type: "event" },
  { date: "2026-07-22", title: "방학식", type: "event" },
];
