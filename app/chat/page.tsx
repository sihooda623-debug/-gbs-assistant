"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ANON_ROOM_ID = "00000000-0000-0000-0000-000000000001";

type Room = {
  id: string;
  type: string;
  name: string;
  group_key: string | null;
  created_at: string;
};

type Invite = {
  id: string;
  room_id: string;
  status: string;
  created_at: string;
  chat_rooms: Room;
};

type Profile = {
  name: string;
  club_name: string;
  rne_name: string;
};

export default function ChatPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [creating, setCreating] = useState(false);
  const [createType, setCreateType] = useState<"club" | "rne" | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);
      supabase.from("profiles").select("name, club_name, rne_name")
        .eq("id", user.id).single()
        .then(({ data }) => { if (data) setProfile(data as Profile); });
      loadRooms(user.id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadRooms(uid: string) {
    // 수락된 채팅방
    const { data: members } = await supabase
      .from("chat_members")
      .select("room_id, chat_rooms(*)")
      .eq("user_id", uid)
      .eq("status", "accepted");
    if (members) setMyRooms(members.map((m: any) => m.chat_rooms));

    // 대기 중인 초대
    const { data: invites } = await supabase
      .from("chat_members")
      .select("id, room_id, status, created_at, chat_rooms(*)")
      .eq("user_id", uid)
      .eq("status", "pending");
    if (invites) setPendingInvites(invites as unknown as Invite[]);
  }

  async function handleInvite(memberId: string, accept: boolean) {
    await supabase.from("chat_members")
      .update({ status: accept ? "accepted" : "rejected" })
      .eq("id", memberId);
    if (userId) loadRooms(userId);
  }

  async function createRoom(type: "club" | "rne") {
    if (!userId || !profile) return;
    const groupKey = type === "club" ? profile.club_name : profile.rne_name;
    if (!groupKey) {
      alert(type === "club" ? "동아리 정보가 없습니다." : "R&E 정보가 없습니다.");
      return;
    }

    setCreating(true);

    // 같은 그룹의 방이 이미 있는지 확인
    const { data: existingRoom } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("group_key", groupKey)
      .eq("type", type)
      .single();

    if (existingRoom) {
      setCreating(false);
      alert(type === "club" ? "이미 이 동아리의 방이 있습니다. 초대 대기를 확인하세요." : "이미 이 R&E의 방이 있습니다. 초대 대기를 확인하세요.");
      return;
    }

    // 같은 그룹 키를 가진 유저 찾기
    const field = type === "club" ? "club_name" : "rne_name";
    const { data: peers } = await supabase
      .from("profiles")
      .select("id, name")
      .eq(field, groupKey)
      .neq("id", userId);

    // 방 생성
    const roomName = type === "club" ? `${groupKey} 동아리방` : `${groupKey} R&E방`;
    const { data: room, error } = await supabase
      .from("chat_rooms")
      .insert({ type, name: roomName, created_by: userId, group_key: groupKey })
      .select().single();

    if (error || !room) { setCreating(false); alert("방 생성 실패"); return; }

    // 본인 수락 상태로 추가
    await supabase.from("chat_members").insert({ room_id: room.id, user_id: userId, status: "accepted", invited_by: userId });

    // 같은 그룹 멤버들에게 초대 (pending)
    if (peers && peers.length > 0) {
      await supabase.from("chat_members").insert(
        peers.map((p: any) => ({ room_id: room.id, user_id: p.id, status: "pending", invited_by: userId }))
      );
    }

    setCreating(false);
    setCreateType(null);
    router.push(`/chat/${room.id}`);
  }

  const TYPE_INFO: Record<string, { emoji: string; color: string; bg: string }> = {
    anonymous: { emoji: "💬", color: "text-primary-700", bg: "bg-primary-50" },
    club:      { emoji: "🎯", color: "text-success-700", bg: "bg-success-50" },
    rne:       { emoji: "🔬", color: "text-purple-700", bg: "bg-purple-50" },
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
      {/* 헤더 */}
      <div className="bg-white px-4 pt-10 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">채팅</h1>
        <p className="text-sm text-gray-400 mt-0.5">질문방·동아리방·R&E방</p>
      </div>

      {/* 대기 중인 초대 */}
      {pendingInvites.length > 0 && (
        <div className="mx-4 mt-4">
          <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">초대 대기</p>
          <div className="flex flex-col gap-2">
            {pendingInvites.map((inv) => {
              const info = TYPE_INFO[inv.chat_rooms.type] ?? TYPE_INFO.anonymous;
              return (
                <div key={inv.id} className={`${info.bg} rounded-2xl px-4 py-3 flex items-center gap-3`}>
                  <span className="text-2xl">{info.emoji}</span>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${info.color}`}>{inv.chat_rooms.name}</p>
                    <p className="text-xs text-gray-400">초대 받았습니다</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleInvite(inv.id, true)}
                      className="text-xs bg-primary-600 text-white px-3 py-1.5 rounded-lg font-semibold"
                    >수락</button>
                    <button
                      onClick={() => handleInvite(inv.id, false)}
                      className="text-xs bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg font-semibold"
                    >거절</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 익명 질문방 */}
      <div className="mx-4 mt-4">
        <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">전체 공개</p>
        <Link href={`/chat/${ANON_ROOM_ID}`}>
          <div className="bg-white rounded-2xl px-4 py-4 flex items-center gap-3 border border-gray-100 active:bg-gray-50">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center text-2xl shrink-0">💬</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">익명 질문방</p>
              <p className="text-xs text-gray-400 mt-0.5">사진과 함께 익명으로 질문하세요</p>
            </div>
            <span className="text-gray-300 text-lg">›</span>
          </div>
        </Link>
      </div>

      {/* 내 채팅방 */}
      {myRooms.length > 0 && (
        <div className="mx-4 mt-4">
          <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">내 채팅방</p>
          <div className="flex flex-col gap-2">
            {myRooms.map((room) => {
              const info = TYPE_INFO[room.type] ?? TYPE_INFO.anonymous;
              return (
                <Link key={room.id} href={`/chat/${room.id}`}>
                  <div className="bg-white rounded-2xl px-4 py-4 flex items-center gap-3 border border-gray-100 active:bg-gray-50">
                    <div className={`w-12 h-12 ${info.bg} rounded-2xl flex items-center justify-center text-2xl shrink-0`}>{info.emoji}</div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{room.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{room.type === "club" ? "동아리방" : "R&E방"}</p>
                    </div>
                    <span className="text-gray-300 text-lg">›</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 방 만들기 */}
      {profile && (
        <div className="mx-4 mt-4">
          <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">방 만들기</p>
          <div className="flex flex-col gap-2">
            {profile.club_name && (
              <button
                onClick={() => setCreateType("club")}
                className="bg-white rounded-2xl px-4 py-4 flex items-center gap-3 border border-dashed border-success-300 active:bg-success-50 text-left"
              >
                <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center text-2xl shrink-0">🎯</div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-success-700">{profile.club_name} 동아리방 만들기</p>
                  <p className="text-xs text-gray-400 mt-0.5">같은 동아리 멤버에게 초대 전송</p>
                </div>
                <span className="text-success-400 text-lg">+</span>
              </button>
            )}
            {profile.rne_name && (
              <button
                onClick={() => setCreateType("rne")}
                className="bg-white rounded-2xl px-4 py-4 flex items-center gap-3 border border-dashed border-purple-300 active:bg-purple-50 text-left"
              >
                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-2xl shrink-0">🔬</div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-purple-700">{profile.rne_name} R&E방 만들기</p>
                  <p className="text-xs text-gray-400 mt-0.5">같은 R&E 팀원에게 초대 전송</p>
                </div>
                <span className="text-purple-400 text-lg">+</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 방 만들기 확인 모달 */}
      {createType && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setCreateType(null)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md px-6 py-8 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-bold text-gray-900 text-center">
              {createType === "club" ? `${profile?.club_name} 동아리방` : `${profile?.rne_name} R&E방`}을 만들까요?
            </p>
            <p className="text-sm text-gray-500 text-center">
              같은 {createType === "club" ? "동아리" : "R&E"} 멤버들에게 초대가 전송됩니다.
            </p>
            <button
              onClick={() => createRoom(createType)}
              disabled={creating}
              className="w-full py-3.5 bg-primary-600 text-white font-bold rounded-2xl disabled:opacity-50"
            >
              {creating ? "만드는 중..." : "방 만들기"}
            </button>
            <button onClick={() => setCreateType(null)} className="w-full py-3 text-gray-500 font-medium">취소</button>
          </div>
        </div>
      )}
    </div>
  );
}
