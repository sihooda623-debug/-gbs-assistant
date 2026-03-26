import { NextRequest, NextResponse } from "next/server";
import { suggestUIDesign } from "@/lib/openrouter";

export async function POST(request: NextRequest) {
  try {
    const { component, currentCode } = await request.json();

    if (!component || !currentCode) {
      return NextResponse.json(
        { error: "Missing component or currentCode" },
        { status: 400 }
      );
    }

    const result = await suggestUIDesign(component, currentCode);

    if (!result) {
      return NextResponse.json(
        { error: "Failed to generate design suggestions" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in suggest-design:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
