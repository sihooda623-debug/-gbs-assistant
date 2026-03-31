import { SCHOOL_EVENTS } from "@/lib/school-events";
import { COMMON_SCHEDULE } from "@/lib/schedule";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export async function POST(req: Request) {
  if (!process.env.OPENROUTER_API_KEY) {
    return Response.json(
      { error: "OPENROUTER_API_KEY not set" },
      { status: 500 }
    );
  }

  try {
    const { messages, userProfile } = await req.json();

    // 학사일정 정보 포맷팅
    const eventsText = SCHOOL_EVENTS.map(
      (e) =>
        `- ${e.date}: ${e.title}${
          e.type === "exam"
            ? " (시험)"
            : e.type === "holiday"
              ? " (휴일)"
              : " (행사)"
        }`
    ).join("\n");

    // 시간표 정보 포맷팅
    const scheduleText = COMMON_SCHEDULE.map(
      (s) => `${s.period}: ${s.startTime}~${s.endTime}`
    ).join("\n");

    // 사용자 개인 시간표 조회
    let userTimetableText = "";
    if (userProfile?.grade) {
      try {
        const { data } = await supabase.from("timetables")
          .select("*")
          .eq("grade", userProfile.grade)
          .eq("class", userProfile.class_num)
          .single();

        if (data) {
          const timetable = data.timetable || [];
          userTimetableText = `\n\n[${userProfile.grade}학년 ${userProfile.class_num}반 시간표]\n`;
          const dayLabels = ["월", "화", "수", "목", "금"];
          timetable.forEach((daySchedule: any[], dayIdx: number) => {
            if (daySchedule.length > 0) {
              userTimetableText += `${dayLabels[dayIdx]}요일: `;
              userTimetableText += daySchedule
                .map((p: any, i: number) => p.subject ? `${i+1}교시 ${p.subject}` : null)
                .filter(Boolean)
                .join(", ");
              userTimetableText += "\n";
            }
          });
        }
      } catch (e) {
        console.error("시간표 조회 실패:", e);
      }
    }

    // 현재 시간 정보
    const now = new Date();
    const currentDayKor = DAYS[now.getDay()];
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    // 시스템 프롬프트
    const systemPrompt = `당신은 GBS(경기북과학고) 학생들을 위한 친근한 AI 도우미입니다. 한국어로 친절하게 답변해주세요.

[현재 정보]
- 오늘: ${currentDayKor}요일
- 현재 시간: ${currentTime}

[교시 시간표]
${scheduleText}

[학사일정]
${eventsText}${userTimetableText}

"다음시간은?"이나 "지금 뭐하는 시간?"이라고 물어보면, 현재 시간과 개인 시간표를 바탕으로 정확하게 답변해주세요.
학교 생활, 일정, 시간표 등에 대해 물어보면 위의 정보를 바탕으로 정확하게 답변해주세요.
일반적인 질문에도 도움이 될 수 있도록 친절하게 대응해주세요.`;

    // OpenRouter API 호출
    const requestBody = {
      model: "anthropic/claude-3-haiku",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1024,
    };

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenRouter error:", response.status, errorData);
      return Response.json(
        { error: `OpenRouter error: ${response.status} - ${errorData}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      return Response.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    return Response.json({ reply });
  } catch (error) {
    console.error("Error in AI chat:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
