"use client";

import { useEffect, useState } from "react";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

// 알레르기 코드 → 이름
const ALLERGEN_MAP: Record<number, string> = {
  1: "난류", 2: "우유", 3: "메밀", 4: "땅콩", 5: "대두", 6: "밀",
  7: "고등어", 8: "게", 9: "새우", 10: "돼지고기", 11: "복숭아",
  12: "토마토", 13: "아황산류", 14: "호두", 15: "닭고기", 16: "쇠고기",
  17: "오징어", 18: "조개류", 19: "잣",
};

// 선호 음식 카테고리 (키워드 기반 매칭) — 구체적으로 세분화
export const FOOD_PREFS = [
  // 면류
  { key: "ramen",     label: "🍜 라면",      keywords: ["라면","라볶이"] },
  { key: "noodle",    label: "🍝 기타 면",   keywords: ["국수","우동","냉면","파스타","쫄면","비빔면","소면","스파게티","짜장면","짬뽕면","칼국수","막국수"] },
  // 밥류
  { key: "fried_rice",label: "🍳 볶음밥",    keywords: ["볶음밥"] },
  { key: "bibimbap",  label: "🥣 비빔밥/덮밥", keywords: ["비빔밥","덮밥","덮밥류"] },
  // 돼지고기 세분화
  { key: "jeyuk",     label: "🥩 제육/삼겹", keywords: ["제육","삼겹","두루치기","보쌈"] },
  { key: "donkkas",   label: "🍱 돈까스",    keywords: ["돈까스","돈가스","커틀릿"] },
  { key: "pork_etc",  label: "🐷 기타 돼지", keywords: ["돼지","햄","소시지","베이컨","목살"] },
  // 닭고기 세분화
  { key: "fried_chk", label: "🍗 치킨/닭튀김", keywords: ["치킨","닭튀김","너겟","윙","봉","강정"] },
  { key: "dak_gal",   label: "🍲 닭갈비/찜닭", keywords: ["닭갈비","찜닭","닭볶음","훈제닭"] },
  // 소고기
  { key: "bulgogi",   label: "🥩 불고기/갈비", keywords: ["불고기","갈비","갈비찜","LA갈비","너비아니"] },
  { key: "beef_etc",  label: "🐄 기타 소고기", keywords: ["소고기","쇠고기","육전","스테이크","한우","장조림"] },
  // 해산물 세분화
  { key: "fish_grill",label: "🐟 생선구이",  keywords: ["고등어","갈치","꽁치","임연수","삼치","생선구이","조기"] },
  { key: "shrimp",    label: "🍤 새우/튀김",  keywords: ["새우","새우튀김","새우볶음"] },
  { key: "seafood_etc",label: "🦑 기타 해산물", keywords: ["오징어","조개","게","참치","연어","명태","동태","어묵"] },
  // 분식/빵
  { key: "tteokbokki",label: "🌶️ 떡볶이",   keywords: ["떡볶이","라볶이"] },
  { key: "bread",     label: "🍞 빵/샌드위치", keywords: ["빵","토스트","샌드위치","베이글","크로와상","모닝롤"] },
  { key: "pizza",     label: "🍕 피자",       keywords: ["피자"] },
  // 디저트
  { key: "yogurt",    label: "🥛 요거트/유제품", keywords: ["요거트","요구르트","우유","치즈"] },
  { key: "fruit",     label: "🍎 과일",       keywords: ["과일","사과","바나나","귤","포도","딸기","수박","참외","복숭아"] },
  { key: "dessert",   label: "🍮 기타 디저트", keywords: ["아이스크림","케이크","푸딩","젤리","초코","쿠키"] },
];

type MealItem = { name: string; allergens: number[] };
type MealData = { items: MealItem[]; cal: string };

const MEAL_TYPES = [
  { code: "1", label: "조식" },
  { code: "2", label: "중식" },
  { code: "3", label: "석식" },
];

