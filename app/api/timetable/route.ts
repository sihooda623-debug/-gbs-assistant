import { NextRequest, NextResponse } from "next/server";

const GBS_SCHOOL_CODE = 12045;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Timetable = require("comcigan-parser");

let cachedData: Record<string, unknown> | null = null;
let cachedAt: number = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1시간 캐시

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const grade = Number(searchParams.get("grade"));
  const classNum = Number(searchParams.get("class"));

  if (!grade || !classNum) {
    return NextResponse.json({ error: "grade, class 파라미터가 필요해요" }, { status: 400 });
  }

  try {
    // 캐시된 데이터가 있으면 재사용
    if (!cachedData || Date.now() - cachedAt > CACHE_TTL) {
      const t = new Timetable();
      await t.init();
      await t.setSchool(GBS_SCHOOL_CODE);
      cachedData = await t.getTimetable();
      cachedAt = Date.now();
    }

    const classTimetable = (cachedData as Record<number, Record<number, unknown[][]>>)[grade]?.[classNum];

    if (!classTimetable) {
      return NextResponse.json({ error: "해당 학년/반 데이터가 없어요" }, { status: 404 });
    }

    return NextResponse.json({ timetable: classTimetable });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "시간표를 불러오지 못했어요" }, { status: 500 });
  }
}
