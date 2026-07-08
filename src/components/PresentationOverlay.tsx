"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { reactionsPath, submissionPath } from "@/lib/paths";
import { useReactions } from "@/lib/hooks";
import { endPresentation, setPresentationSlide } from "@/lib/actions";
import type { PresentationState, SubmissionSummaryDoc } from "@/lib/types";
import { Button } from "@/components/ui";

const EMOJIS = ["👍", "❤️", "🔥", "👏", "💡"];

function splitSlides(html: string): string[] {
  if (typeof window === "undefined" || !html) return html ? [html] : [];
  try {
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const sections = Array.from(parsed.querySelectorAll("section"));
    if (sections.length) return sections.map((s) => s.outerHTML);
  } catch {
    // fall through
  }
  return [html];
}

export function PresentationOverlay({
  sessionCode,
  presentation,
  meStudentId,
  meName,
  canControl,
}: {
  sessionCode: string;
  presentation: PresentationState;
  meStudentId: string | null;
  meName: string;
  canControl: boolean; // 교사이거나 발표자 본인이면 슬라이드 제어 가능
}) {
  const submissionId = presentation.activeSubmissionId!;
  const [submission, setSubmission] = useState<SubmissionSummaryDoc | null>(null);
  const [regen, setRegen] = useState(false);
  const [comment, setComment] = useState("");
  const reactions = useReactions(sessionCode, submissionId);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, submissionPath(sessionCode, submissionId)), (snap) => {
      setSubmission(snap.exists() ? (snap.data() as SubmissionSummaryDoc) : null);
    });
    return unsub;
  }, [sessionCode, submissionId]);

  const slides = useMemo(() => splitSlides(submission?.slidesHtml ?? ""), [submission?.slidesHtml]);
  const idx = Math.min(presentation.slideIndex, Math.max(0, slides.length - 1));
  const isPresenter = !!meStudentId && submission?.studentId === meStudentId;
  const controllable = canControl || isPresenter;

  async function move(delta: number) {
    const next = Math.max(0, Math.min(slides.length - 1, idx + delta));
    await setPresentationSlide(sessionCode, next);
  }

  async function regenerate() {
    if (!submission) return;
    setRegen(true);
    try {
      const res = await fetch("/api/slides-gen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionCode, studentId: submission.studentId, projectId: submission.projectId }),
      });
      const data = await res.json();
      if (data.ok && data.slidesHtml) {
        await updateDoc(doc(db, submissionPath(sessionCode, submissionId)), { slidesHtml: data.slidesHtml });
        await setPresentationSlide(sessionCode, 0);
      }
    } finally {
      setRegen(false);
    }
  }

  async function react(emoji: string) {
    // eslint-disable-next-line react-hooks/purity -- onClick 핸들러에서만 실행, 렌더 중 호출 아님
    const createdAt = Date.now();
    await addDoc(collection(db, reactionsPath(sessionCode)), { targetProjectId: submissionId, fromName: meName, emoji, createdAt });
  }

  async function sendComment() {
    if (!comment.trim()) return;
    const createdAt = Date.now();
    await addDoc(collection(db, reactionsPath(sessionCode)), { targetProjectId: submissionId, fromName: meName, comment: comment.trim(), createdAt });
    setComment("");
  }

  const comments = reactions.filter((r) => r.comment);
  const emojiCounts = EMOJIS.map((e) => ({ e, n: reactions.filter((r) => r.emoji === e).length }));

  return (
    <main className="fixed inset-0 z-40 flex flex-col bg-slate-900 text-white lg:flex-row">
      {/* 슬라이드 영역 */}
      <div className="flex flex-1 flex-col p-4 lg:p-8">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-black">🎤 발표 중</span>
            <span className="ml-2 text-sm font-bold">{submission?.studentName ?? presentation.presenterName} 연구원</span>
            {submission?.requestTitle && <span className="ml-2 text-xs text-slate-400">· {submission.requestTitle}</span>}
          </div>
          {controllable && (
            <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => endPresentation(sessionCode)}>
              발표 종료
            </Button>
          )}
        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto rounded-2xl bg-white p-2 text-slate-900">
          {slides.length > 0 ? (
            <div
              className="presentation-slide mx-auto w-full max-w-4xl"
              dangerouslySetInnerHTML={{ __html: slides[idx] }}
            />
          ) : (
            <div className="text-center text-slate-500">
              <p className="mb-3 font-bold">아직 발표 슬라이드가 없어요.</p>
              {controllable ? (
                <Button onClick={regenerate} disabled={regen}>
                  {regen ? "슬라이드 만드는 중..." : "발표 슬라이드 만들기"}
                </Button>
              ) : (
                <p className="text-sm">발표자가 슬라이드를 준비하고 있어요.</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-center gap-3">
          {controllable && slides.length > 0 && (
            <>
              <Button variant="secondary" className="!px-4 !py-1.5 text-xs" disabled={idx <= 0} onClick={() => move(-1)}>
                ← 이전
              </Button>
              <span className="text-sm font-bold">{slides.length ? idx + 1 : 0} / {slides.length}</span>
              <Button variant="secondary" className="!px-4 !py-1.5 text-xs" disabled={idx >= slides.length - 1} onClick={() => move(1)}>
                다음 →
              </Button>
            </>
          )}
          {submission?.url && (
            <a href={submission.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-rose-300 underline">
              산출물 열어보기 →
            </a>
          )}
        </div>
      </div>

      {/* 댓글/반응 패널 */}
      <div className="flex h-56 flex-col border-t border-slate-700 bg-slate-800 lg:h-auto lg:w-80 lg:border-l lg:border-t-0">
        <div className="flex items-center gap-1.5 border-b border-slate-700 p-3">
          {emojiCounts.map(({ e, n }) => (
            <button key={e} onClick={() => react(e)} className="rounded-full bg-slate-700 px-2 py-1 text-sm hover:bg-slate-600">
              {e} {n > 0 && <span className="text-xs">{n}</span>}
            </button>
          ))}
        </div>
        <div className="flex-1 space-y-2 overflow-auto p-3 text-sm">
          {comments.length === 0 && <p className="text-slate-500">응원 댓글을 남겨보세요!</p>}
          {comments.map((c, i) => (
            <div key={i}>
              <span className="font-bold text-rose-300">{c.fromName}</span>{" "}
              <span className="text-slate-200">{c.comment}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-1.5 border-t border-slate-700 p-3">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendComment()}
            placeholder="댓글 남기기"
            className="flex-1 rounded-lg bg-slate-700 px-2 py-1.5 text-sm text-white outline-none placeholder:text-slate-400"
          />
          <button onClick={sendComment} className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white">
            등록
          </button>
        </div>
      </div>
    </main>
  );
}
