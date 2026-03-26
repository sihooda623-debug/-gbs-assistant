export const COMMON_SCHEDULE = [
  { period: "1교시", startTime: "09:10", endTime: "10:00", type: "regular" },
  { period: "2교시", startTime: "10:10", endTime: "11:00", type: "regular" },
  { period: "3교시", startTime: "11:10", endTime: "12:00", type: "regular" },
  { period: "4교시", startTime: "12:10", endTime: "13:00", type: "regular" },
  { period: "점심시간", startTime: "13:00", endTime: "14:00", type: "meal" },
  { period: "5교시", startTime: "14:00", endTime: "14:50", type: "regular" },
  { period: "6교시", startTime: "15:00", endTime: "15:50", type: "regular" },
  { period: "7교시", startTime: "16:00", endTime: "16:50", type: "regular" },
  { period: "저녁시간", startTime: "17:15", endTime: "18:50", type: "meal" },
  { period: "자습 1교시", startTime: "18:50", endTime: "19:40", type: "self-study" },
  { period: "자습 2교시", startTime: "19:50", endTime: "20:40", type: "self-study" },
  { period: "자습 3교시", startTime: "20:50", endTime: "21:40", type: "self-study" },
  { period: "자습 4교시", startTime: "22:10", endTime: "24:00", type: "self-study" },
] as const;

export type ScheduleType = "regular" | "meal" | "self-study";

// 금요일엔 모든 학년이 6교시 후 하교 → 16:00 이후 항목 숨김
export const FRIDAY_CUTOFF_TIME = "16:00";

export const TYPE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  regular:      { bg: "bg-blue-50",   text: "text-blue-700",  label: "수업" },
  meal:         { bg: "bg-yellow-50", text: "text-yellow-700", label: "식사" },
  "self-study": { bg: "bg-gray-50",   text: "text-gray-500",  label: "자습" },
};
