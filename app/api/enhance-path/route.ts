import { NextRequest, NextResponse } from "next/server";
import { PathStep } from "@/lib/pathfinding";
import { generatePathDescription } from "@/lib/openrouter";

export async function POST(request: NextRequest) {
  try {
    const { steps, fromRoom, toRoom } = await request.json() as {
      steps: PathStep[];
      fromRoom: string;
      toRoom: string;
    };

    if (!steps || steps.length === 0) {
      return NextResponse.json({ error: "No steps provided" }, { status: 400 });
    }

    // 각 단계의 설명을 OpenRouter로 개선
    const enhancedSteps = await Promise.all(
      steps.map(async (step, idx) => {
        const enhanced = await generatePathDescription(
          step.instruction,
          step.detail,
          {
            fromRoom: idx === 0 ? fromRoom : `${step.floor}층`,
            toRoom: idx === steps.length - 1 ? toRoom : `${step.floor}층`,
            floor: step.floor,
            isOutdoor: step.isOutdoor,
            isStairs: step.isStairs,
          }
        );

        return {
          ...step,
          instruction: enhanced?.instruction || step.instruction,
          detail: enhanced?.detail || step.detail,
        };
      })
    );

    return NextResponse.json({ steps: enhancedSteps });
  } catch (error) {
    console.error("Error enhancing path:", error);
    return NextResponse.json(
      { error: "Failed to enhance path descriptions" },
      { status: 500 }
    );
  }
}