function getWeekDays(base: Date) {
  const monday = new Date(base);
  monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toYYYYMMDD(d: Date) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function matchesKeywords(name: string, keywords: string[]) {
  return keywords.some((kw) => name.includes(kw));
}

export default function MealTab() {
  const today = new Date();
  const todayStr = toYYYYMMDD(today);
  const isWeekend = today.getDay() === 0 || today.getDay() === 6;

  const [weekBase, setWeekBase] = useState(today);
  const [selectedDate, setSelectedDate] = useState(isWeekend ? getWeekDays(today)[0] : today);
  const [mealTab, setMealTab] = useState("2"); // 중식 기본
  const [meals, setMeals] = useState<Record<string, MealData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // 선호/알레르기 (localStorage)
  const [favPrefs, setFavPrefs] = useState<string[]>([]);
  const [userAllergens, setUserAllergens] = useState<number[]>([]);

  const weekDays = getWeekDays(weekBase);
  const selStr = toYYYYMMDD(selectedDate);

  useEffect(() => {
    const saved = localStorage.getItem("meal_prefs");
    if (saved) setFavPrefs(JSON.parse(saved));
    const savedA = localStorage.getItem("meal_allergens");
    if (savedA) setUserAllergens(JSON.parse(savedA));
  }, []);

  useEffect(() => { fetchMeal(selectedDate); }, [selectedDate]); // eslint-disable-line

  async function fetchMeal(date: Date) {
    setLoading(true); setError(""); setMeals({});
    try {
      const res = await fetch(`/api/meal?date=${toYYYYMMDD(date)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMeals(data.meals ?? {});
      // 해당 날짜에 없는 식사 탭이면 중식으로 fallback
      if (data.meals && !data.meals[mealTab] && data.meals["2"]) setMealTab("2");
    } catch { setError("급식 정보를 불러오지 못했어요"); }
    setLoading(false);
  }

  function saveFavPrefs(prefs: string[]) {
    setFavPrefs(prefs);
    localStorage.setItem("meal_prefs", JSON.stringify(prefs));
  }

  function saveAllergens(allergens: number[]) {
    setUserAllergens(allergens);
    localStorage.setItem("meal_allergens", JSON.stringify(allergens));
  }

  const currentMeal = meals[mealTab];

  // 현재 식사에서 알레르기 포함 항목
  const dangerItems = currentMeal?.items.filter(
    (item) => item.allergens.some((a) => userAllergens.includes(a))
  ) ?? [];

  // 현재 식사에서 선호 음식 포함 항목
  function isFav(item: MealItem) {
    return favPrefs.some((pref) => {
      const fp = FOOD_PREFS.find((f) => f.key === pref);
      return fp ? matchesKeywords(item.name, fp.keywords) : false;
    });
  }

  function isDanger(item: MealItem) {
    return item.allergens.some((a) => userAllergens.includes(a));
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 */}
      <div className="bg-white px-4 pt-10 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">급식표</h1>
            <p className="text-sm text-gray-500 mt-0.5">경기북과학고등학교</p>
          </div>
          <button onClick={() => setShowSettings((v) => !v)}
            className={`text-sm px-3 py-1.5 rounded-xl transition-colors ${showSettings ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
            ⚙️ 설정
          </button>
        </div>

        {/* 주 이동 */}
        <div className="flex items-center justify-between mt-3">
          <button onClick={() => { const d = new Date(weekBase); d.setDate(d.getDate()-7); setWeekBase(d); setSelectedDate(getWeekDays(d)[0]); }}
            className="px-2 py-1 text-gray-400 text-xl">‹</button>
          <span className="text-sm font-medium text-gray-700">
            {weekDays[0].getMonth()+1}월 {weekDays[0].getDate()}일 – {weekDays[4].getMonth()+1}월 {weekDays[4].getDate()}일
          </span>
          <button onClick={() => { const d = new Date(weekBase); d.setDate(d.getDate()+7); setWeekBase(d); setSelectedDate(getWeekDays(d)[0]); }}
            className="px-2 py-1 text-gray-400 text-xl">›</button>
        </div>

        {/* 요일 선택 */}
        <div className="flex gap-1 mt-1">
          {weekDays.map((d) => {
            const dStr = toYYYYMMDD(d);
            return (
              <button key={dStr} onClick={() => setSelectedDate(d)}
                className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-colors ${
                  dStr === selStr ? "bg-blue-600 text-white" :
                  dStr === todayStr ? "bg-blue-50 text-blue-600" : "text-gray-500"
                }`}>
                <span className="text-xs">{DAY_NAMES[d.getDay()]}</span>
                <span className="text-sm font-bold">{d.getDate()}</span>
              </button>
            );
          })}
        </div>

        {/* 조식/중식/석식 탭 */}
        <div className="flex gap-2 mt-2">
          {MEAL_TYPES.map((mt) => (
            <button key={mt.code} onClick={() => setMealTab(mt.code)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                mealTab === mt.code ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
              }`}>
              {mt.label}
              {meals[mt.code] ? "" : " -"}
            </button>
          ))}
        </div>
      </div>

      {/* 설정 패널 */}
      {showSettings && (
        <div className="px-4 py-4 bg-gray-50 border-b border-gray-100 flex flex-col gap-4">
          {/* 선호 음식 */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">선호 음식 <span className="text-xs font-normal text-gray-400">(있으면 형광펜 표시)</span></p>
            <div className="flex flex-wrap gap-1.5">
              {FOOD_PREFS.map((fp) => (
                <button key={fp.key}
                  onClick={() => saveFavPrefs(favPrefs.includes(fp.key) ? favPrefs.filter(k=>k!==fp.key) : [...favPrefs, fp.key])}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-colors ${
                    favPrefs.includes(fp.key) ? "border-yellow-400 bg-yellow-50 text-yellow-700" : "border-gray-200 text-gray-500"
                  }`}>
                  {fp.label}
                </button>
              ))}
            </div>
          </div>

          {/* 알레르기 */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">알레르기 <span className="text-xs font-normal text-gray-400">(있으면 ⚠️ 위험 표시)</span></p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(ALLERGEN_MAP).map(([code, name]) => {
                const n = Number(code);
                return (
                  <button key={code}
                    onClick={() => saveAllergens(userAllergens.includes(n) ? userAllergens.filter(a=>a!==n) : [...userAllergens, n])}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-colors ${
                      userAllergens.includes(n) ? "border-red-400 bg-red-50 text-red-700" : "border-gray-200 text-gray-500"
                    }`}>
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 급식 내용 */}
      <div className="px-4 pt-4 flex flex-col gap-3 pb-8">
        {/* 알레르기 경고 배너 */}
        {dangerItems.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2">
            <span className="text-lg shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-red-700">알레르기 주의!</p>
              <p className="text-xs text-red-500 mt-0.5">
                {dangerItems.map(i => i.name).join(", ")}에 알레르기 성분이 포함돼 있어요
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-400 text-sm">불러오는 중...</div>
        )}
        {error && (
          <div className="bg-red-50 rounded-2xl p-6 text-center text-red-400 text-sm">{error}</div>
        )}

        {!loading && !error && !currentMeal && (
          <div className="bg-gray-50 rounded-2xl p-8 text-center">
            <p className="text-3xl mb-2">🍽️</p>
            <p className="text-gray-400 text-sm">
              {Object.keys(meals).length === 0 ? "급식 정보가 없어요" : "이 끼니 정보가 없어요"}
            </p>
            <p className="text-gray-300 text-xs mt-1">주말이거나 방학일 수 있어요</p>
          </div>
        )}

        {!loading && currentMeal && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-800">
                {selectedDate.getMonth()+1}월 {selectedDate.getDate()}일{" "}
                <span className="text-gray-400 font-normal">({DAY_NAMES[selectedDate.getDay()]})</span>
                {" "}{MEAL_TYPES.find(m=>m.code===mealTab)?.label}
                {selStr === todayStr && <span className="ml-2 text-xs text-blue-600 font-medium">오늘</span>}
              </h2>
              {currentMeal.cal && <span className="text-xs text-gray-400">{currentMeal.cal}</span>}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {currentMeal.items.map((item, i) => {
                const fav = isFav(item);
                const danger = isDanger(item);
                const EMOJIS = ["🍚","🍲","🥗","🍖","🥬","🍱","🥘","🍜","🍳","🫕"];
                return (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-gray-50" : ""} ${
                    danger ? "bg-red-50" : fav ? "bg-yellow-50" : ""
                  }`}>
                    <span className="text-lg shrink-0">{EMOJIS[i % EMOJIS.length]}</span>
                    <span className={`text-sm flex-1 ${danger ? "text-red-700 font-medium" : fav ? "text-yellow-800 font-medium" : "text-gray-800"}`}>
                      {item.name}
                      {fav && !danger && <span className="ml-1 text-xs text-yellow-500">★</span>}
                    </span>
                    {danger && (
                      <span className="text-xs text-red-500 shrink-0">
                        ⚠️ {item.allergens.filter(a => userAllergens.includes(a)).map(a => ALLERGEN_MAP[a]).join("·")}
                      </span>
                    )}
                    {item.allergens.length > 0 && !danger && (
                      <span className="text-xs text-gray-300 shrink-0">{item.allergens.join(".")}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 범례 */}
            {(favPrefs.length > 0 || userAllergens.length > 0) && (
              <div className="flex gap-3 text-xs text-gray-400">
                {favPrefs.length > 0 && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-100 border border-yellow-300 inline-block"/>선호 음식</span>}
                {userAllergens.length > 0 && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-100 border border-red-300 inline-block"/>알레르기 주의</span>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
