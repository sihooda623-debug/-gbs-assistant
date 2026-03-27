"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ANON_ROOM_ID = "00000000-0000-0000-0000-000000000001";

type Message = {
  id: string;
  room_id: string;
  user_id: string | null;
  content: string | null;
  image_url: string | null;
  is_anonymous: boolean;
  created_at: string;
  sender_name?: string;
};

type Room = {
  id: string;
  type: string;
  name: string;
};

export default function RoomPage() {
  const params = useParams();
  const roomId = typeof params?.roomId === 'string' ? params.roomId : null;
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [isAnon, setIsAnon] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 초기 로드 및 인증
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);

      if (!roomId) return;

      // 방 정보
      const { data: roomData } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (!roomData) {
        router.replace("/chat");
        return;
      }
      setRoom(roomData as Room);

      // 동아리/R&E방 멤버 확인
      if (roomData.type !== "anonymous") {
        const { data: member } = await supabase
          .from("chat_members")
          .select("status")
          .eq("room_id", roomId)
          .eq("user_id", user.id)
          .single();
        if (!member || member.status !== "accepted") {
          router.replace("/chat");
          return;
        }
      }

      // 초기 메시지 로드
      await loadMessages();
    };

    init();
  }, [roomId, router]);

  // 메시지 로드
  const loadMessages = async () => {
    if (!roomId) return;

    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (!data) return;

    // 발신자 이름 조회
    const userIds = [...new Set(data.filter(m => !m.is_anonymous && m.user_id).map(m => m.user_id))];
    let nameMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", userIds);
      if (profiles) {
        profiles.forEach((p: any) => {
          nameMap[p.id] = p.name;
        });
      }
    }

    const messagesWithNames = data.map(m => ({
      ...m,
      sender_name: m.is_anonymous ? "익명" : (nameMap[m.user_id] || "알 수 없음"),
    }));

    setMessages(messagesWithNames);
  };

  // 실시간 구독 + 폴링
  useEffect(() => {
    if (!userId || !roomId) return;

    let pollInterval: NodeJS.Timeout;
    let channel: any;

    const setupRealtime = async () => {
      // 폴링: 3초마다 최신 메시지 확인
      pollInterval = setInterval(async () => {
        const { data } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: true });

        if (!data) return;

        // 발신자 이름 조회
        const userIds = [...new Set(data.filter(m => !m.is_anonymous && m.user_id).map(m => m.user_id))];
        let nameMap: Record<string, string> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", userIds);
          if (profiles) {
            profiles.forEach((p: any) => {
              nameMap[p.id] = p.name;
            });
          }
        }

        const newMessages = data.map(m => ({
          ...m,
          sender_name: m.is_anonymous ? "익명" : (nameMap[m.user_id] || "알 수 없음"),
        }));

        setMessages(newMessages);
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
      }, 2000);

      // Realtime 구독 (추가 시도)
      try {
        channel = supabase
          .channel(`room:${roomId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "chat_messages",
              filter: `room_id=eq.${roomId}`,
            },
            async (payload) => {
              await loadMessages();
              setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            }
          )
          .subscribe();
      } catch (err) {
        console.error("Realtime 구독 실패:", err);
      }
    };

    setupRealtime();

    return () => {
      clearInterval(pollInterval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, roomId]);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSend() {
    if ((!text.trim() && !imageFile) || !userId || sending) return;
    setSending(true);

    const contentText = text.trim();
    let imageUrl: string | null = null;

    // 낙관적 업데이트
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      room_id: roomId!,
      user_id: userId,
      content: contentText || null,
      image_url: imageFile ? URL.createObjectURL(imageFile) : null,
      is_anonymous: room?.type === "anonymous" ? isAnon : false,
      created_at: new Date().toISOString(),
      sender_name: null,
    };
    setMessages(prev => [...prev, tempMsg]);

    setText("");
    setImageFile(null);
    setImagePreview(null);

    // 이미지 업로드
    if (imageFile) {
      setUploading(true);
      const ext = imageFile.name.split(".").pop();
      const path = `chat/${roomId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("chat-images").upload(path, imageFile, { upsert: false });
      if (!error) {
        const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
      setUploading(false);
    }

    // DB 저장
    const { error: msgError } = await supabase.from("chat_messages").insert({
      room_id: roomId,
      user_id: userId,
      content: contentText || null,
      image_url: imageUrl,
      is_anonymous: room?.type === "anonymous" ? isAnon : false,
    });

    if (msgError) {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      alert("전송 실패: " + msgError.message);
    }

    setSending(false);
  }

  const isMyMsg = (msg: Message) => msg.user_id === userId;

  function formatTime(ts: string) {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  const ROOM_ACCENT: Record<string, { bg: string; text: string }> = {
    anonymous: { bg: "#2563eb", text: "white" },
    club: { bg: "#16a34a", text: "white" },
    rne: { bg: "#7c3aed", text: "white" },
  };
  const accent = ROOM_ACCENT[room?.type ?? "anonymous"];

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 pt-10 pb-3 bg-white border-b border-gray-100 shrink-0">
        <button onClick={() => router.back()} className="text-gray-400 text-xl p-1">‹</button>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
          style={{ background: accent?.bg }}
        >
          {room?.type === "anonymous" ? "💬" : room?.type === "club" ? "🎯" : "🔬"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{room?.name ?? "채팅방"}</p>
          {room?.type === "anonymous" && (
            <p className="text-xs text-gray-400">익명으로 질문하세요</p>
          )}
        </div>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 text-gray-400">
            <span className="text-4xl">💬</span>
            <p className="text-sm">첫 메시지를 보내보세요!</p>
          </div>
        )}
        {messages.map((msg) => {
          const mine = isMyMsg(msg);
          return (
            <div key={msg.id} className="flex flex-col gap-1">
              {!mine && <p className="text-xs text-gray-400 px-2">{msg.sender_name}</p>}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  mine
                    ? "bg-blue-600 text-white rounded-tr-sm self-end"
                    : "bg-white text-gray-900 rounded-tl-sm border border-gray-100 self-start"
                }`}
              >
                {msg.image_url && (
                  <div className="mb-1.5 rounded-xl overflow-hidden">
                    <img src={msg.image_url} alt="첨부 이미지" className="w-full max-w-[240px] rounded-xl" />
                  </div>
                )}
                {msg.content && <p className="text-sm leading-relaxed">{msg.content}</p>}
              </div>
              <p className="text-xs text-gray-400 px-2">{formatTime(msg.created_at)}</p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 pb-safe shrink-0">
        {imagePreview && (
          <div className="relative w-20 h-20 mb-2">
            <img src={imagePreview} alt="미리보기" className="w-20 h-20 object-cover rounded-xl" />
            <button
              onClick={() => {
                setImageFile(null);
                setImagePreview(null);
              }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full text-xs flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        )}

        {room?.type === "anonymous" && (
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <button
              onClick={() => setIsAnon(v => !v)}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                isAnon ? "bg-gray-200 text-gray-700" : "bg-blue-100 text-blue-700"
              }`}
            >
              {isAnon ? "익명" : "실명"}
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="메시지를 입력하세요..."
            rows={1}
            className="flex-1 resize-none bg-gray-100 rounded-2xl px-4 py-2.5 text-sm outline-none max-h-32 leading-relaxed"
          />
          <button
            onClick={handleSend}
            disabled={(!text.trim() && !imageFile) || sending || uploading}
            className="w-9 h-9 bg-blue-600 disabled:bg-gray-200 rounded-xl flex items-center justify-center shrink-0 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-4 h-4">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 19V5m0 0l-7 7m7-7l7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
