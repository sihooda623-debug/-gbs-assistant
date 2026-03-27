"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const CLUBS = [
  { name: "LIMES", desc: "수학반" },
  { name: "NEO", desc: "현대물리 및 반도체 탐구반" },
  { name: "CHEX", desc: "화학실험반" },
  { name: "In Vitro", desc: "생명과학반" },
  { name: "UNREVR", desc: "과학융합반" },
  { name: "NEXT", desc: "로봇탐구토론반" },
  { name: "RootM", desc: "수학체험반" },
  { name: "Andamiro", desc: "물리탐구토론반" },
  { name: "E.Q.", desc: "응용화학반" },
  { name: "GLOBE", desc: "환경 및 에너지 탐구반" },
  { name: "Pulcherrima", desc: "천체관측반" },
  { name: "SADA", desc: "인공지능연구개발반" },
  { name: "Na'PLACE", desc: "응용수학반" },
  { name: "LAONZENA", desc: "수학탐구반" },
  { name: "T.I.P.S", desc: "물리실험탐구반" },
  { name: "EDTA", desc: "화학탐구반" },
  { name: "DNA", desc: "생명과학탐구반" },
  { name: "Archi", desc: "기상현상 및 건축반" },
];

const RNE_FIELDS = ["수학", "물리", "화학", "생명", "지구과학", "정보"];

const AFTER_SCHOOL_PERIODS = [
  { period: "자습 1교시", startTime: "18:50", endTime: "19:40" },
  { period: "자습 2교시", startTime: "19:50", endTime: "20:40" },
  { period: "자습 3교시", startTime: "20:50", endTime: "21:40" },
];

