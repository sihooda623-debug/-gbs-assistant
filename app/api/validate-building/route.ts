import { NextRequest, NextResponse } from "next/server";
import { validateBuildingData } from "@/lib/openrouter";

export async function POST(request: NextRequest) {
  try {
    const { roomName, roomData } = await request.json();

    if (!roomName || !roomData) {
      return NextResponse.json(
        { error: "Missing roomName or roomData" },
        { status: 400 }
      );
    }

    const result = await validateBuildingData(roomName, roomData);

    if (!result) {
      return NextResponse.json(
        { error: "Failed to validate building data" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in validate-building:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
