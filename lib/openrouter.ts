/**
 * OpenRouter API를 통한 멀티 AI 통합
 * - Mistral 7B: 경로 설명, 간단한 작업
 * - Gemini 2.0: UI 디자인, 창의적 작업
 * - ChatGPT 4o: 데이터 검증, 복잡한 로직
 */

type ModelType = "mistral" | "gemini" | "chatgpt" | "claude";

const MODEL_MAP: Record<ModelType, string> = {
  mistral: "mistralai/mistral-7b",
  gemini: "google/gemini-1.5-pro",
  chatgpt: "openai/gpt-4-turbo",
  claude: "anthropic/claude-3.5-sonnet",
};

/**
 * OpenRouter API 호출 (공용)
 */
export async function callOpenRouter(
  prompt: string,
  model: ModelType = "mistral",
  options?: { temperature?: number; maxTokens?: number }
): Promise<string | null> {
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn("OPENROUTER_API_KEY not set");
    return null;
  }

  const modelId = MODEL_MAP[model];
  if (!modelId) {
    console.error(`Unknown model: ${model}`);
    return null;
  }

  try {
    const body = {
      model: modelId,
      messages: [{ role: "user", content: prompt }],
      temperature: options?.temperature ?? 0.7,
    };

    if (options?.maxTokens) {
      (body as any).max_tokens = options.maxTokens;
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`OpenRouter error (${model}):`, response.status);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (error) {
    console.error(`Error calling OpenRouter (${model}):`, error);
    return null;
  }
}

/**
 * 경로 설명 생성 (Mistral - 싸고 빠름)
 */
export async function generatePathDescription(
  instruction: string,
  detail: string,
  context: {
    fromRoom: string;
    toRoom: string;
    floor: number;
    isOutdoor: boolean;
    isStairs: boolean;
  }
): Promise<{ instruction: string; detail: string } | null> {
  const prompt = `당신은 학교 캠퍼스 길찾기 안내 시스템입니다. 학생들이 쉽게 이해하는 친근한 한국어로 경로를 설명해주세요.

현재 상황:
- 출발: ${context.fromRoom}
- 목적지: ${context.toRoom}
- 층: ${context.floor}층
- 실외: ${context.isOutdoor ? "예" : "아니오"}
- 계단 이동: ${context.isStairs ? "예" : "아니오"}

기존 설명:
- 한 줄 요약: ${instruction}
- 상세 설명: ${detail}

요청: JSON으로만 응답
{
  "instruction": "한 줄 요약 (최대 20자)",
  "detail": "상세 설명 (최대 50자)"
}`;

  const content = await callOpenRouter(prompt, "mistral", { maxTokens: 200 });
  if (!content) return null;

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      instruction: parsed.instruction || instruction,
      detail: parsed.detail || detail,
    };
  } catch {
    return null;
  }
}

/**
 * 건물 데이터 검증 (ChatGPT - 정확함)
 */
export async function validateBuildingData(
  roomName: string,
  roomData: {
    floor: number;
    building: string;
    col: number;
    row: number;
    width: number;
    height: number;
  }
): Promise<{
  isValid: boolean;
  issues: string[];
  suggestions?: string[];
} | null> {
  const prompt = `당신은 학교 건물 데이터베이스 검증 전문가입니다.

방 정보:
- 이름: ${roomName}
- 층: ${roomData.floor}층
- 건물: ${roomData.building}
- 위치: (col: ${roomData.col}, row: ${roomData.row})
- 크기: ${roomData.width}x${roomData.height}

이 데이터의 논리적 오류를 찾아주세요.
- 층 범위는 1-5층
- 좌표는 0-100 범위
- 실험동/강의동의 위치가 맞는지 확인

JSON 응답:
{
  "isValid": boolean,
  "issues": ["문제 1", "문제 2"],
  "suggestions": ["개선안 1"]
}`;

  const content = await callOpenRouter(prompt, "chatgpt", { maxTokens: 300 });
  if (!content) return null;

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

/**
 * UI 디자인 제안 (Gemini - 창의적)
 */
export async function suggestUIDesign(
  component: string,
  currentCode: string
): Promise<{
  suggestions: string[];
  colors?: string[];
  improvements?: string[];
} | null> {
  const prompt = `당신은 UI/UX 디자인 전문가입니다. Tailwind CSS를 사용합니다.

컴포넌트: ${component}
현재 코드:
\`\`\`
${currentCode.slice(0, 300)}...
\`\`\`

이 컴포넌트를 더 예쁘고 사용하기 좋게 개선하는 방법을 제안해주세요.

JSON 응답:
{
  "suggestions": ["개선안 1", "개선안 2"],
  "colors": ["추천 색상 1", "추천 색상 2"],
  "improvements": ["구체적 개선사항"]
}`;

  const content = await callOpenRouter(prompt, "gemini", { temperature: 0.9, maxTokens: 400 });
  if (!content) return null;

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

/**
 * 여러 경로 단계를 병렬로 처리해서 설명 생성
 */
export async function enhancePathSteps(steps: Array<{
  instruction: string;
  detail: string;
  floor: number;
  isOutdoor: boolean;
  isStairs: boolean;
  pathRoomIds: string[];
}>, fromRoom: string, toRoom: string) {
  return Promise.all(
    steps.map((step, idx) =>
      generatePathDescription(step.instruction, step.detail, {
        fromRoom: idx === 0 ? fromRoom : `${step.floor}층`,
        toRoom: idx === steps.length - 1 ? toRoom : `${step.floor}층`,
        floor: step.floor,
        isOutdoor: step.isOutdoor,
        isStairs: step.isStairs,
      })
    )
  );
}