type Profile = {
  name: string;
  grade: number;
  class_num: number;
  rne_name: string;
  rne_teacher: string;
  rne_partners: string;
  club_name: string;
  club_day: string;
  club_time: string;
  club_place: string;
  after_name: string;
  after_day: string;
  after_time: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // 편집용 상태
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [classNum, setClassNum] = useState("");
  const [rneDecided, setRneDecided] = useState<boolean | null>(null);
  const [rneField, setRneField] = useState("");
  const [rneName, setRneName] = useState("");
  const [rneTeacher, setRneTeacher] = useState("");
  const [rnePartners, setRnePartners] = useState("");
  const [clubName, setClubName] = useState("");
  const [clubPlace, setClubPlace] = useState("");
  const [afterName, setAfterName] = useState("");
  const [afterDay, setAfterDay] = useState("");
  const [afterTimes, setAfterTimes] = useState<string[]>([]);

  // 기숙사QR
  const [dormQrImage, setDormQrImage] = useState<string>("");
  const [showQrModal, setShowQrModal] = useState(false);

  // 프로필 로드
  useEffect(() => {
    // 1단계: 로컬 세션 확인 (오프라인 지원)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }

      // 2단계: 캐시된 프로필 먼저 로드
      const cached = localStorage.getItem("cached_profile");
      if (cached) {
        try {
          const cachedData = JSON.parse(cached) as Profile;
          setProfile(cachedData);
          loadProfileState(cachedData);
        } catch (e) {
          console.error("캐시 로드 실패:", e);
        }
      }

      // 기숙사QR 이미지 로드
      const qrImg = localStorage.getItem("dorm_qr_image");
      if (qrImg) {
        setDormQrImage(qrImg);
      }

      setAuthChecked(true);

      // 3단계: 백그라운드에서 Supabase 검증 및 업데이트
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) {
          router.replace("/login");
          return;
        }

        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (!data) {
              router.replace("/onboarding");
              return;
            }
            setProfile(data as Profile);
            localStorage.setItem("cached_profile", JSON.stringify(data));
            loadProfileState(data);
          })
          .catch(() => {});
      }).catch(() => {});
    }).catch(() => {
      setAuthChecked(true);
    });
  }, []);

  function loadProfileState(data: Profile) {
    setName(data.name);
    setGrade(String(data.grade));
    setClassNum(String(data.class_num));
    setRneName(data.rne_name);
    setRneTeacher(data.rne_teacher);
    setRnePartners(data.rne_partners);
    setClubName(data.club_name);
    setClubPlace(data.club_place);
    setAfterName(data.after_name);
    setAfterDay(data.after_day);
    setAfterTimes(data.after_time ? JSON.parse(data.after_time) : []);
    // R&E 결정 상태 파악
    if (data.rne_name && !data.rne_name.includes("[")) {
      setRneDecided(true);
      const matchedField = RNE_FIELDS.find((f) => data.rne_name.includes(f));
      if (matchedField) setRneField(matchedField);
    } else if (data.rne_name && data.rne_name.includes("[")) {
      setRneDecided(false);
      const field = data.rne_name.match(/\[(.+?)\]/)?.[1];
      if (field) setRneField(field);
    }
  }

  function handleQrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // 캔버스로 이미지 리사이즈 (최대 800x800)
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxSize = 800;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
          setDormQrImage(dataUrl);
          localStorage.setItem("dorm_qr_image", dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function handleQrDelete() {
    setDormQrImage("");
    localStorage.removeItem("dorm_qr_image");
    setShowQrModal(false);
  }

  async function handleSave() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { error: upsertError } = await supabase.from("profiles").upsert({
      id: user.id,
      name,
      grade: Number(grade),
      class_num: Number(classNum),
      rne_name: rneDecided ? rneName : (rneField ? `[${rneField} 분야 검토 중]` : ""),
      rne_teacher: rneTeacher,
      rne_partners: rnePartners,
      club_name: clubName,
      club_day: clubName ? "수" : "",
      club_time: clubName ? "16:00" : "",
      club_place: clubPlace,
      after_name: afterName,
      after_day: afterDay,
      after_time: JSON.stringify(afterTimes),
    });

    if (upsertError) {
      alert("저장에 실패했어요: " + upsertError.message);
      setLoading(false);
      return;
    }

    setProfile({
      name,
      grade: Number(grade),
      class_num: Number(classNum),
      rne_name: rneDecided ? rneName : (rneField ? `[${rneField} 분야 검토 중]` : ""),
      rne_teacher: rneTeacher,
      rne_partners: rnePartners,
      club_name: clubName,
      club_day: clubName ? "수" : "",
      club_time: clubName ? "16:00" : "",
      club_place: clubPlace,
      after_name: afterName,
      after_day: afterDay,
      after_time: JSON.stringify(afterTimes),
    });
    setIsEditing(false);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500">프로필을 불러올 수 없어요</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-blue-600 text-white px-4 pt-10 pb-6 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (isEditing) {
                // 편집 상태 해제 및 원래 값으로 복원
                setProfile(profile);
                setName(profile.name);
                setGrade(String(profile.grade));
                setClassNum(String(profile.class_num));
                setRneName(profile.rne_name);
                setRneTeacher(profile.rne_teacher);
                setRnePartners(profile.rne_partners);
                setClubName(profile.club_name);
                setClubPlace(profile.club_place);
                setAfterName(profile.after_name);
                setAfterDay(profile.after_day);
                setAfterTimes(profile.after_time ? JSON.parse(profile.after_time) : []);
                setIsEditing(false);
              } else {
                router.back();
              }
            }}
            className="text-2xl"
            title={isEditing ? "취소" : "뒤로가기"}
          >
            {isEditing ? "✕" : "‹"}
          </button>
          <h1 className="text-xl font-bold">내 프로필</h1>
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 pb-10 overflow-y-auto">
        {/* 기본정보 카드 */}
        <Section title="기본정보">
          {!isEditing ? (
            <div className="space-y-3">
              <InfoRow label="이름" value={profile.name} />
              <InfoRow label="학년" value={`${profile.grade}학년`} />
              <InfoRow label="반" value={`${profile.class_num}반`} />
            </div>
          ) : (
            <div className="space-y-3">
              <Field label="이름">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  className={inputClass}
                />
              </Field>
              <div className="flex gap-3">
                <Field label="학년" className="flex-1">
                  <select value={grade} onChange={(e) => setGrade(e.target.value)} className={inputClass}>
                    <option value="">선택</option>
                    <option value="1">1학년</option>
                    <option value="2">2학년</option>
                    <option value="3">3학년</option>
                  </select>
                </Field>
                <Field label="반" className="flex-1">
                  <select value={classNum} onChange={(e) => setClassNum(e.target.value)} className={inputClass}>
                    <option value="">선택</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}반
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          )}
        </Section>

        {/* 기숙사QR 카드 */}
        <Section title="기숙사QR">
          <div className="space-y-3">
            {dormQrImage ? (
              <>
                <button
                  onClick={() => setShowQrModal(true)}
                  className="w-full aspect-square rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center border-2 border-blue-200 hover:border-blue-400 transition-colors"
                >
                  <img src={dormQrImage} alt="기숙사QR" className="w-full h-full object-cover" />
                </button>
                <div className="flex gap-2">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQrUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.currentTarget.parentElement?.querySelector("input")?.click();
                      }}
                      className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold border border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      변경
                    </button>
                  </label>
                  <button
                    onClick={handleQrDelete}
                    className="flex-1 px-4 py-2 bg-red-50 text-red-700 rounded-xl text-sm font-semibold border border-red-200 hover:bg-red-100 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </>
            ) : (
              <label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.parentElement?.querySelector("input")?.click();
                  }}
                  className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <span className="text-3xl">📸</span>
                  <span className="text-sm font-medium text-gray-600">사진 업로드</span>
                </button>
              </label>
            )}
          </div>
        </Section>

        {/* R&E 카드 */}
        <Section title="R&E">
          {!isEditing ? (
            <div className="space-y-2 text-sm">
              <InfoRow label="상태" value={profile.rne_name || "미설정"} />
              {profile.rne_name && !profile.rne_name.includes("[") && (
                <>
                  <InfoRow label="주제" value={profile.rne_name} />
                  <InfoRow label="지도교사" value={profile.rne_teacher || "-"} />
                  <InfoRow label="팀원" value={profile.rne_partners || "-"} />
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">R&E가 결정됐나요?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setRneDecided(true)}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    rneDecided === true ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"
                  }`}
                >
                  결정됐어요
                </button>
                <button
                  onClick={() => setRneDecided(false)}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    rneDecided === false ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"
                  }`}
                >
                  아직 미결정
                </button>
              </div>

              {rneDecided === false && (
                <>
                  <p className="text-sm text-gray-500 -mb-1">관심 분야를 선택해요</p>
                  <div className="flex flex-wrap gap-2">
                    {RNE_FIELDS.map((f) => (
                      <button
                        key={f}
                        onClick={() => setRneField(f)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors ${
                          rneField === f ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {rneDecided === true && (
                <>
                  <p className="text-sm text-gray-500 -mb-1">분야 선택</p>
                  <div className="flex flex-wrap gap-2">
                    {RNE_FIELDS.map((f) => (
                      <button
                        key={f}
                        onClick={() => setRneField(f)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors ${
                          rneField === f ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <Field label="R&E 주제">
                    <input
                      value={rneName}
                      onChange={(e) => setRneName(e.target.value)}
                      placeholder="예: 양자컴퓨팅 기초 연구"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="지도 선생님">
                    <input
                      value={rneTeacher}
                      onChange={(e) => setRneTeacher(e.target.value)}
                      placeholder="예: 김철수 선생님"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="같이 하는 친구들">
                    <input
                      value={rnePartners}
                      onChange={(e) => setRnePartners(e.target.value)}
                      placeholder="예: 이영희, 박민준"
                      className={inputClass}
                    />
                  </Field>
                </>
              )}
            </div>
          )}
        </Section>

        {/* 동아리 카드 */}
        <Section title="동아리">
          {!isEditing ? (
            <div className="space-y-2 text-sm">
              <InfoRow label="동아리" value={profile.club_name || "미참여"} />
              {profile.club_name && (
                <>
                  <InfoRow label="요일" value="매주 수요일" />
                  <InfoRow label="시간" value="7교시 (16:00 ~ 16:50)" />
                  <InfoRow label="장소" value={profile.club_place || "-"} />
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">본인의 동아리를 선택해요</p>
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {CLUBS.map((club) => (
                  <button
                    key={club.name}
                    onClick={() => setClubName(clubName === club.name ? "" : club.name)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-colors ${
                      clubName === club.name ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"
                    }`}
                  >
                    <div>
                      <span className={`font-semibold text-sm ${clubName === club.name ? "text-blue-700" : "text-gray-800"}`}>
                        {club.name}
                      </span>
                      <span className={`text-xs ml-2 ${clubName === club.name ? "text-blue-500" : "text-gray-400"}`}>
                        {club.desc}
                      </span>
                    </div>
                    {clubName === club.name && <span className="text-blue-600 text-lg">✓</span>}
                  </button>
                ))}
              </div>
              {clubName && (
                <>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
                    📅 동아리 활동은 <strong>매주 수요일 7교시 (16:00 ~ 16:50)</strong> 고정이에요
                  </div>
                  <Field label="활동 장소">
                    <input
                      value={clubPlace}
                      onChange={(e) => setClubPlace(e.target.value)}
                      placeholder="예: 과학관 3층"
                      className={inputClass}
                    />
                  </Field>
                </>
              )}
            </div>
          )}
        </Section>

        {/* 방과후 카드 */}
        <Section title="방과후">
          {!isEditing ? (
            <div className="space-y-2 text-sm">
              <InfoRow label="활동" value={profile.after_name || "미참여"} />
              {profile.after_name && (
                <>
                  <InfoRow label="요일" value={profile.after_day ? `매주 ${profile.after_day}요일` : "-"} />
                  {profile.after_time && (
                    <InfoRow
                      label="시간"
                      value={(() => {
                        try {
                          const times = JSON.parse(profile.after_time);
                          return times.join(", ");
                        } catch {
                          return "-";
                        }
                      })()}
                    />
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">없으면 비워두고 저장해도 돼요</p>
              <Field label="방과후 활동 이름">
                <input
                  value={afterName}
                  onChange={(e) => setAfterName(e.target.value)}
                  placeholder="예: 수학 심화"
                  className={inputClass}
                />
              </Field>
              {afterName && (
                <>
                  <Field label="요일">
                    <div className="flex gap-2 flex-wrap">
                      {["월", "화", "수", "목", "금"].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setAfterDay(d)}
                          className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors ${
                            afterDay === d ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"
                          }`}
                        >
                          {d}요일
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="시간 (중복 선택 가능)">
                    <p className="text-xs text-gray-400 mb-2">방과후가 있는 교시를 모두 선택해요</p>
                    <div className="flex flex-col gap-2">
                      {AFTER_SCHOOL_PERIODS.map((p) => {
                        const selected = afterTimes.includes(p.period);
                        return (
                          <button
                            key={p.period}
                            type="button"
                            onClick={() =>
                              setAfterTimes(
                                selected ? afterTimes.filter((t) => t !== p.period) : [...afterTimes, p.period]
                              )
                            }
                            className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-colors ${
                              selected ? "border-blue-600 bg-blue-50" : "border-gray-200"
                            }`}
                          >
                            <span className={`text-sm font-semibold ${selected ? "text-blue-700" : "text-gray-700"}`}>
                              {p.period}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">
                                {p.startTime} ~ {p.endTime}
                              </span>
                              {selected && <span className="text-blue-600">✓</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                </>
              )}
            </div>
          )}
        </Section>

        {/* 로그아웃 */}
        <div className="mt-6">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold hover:bg-red-100 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 하단 버튼 */}
      {!isEditing && (
        <div className="px-4 pb-6 pt-4 border-t border-gray-200 bg-white sticky bottom-0">
          <button
            onClick={() => setIsEditing(true)}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
          >
            ✎ 수정하기
          </button>
        </div>
      )}

      {isEditing && (
        <div className="px-4 pb-6 pt-4 border-t border-gray-200 bg-white sticky bottom-0 flex gap-2">
          <button
            onClick={() => {
              setProfile(profile);
              setName(profile.name);
              setGrade(String(profile.grade));
              setClassNum(String(profile.class_num));
              setRneName(profile.rne_name);
              setRneTeacher(profile.rne_teacher);
              setRnePartners(profile.rne_partners);
              setClubName(profile.club_name);
              setClubPlace(profile.club_place);
              setAfterName(profile.after_name);
              setAfterDay(profile.after_day);
              setAfterTimes(profile.after_time ? JSON.parse(profile.after_time) : []);
              setIsEditing(false);
            }}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {loading ? "저장 중..." : "저장"}
          </button>
        </div>
      )}

      {/* 기숙사QR 풀스크린 모달 */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4">
          <button
            onClick={() => setShowQrModal(false)}
            className="absolute top-4 right-4 text-white text-3xl font-bold hover:opacity-70 transition-opacity"
          >
            ✕
          </button>

          <div className="flex-1 flex items-center justify-center">
            {dormQrImage && (
              <img
                src={dormQrImage}
                alt="기숙사QR"
                className="max-w-96 max-h-96 object-contain rounded-xl"
              />
            )}
          </div>

          <div className="w-full flex gap-2 pb-4">
            <label className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  handleQrUpload(e);
                  setShowQrModal(false);
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={(el) => {
                  el.currentTarget.parentElement?.querySelector("input")?.click();
                }}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                변경
              </button>
            </label>
            <button
              onClick={() => {
                handleQrDelete();
              }}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
            >
              삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 bg-white";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-gray-800 mb-3">{title}</h2>
      <div className="bg-white rounded-2xl border border-gray-100 p-4">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-gray-600 font-medium">{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
      {children}
    </div>
  );
}
