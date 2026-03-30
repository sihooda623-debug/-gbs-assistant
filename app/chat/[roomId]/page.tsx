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
  created_by?: string;
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
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [messageType, setMessageType] = useState<"message" | "question" | "answer">("message");
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [questions, setQuestions] = useState<Array<{ id: string; content: string; sender_name: string }>>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingMsg, setReportingMsg] = useState<Message | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [banInfo, setBanInfo] = useState<{ ban_until: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

      // 정지 상태 확인
      const { data: ban } = await supabase
        .from("chat_bans")
        .select("ban_until")
        .eq("user_id", user.id)
        .gt("ban_until", new Date().toISOString())
        .single();

      if (ban) {
        setBanInfo(ban);
      }

      // 입장 모달 표시 (같은 세션 내 1회만)
      if (typeof window !== "undefined") {
        const shown = sessionStorage.getItem(`guide_shown_${roomId}`);
        if (!shown) {
          setShowGuideModal(true);
          sessionStorage.setItem(`guide_shown_${roomId}`, "true");
        }
      }
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

    // 발신자 이름 + 익명 번호 조회
    const userIds = [...new Set(data.filter(m => m.user_id).map(m => m.user_id))];
    let nameMap: Record<string, string> = {};
    let anonMap: Record<string, number> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", userIds);
      if (profiles) {
        profiles.forEach((p: any) => {
          nameMap[p.id] = p.name;
        });
      }

      // 오늘 익명 번호 조회
      const today = new Date().toISOString().split("T")[0];
      const { data: anonIds } = await supabase
        .from("anon_daily_ids")
        .select("user_id, anon_number")
        .eq("date", today)
        .in("user_id", userIds);

      if (anonIds) {
        anonIds.forEach((a: any) => {
          anonMap[a.user_id] = a.anon_number;
        });
      }
    }

    const messagesWithNames = data.map(m => ({
      ...m,
      sender_name: m.is_anonymous ? `익명${anonMap[m.user_id] || ""}` : (nameMap[m.user_id] || "알 수 없음"),
    }));

    setMessages(messagesWithNames);

    // 가장 아래로 스크롤
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // 질문 목록 로드
  useEffect(() => {
    if (!showAnswerModal || !roomId) return;

    const loadQuestions = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });

      if (!data) return;

      // content가 "[Q] "로 시작하는 질문만 필터링
      const questionData = data.filter(m => m.content?.startsWith("[Q] "));

      // 발신자 이름 + 익명 번호 조회
      const userIds = [...new Set(questionData.map(m => m.user_id).filter(Boolean))];
      let nameMap: Record<string, string> = {};
      let anonMap: Record<string, number> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", userIds);
        if (profiles) {
          profiles.forEach((p: any) => {
            nameMap[p.id] = p.name;
          });
        }

        const today = new Date().toISOString().split("T")[0];
        const { data: anonIds } = await supabase
          .from("anon_daily_ids")
          .select("user_id, anon_number")
          .eq("date", today)
          .in("user_id", userIds);

        if (anonIds) {
          anonIds.forEach((a: any) => {
            anonMap[a.user_id] = a.anon_number;
          });
        }
      }

      const questions = questionData.map(m => ({
        id: m.id,
        content: (m.content?.substring(4) || "(이미지 질문)"),
        sender_name: m.is_anonymous ? `익명${anonMap[m.user_id] || ""}` : (nameMap[m.user_id] || "알 수 없음"),
      }));

      setQuestions(questions);
    };

    loadQuestions();
  }, [showAnswerModal, roomId]);

  // 실시간 구독 + 폴링
  useEffect(() => {
    if (!userId || !roomId) return;

    let pollInterval: NodeJS.Timeout;
    let channel: any;
    let lastMessageTime = new Date().toISOString();

    const fetchNewMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", roomId)
        .gt("created_at", lastMessageTime)
        .order("created_at", { ascending: true });

      if (!data || data.length === 0) return;

      lastMessageTime = data[data.length - 1].created_at;

      // 발신자 이름 + 익명 번호 조회
      const userIds = [...new Set(data.filter(m => m.user_id).map(m => m.user_id))];
      let nameMap: Record<string, string> = {};
      let anonMap: Record<string, number> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", userIds);
        if (profiles) {
          profiles.forEach((p: any) => {
            nameMap[p.id] = p.name;
          });
        }

        const today = new Date().toISOString().split("T")[0];
        const { data: anonIds } = await supabase
          .from("anon_daily_ids")
          .select("user_id, anon_number")
          .eq("date", today)
          .in("user_id", userIds);

        if (anonIds) {
          anonIds.forEach((a: any) => {
            anonMap[a.user_id] = a.anon_number;
          });
        }
      }

      const newMessages = data.map(m => ({
        ...m,
        sender_name: m.is_anonymous ? `익명${anonMap[m.user_id] || ""}` : (nameMap[m.user_id] || "알 수 없음"),
      }));

      setMessages(prev => {
        // 중복 제거
        const ids = new Set(prev.map(m => m.id));
        const filtered = newMessages.filter(m => !ids.has(m.id));
        if (filtered.length === 0) return prev;
        return [...prev, ...filtered];
      });

      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    };

    const setupRealtime = async () => {
      // Realtime 구독 (우선)
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
              await fetchNewMessages();
            }
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              console.log("Realtime 구독 성공");
            }
          });
      } catch (err) {
        console.error("Realtime 구독 실패:", err);
      }

      // 폴링: 500ms마다 신규 메시지만 확인
      pollInterval = setInterval(fetchNewMessages, 500);
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

    if (messageType === "answer" && !selectedQuestion) {
      alert("답할 질문을 선택해주세요");
      return;
    }

    setSending(true);

    const contentText = text.trim();
    let imageUrl: string | null = null;

    // 이미지를 Base64로 변환
    if (imageFile) {
      setUploading(true);
      imageUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(imageFile);
      });
      setUploading(false);
    }

    // DB 저장할 content 생성
    let finalContent = contentText || "";
    if (messageType === "question") {
      finalContent = "[Q] " + finalContent;
    } else if (messageType === "answer") {
      finalContent = `[A:${selectedQuestion}] ` + finalContent;
    }

    // 낙관적 업데이트 (DB에 저장될 형태로)
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      room_id: roomId!,
      user_id: userId,
      content: finalContent || null,
      image_url: imageUrl,
      is_anonymous: room?.type === "anonymous" ? isAnon : false,
      created_at: new Date().toISOString(),
      sender_name: undefined,
    };
    setMessages(prev => [...prev, tempMsg]);

    setText("");
    setImageFile(null);
    setImagePreview(null);

    const { data: newMsg, error: msgError } = await supabase.from("chat_messages").insert({
      room_id: roomId,
      user_id: userId,
      content: finalContent || null,
      image_url: imageUrl,
      is_anonymous: room?.type === "anonymous" ? isAnon : false,
    }).select().single();

    if (msgError) {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      alert("전송 실패: " + msgError.message);
    } else {
      // tempMsg를 실제 메시지로 교체
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", userId)
        .single();

      const today = new Date().toISOString().split("T")[0];
      let senderName = profile?.name || "알 수 없음";

      if (room?.type === "anonymous" && isAnon) {
        const { data: anonId } = await supabase
          .from("anon_daily_ids")
          .select("anon_number")
          .eq("user_id", userId)
          .eq("date", today)
          .single();
        senderName = `익명${anonId?.anon_number || ""}`;
      }

      setMessages(prev =>
        prev.map(m => m.id === tempMsg.id ? { ...newMsg, sender_name: senderName } : m)
      );

      // 성공 후 초기화
      setMessageType("message");
      setSelectedQuestion(null);
      setShowAnswerModal(false);
    }

    setSending(false);
  }

  const isMyMsg = (msg: Message) => msg.user_id === userId;

  async function handleReport(msg: Message, reason: string) {
    if (!userId) return;

    const { error } = await supabase.from("reports").insert({
      reporter_id: userId,
      reported_user_id: msg.user_id,
      message_id: msg.id,
      message_content: msg.content,
      reason: reason,
    });

    if (error) {
      alert("신고 실패: " + error.message);
    } else {
      alert("신고가 접수되었습니다.");
      setShowReportModal(false);
      setReportingMsg(null);
      setReportReason("");
    }
  }

  async function deleteRoom() {
    if (!roomId || !userId || !room) return;

    setDeleting(true);
    try {
      // 방 멤버 삭제
      await supabase.from("chat_members").delete().eq("room_id", roomId);

      // 방 메시지 삭제
      await supabase.from("chat_messages").delete().eq("room_id", roomId);

      // 방 삭제
      await supabase.from("chat_rooms").delete().eq("id", roomId);

      alert("방이 삭제되었습니다.");
      router.replace("/chat");
    } catch (error) {
      alert("방 삭제 실패");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

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
      <div className="flex items-center gap-3 px-4 pt-10 pb-3 bg-white border-b border-gray-200 shrink-0">
        <button onClick={() => router.back()} className="text-gray-400 text-xl p-1">‹</button>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
          style={{ background: accent?.bg }}
        >
          {room?.type === "anonymous" ? "💬" : room?.type === "club" ? "🎯" : "🔬"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800 truncate">{room?.name ?? "채팅방"}</p>
          {room?.type === "anonymous" && (
            <p className="text-xs text-gray-400">익명으로 질문하세요</p>
          )}
        </div>
        {room?.type !== "anonymous" && room?.created_by === userId && (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-gray-400 hover:text-danger-500 transition-colors p-1 text-xl"
            title="방 삭제"
          >
            ⋮
          </button>
        )}
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-2 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 text-gray-400">
            <span className="text-4xl">💬</span>
            <p className="text-sm">첫 메시지를 보내보세요!</p>
          </div>
        )}
        {messages.map((msg) => {
          const mine = isMyMsg(msg);

          // content로부터 메시지 타입 판별
          let msgType = "message";
          let displayContent = msg.content;

          if (msg.content?.startsWith("[Q] ")) {
            msgType = "question";
            displayContent = msg.content.substring(4);
          } else if (msg.content?.startsWith("[A:")) {
            msgType = "answer";
            const endIdx = msg.content.indexOf("]");
            displayContent = msg.content.substring(endIdx + 2);
          }

          if (msgType === "question") {
            return (
              <div key={msg.id} className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
                {!mine && <p className="text-xs text-gray-400 px-2">{msg.sender_name}</p>}
                <button
                  onClick={() => router.push(`/chat/question/${msg.id}`)}
                  className={`max-w-[98%] rounded-lg px-3 py-3 text-left transition-colors ${
                    mine
                      ? "bg-warning-500 text-white rounded-tr-sm hover:bg-warning-600"
                      : "bg-warning-50 text-gray-800 border-2 border-warning-200 rounded-tl-sm hover:bg-warning-100"
                  }`}
                >
                  <p className="text-xs font-semibold mb-1">❓ 질문</p>
                  {msg.image_url && (
                    <div className="mb-1.5 rounded-lg overflow-hidden">
                      <img src={msg.image_url} alt="질문 이미지" className="w-full max-w-[200px] rounded-lg" />
                    </div>
                  )}
                  {displayContent && <p className="text-sm leading-relaxed">{displayContent}</p>}
                </button>
                <p className="text-xs text-gray-400 px-2">{formatTime(msg.created_at)}</p>
              </div>
            );
          }

          if (msgType === "answer") {
            const questionId = msg.content?.match(/\[A:([^\]]+)\]/)?.[1];
            const relatedQuestion = questionId ? messages.find(m => m.id === questionId) : null;
            const questionPreview = relatedQuestion?.content?.replace(/^\[Q\] /, "");

            return (
              <div key={msg.id} className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
                {!mine && <p className="text-xs text-gray-400 px-2">{msg.sender_name}</p>}
                <button
                  onClick={() => questionId && router.push(`/chat/question/${questionId}`)}
                  className={`max-w-[98%] rounded-lg px-3 py-2.5 text-left ${
                    mine
                      ? "bg-success-600 text-white rounded-tr-sm hover:bg-success-700"
                      : "bg-success-50 text-gray-800 rounded-tl-sm border border-success-200 hover:bg-success-100"
                  }`}
                >
                  {/* 카톡 스타일 질문 미리보기 */}
                  {questionPreview && (
                    <div className={`rounded-lg px-2.5 py-1.5 mb-2 text-xs border-l-2 ${
                      mine ? "bg-success-700/30 border-success-300 text-success-100" : "bg-gray-100 border-gray-300 text-gray-600"
                    }`}>
                      <p className="font-semibold mb-0.5">❓ 질문</p>
                      <p className="line-clamp-2 opacity-90">{questionPreview}</p>
                    </div>
                  )}
                  <p className="text-xs font-semibold mb-1">✅ 답변</p>
                  {msg.image_url && (
                    <div className="mb-1.5 rounded-xl overflow-hidden">
                      <img src={msg.image_url} alt="답변 이미지" className="w-full max-w-[240px] rounded-xl" />
                    </div>
                  )}
                  {(() => {
                    const cleanContent = displayContent?.startsWith("[A:") ? displayContent.substring(displayContent.indexOf("]") + 2) : displayContent;
                    return cleanContent && <p className="text-sm leading-relaxed">{cleanContent}</p>;
                  })()}
                </button>
                <p className="text-xs text-gray-400 px-2">{formatTime(msg.created_at)}</p>
              </div>
            );
          }

          // 일반 메시지
          return (
            <div key={msg.id} className={`flex flex-col gap-1 group ${mine ? "items-end" : "items-start"}`}>
              {!mine && <p className="text-xs text-gray-400 px-2">{msg.sender_name}</p>}
              <div className={`flex items-start gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <div
                  className={`max-w-[98%] rounded-lg px-4 py-2.5 ${
                    mine
                      ? "bg-primary-500 text-white rounded-tr-sm"
                      : "bg-white text-gray-800 rounded-tl-sm border border-gray-200"
                  }`}
                >
                  {msg.image_url && (
                    <div className="mb-1.5 rounded-xl overflow-hidden">
                      <img src={msg.image_url} alt="첨부 이미지" className="w-full max-w-[240px] rounded-xl" />
                    </div>
                  )}
                  {displayContent && <p className="text-sm leading-relaxed">{displayContent}</p>}
                </div>
                {!mine && (
                  <button
                    onClick={() => {
                      setReportingMsg(msg);
                      setShowReportModal(true);
                    }}
                    className="text-gray-400 hover:text-danger-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="신고"
                  >
                    ⋮
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 px-2">{formatTime(msg.created_at)}</p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 pb-safe shrink-0">
        {banInfo && (
          <div className="mb-3 bg-danger-50 border border-danger-200 rounded-xl p-3 text-sm text-danger-700">
            <p className="font-semibold">⚠️ 채팅 정지 중</p>
            <p className="text-xs mt-1">
              {new Date(banInfo.ban_until).toLocaleDateString("ko-KR")} 까지 메시지를 전송할 수 없습니다.
            </p>
          </div>
        )}
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
                isAnon ? "bg-gray-200 text-gray-700" : "bg-gray-100 text-primary-500"
              }`}
            >
              {isAnon ? "익명" : "실명"}
            </button>
          </div>
        )}

        {/* 메시지 타입 선택 */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <button
            onClick={() => { setMessageType("message"); setSelectedQuestion(null); }}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
              messageType === "message" ? "bg-primary-200 text-primary-500" : "bg-gray-100 text-gray-600"
            }`}
          >
            💬 메시지
          </button>
          <button
            onClick={() => { setMessageType("question"); setSelectedQuestion(null); }}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
              messageType === "question" ? "bg-warning-200 text-warning-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            ❓ 질문
          </button>
          <button
            onClick={() => {
              setMessageType("answer");
              setShowAnswerModal(true);
            }}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
              messageType === "answer" ? "bg-success-200 text-success-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            ✅ 답하기
          </button>
        </div>

        {messageType === "answer" && selectedQuestion && (
          <div className="mb-2 p-2 bg-success-50 rounded-lg border border-success-200 text-xs text-success-700">
            선택된 질문: {questions.find(q => q.id === selectedQuestion)?.content?.slice(0, 40)}...
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
            rows={3}
            className="flex-1 resize-none bg-gray-100 rounded-lg px-4 py-2.5 text-sm outline-none max-h-32 overflow-y-auto leading-relaxed"
          />
          <button
            onClick={handleSend}
            disabled={(!text.trim() && !imageFile) || sending || uploading || !!banInfo}
            className="w-9 h-9 bg-primary-500 disabled:bg-gray-200 rounded-xl flex items-center justify-center shrink-0 transition-colors"
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

      {/* 신고 모달 */}
      {showReportModal && reportingMsg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white w-full rounded-t-3xl px-6 py-8 flex flex-col gap-4 max-w-md">
            <h2 className="text-lg font-bold text-gray-800">메시지 신고</h2>

            <div className="bg-danger-50 rounded-xl p-3 border border-danger-200">
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-semibold">신고 대상:</span> {reportingMsg.sender_name}
              </p>
              <p className="text-xs text-gray-500 line-clamp-2">{reportingMsg.content}</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">신고 사유</p>
              <div className="space-y-2">
                {["욕설/혐오", "스팸", "부적절한 내용", "따돌림", "기타"].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setReportReason(reason)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl border-2 transition-colors text-sm ${
                      reportReason === reason
                        ? "border-danger-500 bg-danger-50 text-danger-700 font-medium"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportingMsg(null);
                  setReportReason("");
                }}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm"
              >
                취소
              </button>
              <button
                onClick={() => handleReport(reportingMsg, reportReason)}
                disabled={!reportReason}
                className="flex-1 px-4 py-3 bg-danger-600 disabled:bg-gray-200 text-white rounded-lg font-semibold text-sm"
              >
                신고하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 방 삭제 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white w-full rounded-t-3xl px-6 py-8 flex flex-col gap-4 max-w-md">
            <h2 className="text-lg font-bold text-gray-800">방을 삭제하시겠어요?</h2>

            <div className="bg-danger-50 rounded-xl p-3 border border-danger-200">
              <p className="text-sm text-danger-700">
                <span className="font-semibold">⚠️ 주의:</span> 방 삭제 후 모든 메시지가 함께 삭제됩니다.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm"
              >
                취소
              </button>
              <button
                onClick={deleteRoom}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-danger-600 disabled:bg-gray-200 text-white rounded-lg font-semibold text-sm"
              >
                {deleting ? "삭제 중..." : "삭제하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 질문 선택 모달 */}
      {showAnswerModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white w-full rounded-t-3xl px-6 py-8 flex flex-col gap-4 max-w-md max-h-[80vh] flex-col-reverse">
            <button
              onClick={() => setShowAnswerModal(false)}
              className="w-full bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium text-sm"
            >
              취소
            </button>

            <div className="flex-1 overflow-y-auto">
              <h2 className="text-lg font-bold text-gray-800 mb-4 sticky top-0 bg-white">답할 질문 선택</h2>
              {questions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">등록된 질문이 없어요</p>
              ) : (
                <div className="space-y-2">
                  {questions.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => {
                        setSelectedQuestion(q.id);
                        setShowAnswerModal(false);
                      }}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                        selectedQuestion === q.id
                          ? "border-success-500 bg-success-50"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <p className="text-xs text-gray-500 mb-1">{q.sender_name}</p>
                      <p className="text-sm text-gray-800 line-clamp-2">{q.content}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 입장 가이드 모달 */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white w-full rounded-t-3xl px-6 py-8 flex flex-col gap-4 max-w-md">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🔒</span>
              <h2 className="text-lg font-bold text-gray-800">익명 보장 안내</h2>
            </div>

            <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
              <p>
                <span className="font-semibold">📌 채팅방에서만 익명입니다.</span> 실제 신원은 관리자 시스템에서 확인 가능합니다.
              </p>
              <p>
                <span className="font-semibold">⚠️ 부적절한 언행 주의</span>
                <br />
                욕설, 스팸, 혐오, 따돌림 등 부적절한 내용은 신고될 수 있습니다.
              </p>
              <p>
                <span className="font-semibold">👨‍⚖️ 정보 공개</span>
                <br />
                문제 발생 시 당신의 개인정보와 채팅 기록이 관리자에게 전달되며, 필요시 학교에도 보고될 수 있습니다.
              </p>
              <p className="text-gray-600 text-xs">
                건전한 커뮤니티를 위해 협력해주세요. 😊
              </p>
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              style={{"backgroundColor": "#0052cc"}} className="w-full text-white py-3 rounded-lg font-bold text-sm mt-2"
            >
              확인했습니다
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
