"use client";

import { useMemo, useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { reactionsPath } from "@/lib/paths";
import { useSubmissions } from "@/lib/hooks";
import { LevelBadge } from "@/components/ui";

const EMOJIS = ["👍", "❤️", "🔥", "👏", "💡"];

export function SubmissionGallery({
  sessionCode,
  canReact,
  fromName,
}: {
  sessionCode: string;
  canReact: boolean;
  fromName?: string;
}) {
  const submissions = useSubmissions(sessionCode);
  const [grouped, setGrouped] = useState(false);

  const groups = useMemo(() => {
    if (!grouped) return [{ title: null as string | null, items: submissions }];
    const map = new Map<string, typeof submissions>();
    for (const s of submissions) {
      const list = map.get(s.requestTitle) ?? [];
      list.push(s);
      map.set(s.requestTitle, list);
    }
    return Array.from(map.entries()).map(([title, items]) => ({ title, items }));
  }, [submissions, grouped]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black">🏆 해결 보고회</h2>
        <button
          onClick={() => setGrouped((v) => !v)}
          className="rounded-full bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600"
        >
          {grouped ? "전체 목록으로 보기" : "의뢰별로 묶어보기"}
        </button>
      </div>

      {submissions.length === 0 && (
        <div className="py-16 text-center text-sm text-slate-400">아직 제출된 해결안이 없어요.</div>
      )}

      {groups.map((g, gi) => (
        <div key={gi} className="mb-8">
          {g.title && <h3 className="mb-3 text-sm font-black text-slate-600">{g.title}</h3>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((s) => (
              <SubmissionCard key={s.projectId} sessionCode={sessionCode} submission={s} canReact={canReact} fromName={fromName} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SubmissionCard({
  sessionCode,
  submission,
  canReact,
  fromName,
}: {
  sessionCode: string;
  submission: ReturnType<typeof useSubmissions>[number];
  canReact: boolean;
  fromName?: string;
}) {
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  async function addReaction(emoji: string) {
    // eslint-disable-next-line react-hooks/purity -- runs only from an onClick handler, never during render
    const createdAt = Date.now();
    await addDoc(collection(db, reactionsPath(sessionCode)), {
      targetProjectId: submission.projectId,
      fromName: fromName ?? "참관자",
      emoji,
      createdAt,
    });
  }

  async function sendComment() {
    if (!comment.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, reactionsPath(sessionCode)), {
        targetProjectId: submission.projectId,
        fromName: fromName ?? "참관자",
        comment,
        createdAt: Date.now(),
      });
      setComment("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400">{submission.requestTitle}</span>
        <LevelBadge level={submission.level} />
      </div>
      <h4 className="font-black text-slate-900">{submission.studentName} 연구원</h4>
      <p className="mt-1 text-sm text-slate-600">{submission.oneLiner}</p>
      {submission.badges?.length > 0 && (
        <div className="mt-1 flex gap-1 text-xs">
          {submission.badges.includes("helper") && <span>🤝</span>}
          {submission.badges.includes("challenger") && <span>🚀</span>}
        </div>
      )}
      {submission.url && (
        <a href={submission.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-rose-500 underline">
          산출물 열어보기 →
        </a>
      )}

      {canReact && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="mb-2 flex gap-1.5">
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => addReaction(e)} className="rounded-full bg-slate-100 px-2 py-1 text-sm hover:bg-slate-200">
                {e}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              value={comment}
              onChange={(ev) => setComment(ev.target.value)}
              placeholder="짧은 댓글 남기기"
              className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-rose-300"
            />
            <button
              onClick={sendComment}
              disabled={sending}
              className="rounded-lg bg-rose-500 px-2 py-1 text-xs font-bold text-white disabled:opacity-40"
            >
              등록
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
