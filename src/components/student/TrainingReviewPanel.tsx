"use client";

import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { reactionsPath } from "@/lib/paths";
import { usePeerReview, useReactions } from "@/lib/hooks";
import type { StudentDoc, SubmissionSummaryDoc } from "@/lib/types";
import { Button, Card, Textarea } from "@/components/ui";
import { HtmlArtifactButton } from "@/components/HtmlArtifact";

// 교사 연수 전용: 해결 보고회(갤러리)에서 강사 피드백 확인 + 동료 검토(랜덤 배정) 작성/열람.
export function TrainingReviewPanel({
  sessionCode,
  student,
  submissions,
}: {
  sessionCode: string;
  student: StudentDoc;
  submissions: SubmissionSummaryDoc[];
}) {
  const peer = usePeerReview(sessionCode);
  const myProjectId = submissions.find((s) => s.studentId === student.studentId)?.projectId ?? null;
  const targetProjectId = peer?.assignments?.[student.studentId] ?? null;
  const targetSub = submissions.find((s) => s.projectId === targetProjectId) ?? null;

  const received = useReactions(sessionCode, myProjectId).filter((r) => r.kind === "peer");
  const myReviewsOnTarget = useReactions(sessionCode, targetProjectId).filter(
    (r) => r.kind === "peer" && r.reviewerId === student.studentId
  );
  const alreadyReviewed = myReviewsOnTarget.length > 0;

  const [good, setGood] = useState("");
  const [improve, setImprove] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitReview() {
    if (!targetProjectId || (!good.trim() && !improve.trim()) || saving) return;
    setSaving(true);
    try {
      await addDoc(collection(db, reactionsPath(sessionCode)), {
        targetProjectId,
        fromName: student.name,
        reviewerId: student.studentId,
        kind: "peer",
        good: good.trim(),
        improve: improve.trim(),
        createdAt: Date.now(),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-3 px-4 pt-4">
      {student.instructorFeedback?.text && (
        <Card className="border-brand-soft bg-brand/5">
          <p className="mb-1 text-sm font-black text-brand-deep">📣 강사 피드백 (이승엽)</p>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{student.instructorFeedback.text}</p>
        </Card>
      )}

      <Card>
        <p className="mb-2 text-sm font-black text-slate-800">🔎 내가 검토할 동료 산출물</p>
        {!targetSub ? (
          <p className="text-sm text-slate-400">
            {targetProjectId
              ? "배정된 산출물을 찾을 수 없어요."
              : "아직 동료 검토가 배정되지 않았어요. 강사님이 배정하면 여기에 나타나요."}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="font-bold text-slate-800">{targetSub.studentName} 님 · {targetSub.requestTitle}</p>
              <p className="mt-0.5 text-sm text-slate-600">{targetSub.oneLiner}</p>
              {targetSub.usage && <p className="mt-0.5 text-xs text-slate-500">🕹️ 사용법: {targetSub.usage}</p>}
              <div className="mt-1 flex flex-wrap items-center gap-3">
                {targetSub.html && (
                  <HtmlArtifactButton html={targetSub.html} title={targetSub.htmlFileName || targetSub.requestTitle} label="📄 화면 미리보기" />
                )}
                {targetSub.url && (
                  <a href={targetSub.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-brand underline">
                    🔗 링크 열기 →
                  </a>
                )}
              </div>
            </div>

            {alreadyReviewed ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">✅ 동료 검토를 남겼어요. 고맙습니다!</p>
            ) : (
              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">👍 좋았던 점</label>
                  <Textarea rows={2} value={good} onChange={(e) => setGood(e.target.value)} placeholder="인상 깊었던 점, 잘 만든 점" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">💡 개선 아이디어</label>
                  <Textarea rows={2} value={improve} onChange={(e) => setImprove(e.target.value)} placeholder="이렇게 하면 더 좋겠다 싶은 점" />
                </div>
                <Button className="w-full" disabled={saving || (!good.trim() && !improve.trim())} onClick={submitReview}>
                  {saving ? "제출 중..." : "동료 검토 제출"}
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {received.length > 0 && (
        <Card>
          <p className="mb-2 text-sm font-black text-slate-800">📝 내가 받은 동료 검토 ({received.length})</p>
          <div className="space-y-2">
            {received.map((r) => (
              <div key={r.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                <p className="text-xs font-bold text-slate-400">{r.fromName} 님</p>
                {r.good && <p className="mt-0.5 text-slate-700">👍 {r.good}</p>}
                {r.improve && <p className="mt-0.5 text-slate-700">💡 {r.improve}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
