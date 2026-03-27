"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Report = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  message_content: string;
  reason: string;
  status: string;
  created_at: string;
  reported_profile?: { name: string };
};

type Ban = {
  id: string;
  user_id: string;
  reason: string;
  ban_until: string;
  profile?: { name: string };
};

export default function AdminPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [bans, setBans] = useState<Ban[]>([]);
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [banDays, setBanDays] = useState(7);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);

      // 관리자 권한 확인
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) {
        router.replace("/chat");
        return;
      }
      setIsAdmin(true);

      // 신고 목록 로드
      const { data: reportList } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (reportList) {
        // 신고당한 사람 정보 조회
        const reportedUserIds = [...new Set(reportList.map(r => r.reported_user_id))];
        let profileMap: Record<string, { name: string }> = {};

        if (reportedUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, name")
            .in("id", reportedUserIds);

          if (profiles) {
            profiles.forEach((p: any) => {
              profileMap[p.id] = { name: p.name };
            });
          }
        }

        setReports(
          reportList.map((r: any) => ({
            ...r,
            reported_profile: profileMap[r.reported_user_id] || { name: "알 수 없음" },
          }))
        );
      }

      // 정지 목록 로드
      const { data: banList } = await supabase
        .from("chat_bans")
        .select("*")
        .gt("ban_until", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (banList) {
        const bannedUserIds = [...new Set(banList.map(b => b.user_id))];
        let profileMap: Record<string, { name: string }> = {};

        if (bannedUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, name")
            .in("id", bannedUserIds);

          if (profiles) {
            profiles.forEach((p: any) => {
              profileMap[p.id] = { name: p.name };
            });
          }
        }

        setBans(
          banList.map((b: any) => ({
            ...b,
            profile: profileMap[b.user_id] || { name: "알 수 없음" },
          }))
        );
      }
    };

    init();
  }, [router]);

  async function handleBan(report: Report, days: number) {
    if (!userId) return;

    const banUntil = new Date();
    banUntil.setDate(banUntil.getDate() + days);

    const { error: banError } = await supabase.from("chat_bans").insert({
      user_id: report.reported_user_id,
      banned_by: userId,
      reason: report.reason,
      ban_until: banUntil.toISOString(),
    });

    if (banError) {
      alert("정지 처리 실패: " + banError.message);
      return;
    }

    // 신고 상태 업데이트
    await supabase
      .from("reports")
      .update({ status: "resolved" })
      .eq("id", report.id);

    // UI 업데이트
    setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: "resolved" } : r));

    // 정지 목록에 추가
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", report.reported_user_id)
      .single();

    setBans(prev => [{
      id: "new-" + Date.now(),
      user_id: report.reported_user_id,
      reason: report.reason,
      ban_until: banUntil.toISOString(),
      profile: profile || { name: "알 수 없음" },
    }, ...prev]);

    setShowBanModal(false);
    setSelectedReport(null);
    setBanDays(7);
    alert("정지 처리가 완료되었습니다.");
  }

  async function handleUnban(ban: Ban) {
    const { error } = await supabase.from("chat_bans").delete().eq("id", ban.id);

    if (error) {
      alert("정지 해제 실패: " + error.message);
      return;
    }

    setBans(prev => prev.filter(b => b.id !== ban.id));
    alert("정지가 해제되었습니다.");
  }

  function formatDate(ts: string) {
    const d = new Date(ts);
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">접근 권한이 없습니다.</p>
          <button onClick={() => router.back()} className="text-blue-600 font-semibold">
            뒤로가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-red-600 text-white px-4 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="text-xl">‹</button>
          <h1 className="text-2xl font-bold">관리자 패널</h1>
        </div>
        <p className="text-red-100 text-sm">신고 관리 및 사용자 정지</p>
      </div>

      <div className="flex-1 px-4 py-4 overflow-y-auto pb-10">
        {/* 신고 목록 */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">신고 목록</h2>

          {reports.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-500">
              <p className="text-sm">신고가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className={`bg-white rounded-2xl p-4 border-l-4 ${
                    report.status === "resolved" ? "border-gray-300 opacity-60" : "border-red-500"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{report.reported_profile?.name || "알 수 없음"}</p>
                      <p className="text-xs text-gray-500 mt-0.5">사유: {report.reason}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      report.status === "resolved"
                        ? "bg-gray-100 text-gray-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {report.status === "resolved" ? "처리됨" : "대기중"}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2 mb-3 line-clamp-2">
                    "{report.message_content}"
                  </p>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatDate(report.created_at)}</span>
                    {report.status !== "resolved" && (
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setShowBanModal(true);
                        }}
                        className="text-red-600 font-semibold hover:underline"
                      >
                        정지 처리
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 정지 목록 */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">정지된 사용자</h2>

          {bans.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-500">
              <p className="text-sm">정지된 사용자가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bans.map((ban) => {
                const daysLeft = Math.ceil((new Date(ban.ban_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={ban.id} className="bg-white rounded-2xl p-4 border-l-4 border-orange-500">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">{ban.profile?.name || "알 수 없음"}</p>
                        <p className="text-xs text-gray-500 mt-0.5">사유: {ban.reason}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full font-semibold bg-orange-100 text-orange-700">
                        {daysLeft}일 남음
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>정지 만료: {formatDate(ban.ban_until)}</span>
                      <button
                        onClick={() => handleUnban(ban)}
                        className="text-blue-600 font-semibold hover:underline"
                      >
                        해제
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 정지 모달 */}
      {showBanModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white w-full rounded-t-3xl px-6 py-8 flex flex-col gap-4 max-w-md">
            <h2 className="text-lg font-bold text-gray-900">정지 처리</h2>

            <div className="bg-red-50 rounded-xl p-3 border border-red-200">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">{selectedReport.reported_profile?.name || "알 수 없음"}</span>을(를) 정지합니다.
              </p>
              <p className="text-xs text-gray-500 mt-1">사유: {selectedReport.reason}</p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">정지 기간 (일)</label>
              <input
                type="number"
                value={banDays}
                onChange={(e) => setBanDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                만료: {new Date(Date.now() + banDays * 24 * 60 * 60 * 1000).toLocaleDateString("ko-KR")}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setSelectedReport(null);
                }}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-2xl font-semibold text-sm"
              >
                취소
              </button>
              <button
                onClick={() => handleBan(selectedReport, banDays)}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-2xl font-semibold text-sm"
              >
                정지 처리
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
