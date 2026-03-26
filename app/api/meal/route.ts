import { NextRequest, NextResponse } from "next/server";

const ATPT_CODE = "J10";
const SCHUL_CODE = "7530851";

type MealItem = { name: string; allergens: number[] };
type MealData = { items: MealItem[]; cal: string };

const cache: Record<string, { data: Record<string, MealData>; time: number }> = {};
const CACHE_TTL = 1000 * 60 * 60 * 6;

function parseRow(row: Record<string, string>): MealData {
  const raw: string = row.DDISH_NM ?? "";
  const items: MealItem[] = raw
    .split(/<br\s*\/?>/i)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^(.*?)\s*\(([\d.]+)\)\s*$/);
      if (m) {
        const allergens = m[2].split(".").map(Number).filter(Boolean);
        return { name: m[1].trim(), allergens };
      }
      return { name: s, allergens: [] };
    });
  return { items, cal: row.CAL_INFO ?? "" };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0].replace(/-/g, "");

  if (cache[date] && Date.now() - cache[date].time < CACHE_TTL) {
    return NextResponse.json({ meals: cache[date].data, date });
  }

  try {
    // 조식(1), 중식(2), 석식(3) 한 번에 조회 (MMEAL_SC_CODE 없이)
    const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&ATPT_OFCDC_SC_CODE=${ATPT_CODE}&SD_SCHUL_CODE=${SCHUL_CODE}&MLSV_YMD=${date}`;
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();

    const rows: Record<string, string>[] = json?.mealServiceDietInfo?.[1]?.row ?? [];

    const meals: Record<string, MealData> = {};
    for (const row of rows) {
      const code = row.MMEAL_SC_CODE; // "1"=조식, "2"=중식, "3"=석식
      meals[code] = parseRow(row);
    }

    cache[date] = { data: meals, time: Date.now() };
    return NextResponse.json({ meals, date });
  } catch {
    return NextResponse.json({ error: "급식 정보를 불러오지 못했어요" }, { status: 500 });
  }
}
