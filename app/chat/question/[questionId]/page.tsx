"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Message = {
  id: string;
  room_id?: string;
  content: string | null;
  image_url: string | null;
  is_anonymous: boolean;
  created_at: string;
  user_id: string | null;
  sender_name?: string;
};

export default function QuestionPage() {
  const params = useParams();
  const questionId = typeof params?.questionId === "string" ? params.questionId : null;
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Message | null>(null);
  const [answers, setAnswers] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);

      if (!questionId) return;

      // 질문 메시지 조회
      const { data: questionMsg } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("id", questionId)
        .single();

      if (!questionMsg) {
        router.replace("/chat");
        return;
      }

      // 발신자 정보 조회
      let senderName = "알 수 없음";
      if (questionMsg.is_anonymous) {
        const today = new Date().toISOString().split("T")[0];
        const { data: anonId } = await supabase
          .from("anon_daily_ids")
          .select("anon_number")
          .eq("user_id", questionMsg.user_id)
          .eq("date", today)
          .single();
        senderName = `익명${anonId?.anon_number || ""}`;
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", questionMsg.user_id)
          .single();
        senderName = profile?.name || "알 수 없음";
      }

      setQuestion({
        ...questionMsg,
        sender_name: senderName,
      });

      // 답변 조회
      const { data: allAnswers } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", questionMsg.room_id)
        .order("created_at", { ascending: true });

      // 이 질문에 대한 답변만 필터링 ([A:questionId] 형식)
      const answerMsgs = allAnswers?.filter(m => m.content?.startsWith(`[A:${questionId}]`)) || [];

      if (answerMsgs && answerMsgs.length > 0) {
        const answerUserIds = [...new Set(answerMsgs.map(a => a.user_id).filter(Boolean))];
        let nameMap: Record<string, string> = {};
        let anonMap: Record<string, number> = {};

        if (answerUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, name")
            .in("id", answerUserIds);

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
            .in("user_id", answerUserIds);

          if (anonIds) {
            anonIds.forEach((a: any) => {
              anonMap[a.user_id] = a.anon_number;
            });
          }
        }

        const answersWithNames = answerMsgs.map(a => ({
          ...a,
          sender_name: a.is_anonymous ? `익명${anonMap[a.user_id] || ""}` : (nameMap[a.user_id] || "알 수 없음"),
        }));

        setAnswers(answersWithNames);
      }
    };

    init();
  }, [questionId, router]);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSendAnswer() {
    if ((!text.trim() && !imageFile) || !userId || sending) return;
    setSending(true);

    const contentText = text.trim();
    let imageUrl: string | null = null;

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

    const { data, error } = await supabase.from("chat_messages").insert({
      room_id: question?.room_id,
      user_id: userId,
      content: `[A:${questionId}] ${contentText || ""}`.trim(),
      image_url: imageUrl,
      is_anonymous: true,
    }).select().single();

    if (error) {
      alert("답변 전송 실패: " + error.message);
    } else {
      // 새 답변 추가
      let senderName = "알 수 없음";
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", userId)
        .single();
      senderName = profile?.name || "알 수 없음";

      setAnswers(prev => [...prev, {
        ...data,
        sender_name: senderName,
      }]);

      setText("");
      setImageFile(null);
      setImagePreview(null);
    }

    setSending(false);
  }

  function formatTime(ts: string) {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  if (!question) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 pt-10 pb-3 bg-white border-b border-gray-100 shrink-0">
        <button onClick={() => router.back()} className="text-gray-400 text-xl p-1">‹</button>
        <h1 className="text-sm font-bold text-gray-900">질문 상세</h1>
      </div>

      {/* 질문 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {/* 질문 카드 */}
        <div className="bg-white rounded-2xl border-2 border-orange-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">❓</span>
            <div className="flex-1">
              <p className="text-xs font-bold text-orange-600">질문</p>
              <p className="text-xs text-gray-500">{question.sender_name}</p>
            </div>
            <span className="text-xs text-gray-400">{formatTime(question.created_at)}</span>
          </div>
          {question.image_url && (
            <div className="mb-3 rounded-xl overflow-hidden">
              <img src={question.image_url} alt="질문 이미지" className="w-full rounded-xl" />
            </div>
          )}
          {question.content && (
            <p className="text-sm leading-relaxed text-gray-900">
              {question.content.startsWith("[Q] ") ? question.content.substring(4) : question.content}
            </p>
          )}
        </div>

        {/* 답변 구분선 */}
        {answers.length > 0 && (
          <div className="flex items-center gap-2 my-2">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-bold text-gray-400">답변 {answers.length}개</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        )}

        {/* 답변 목록 */}
        {answers.map((answer) => {
          // [A:uuid] 제거
          const displayContent = answer.content?.startsWith("[A:")
            ? answer.content.substring(answer.content.indexOf("]") + 2)
            : answer.content;

          return (
            <div key={answer.id} className="bg-white rounded-2xl border border-green-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">✅</span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-green-600">답변</p>
                  <p className="text-xs text-gray-500">{answer.sender_name}</p>
                </div>
                <span className="text-xs text-gray-400">{formatTime(answer.created_at)}</span>
              </div>
              {answer.image_url && (
                <div className="mb-3 rounded-xl overflow-hidden">
                  <img src={answer.image_url} alt="답변 이미지" className="w-full rounded-xl" />
                </div>
              )}
              {displayContent && <p className="text-sm leading-relaxed text-gray-900">{displayContent}</p>}
            </div>
          );
        })}

        {answers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <span className="text-4xl mb-2">💭</span>
            <p className="text-sm">아직 답변이 없어요</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 답변 입력 */}
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
                handleSendAnswer();
              }
            }}
            placeholder="답변을 입력하세요..."
            rows={1}
            className="flex-1 resize-none bg-gray-100 rounded-2xl px-4 py-2.5 text-sm outline-none max-h-32 leading-relaxed"
          />
          <button
            onClick={handleSendAnswer}
            disabled={(!text.trim() && !imageFile) || sending || uploading}
            className="w-9 h-9 bg-green-600 disabled:bg-gray-200 rounded-xl flex items-center justify-center shrink-0 transition-colors"
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
