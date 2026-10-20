"use client";

import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { peerReviewPath } from "@/lib/paths";
import { isTrainingLab } from "@/lib/constants";
import { usePeerReview, useSubmissions } from "@/lib/hooks";
import { endPresentation, startPresentation } from "@/lib/actions";
import type { PresentationState } from "@/lib/types";
import { Button, Card, LevelBadge } from "@/components/ui";

// 교사가 학생 순서대로 발표를 진행시킨다. 발표를 시작하면 모든 학생 화면이 그 발표로 동기화된다.
export function PresentationControl({
  sessionCode,
  presentation,
}: {
  sessionCode: string;
  presentation: PresentationState | null;
}) {
  const submissions = useSubmissions(sessionCode);
  const peer = usePeerReview(sessionCode);
  const training = isTrainingLab(sessionCode);
  const ordered = [...submissions].sort((a, b) => a.submittedAt - b.submittedAt);
  const activeId = presentation?.activeSubmissionId ?? null;
  const activeIdx = ordered.findIndex((s) => s.projectId === activeId);

  function present(idx: number) {
    const s = ordered[idx];
    if (s) startPresentation(sessionCode, s.projectId, s.studentName);
  }

  async function assignPeerReview() {
    if (submissions.length < 2) {
      alert("제출이 2건 이상 쌓인 뒤에 배정할 수 있어요.");
      return;
    }
    if (peer && !confirm("동료 검토를 다시 배정할까요? 기존 배정이 바뀌어요. (이미 작성된 검토는 유지)")) return;
    const shuffled = [...submissions].sort(() => Math.random() - 0.5);
    const assignments: Record<string, string> = {};
    for (let i = 0; i < shuffled.length; i++) {
      assignments[shuffled[i].studentId] = shuffled[(i + 1) % shuffled.length].projectId;
    }
    await setDoc(doc(db, peerReviewPath(sessionCode)), { assignments, createdAt: Date.now() });
    alert("동료 검토를 배정했어요. 참가자 해결 보고회 화면에 '내가 검토할 동료 산출물'로 나타나요.");
  }

  if (submissions.length === 0) {
    return <p className="text-sm text-slate-400">아직 제출된 해결안이 없어요. 발표할 내용이 쌓이면 여기서 진행할 수 있어요.</p>;
  }

  return (
    <div className="space-y-4">
      {training && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-black text-amber-800">🧑‍🤝‍🧑 동료 검토</p>
              <p className="text-xs text-slate-500">
                {peer
                  ? `배정 완료 (${Object.keys(peer.assignments ?? {}).length}명) · 참가자 화면에 표시 중`
                  : "제출이 어느 정도 쌓이면 랜덤으로 1:1 배정하세요."}
              </p>
            </div>
            <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={assignPeerReview}>
              {peer ? "↻ 다시 배정" : "🎲 동료 검토 배정"}
            </Button>
          </div>
        </Card>
      )}

      <Card className={activeId ? "border-brand-soft bg-brand/5" : ""}>
        {activeId ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-brand px-3 py-1 text-xs font-black text-white">🎤 발표 중</span>
            <span className="font-bold">
              {ordered[activeIdx]?.studentName ?? presentation?.presenterName} · {ordered[activeIdx]?.requestTitle}
            </span>
            <span className="text-xs text-slate-500">
              슬라이드 {(presentation?.slideIndex ?? 0) + 1}쪽 · {activeIdx + 1}/{ordered.length}번째 발표
            </span>
            <div className="ml-auto flex gap-2">
              <Button
                variant="secondary"
                className="!px-3 !py-1.5 text-xs"
                disabled={activeIdx <= 0}
                onClick={() => present(activeIdx - 1)}
              >
                ◀ 이전 발표자
              </Button>
              <Button
                variant="secondary"
                className="!px-3 !py-1.5 text-xs"
                disabled={activeIdx >= ordered.length - 1}
                onClick={() => present(activeIdx + 1)}
              >
                다음 발표자 ▶
              </Button>
              <Button variant="danger" className="!px-3 !py-1.5 text-xs" onClick={() => endPresentation(sessionCode)}>
                발표 종료
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              학생을 골라 발표를 시작하면 모든 학생 화면이 그 발표로 동기화돼요. 슬라이드 이동도 여기서 제어할 수 있어요.
            </p>
            <Button className="!px-3 !py-1.5 text-xs" onClick={() => present(0)}>
              첫 발표자부터 시작
            </Button>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ordered.map((s, i) => (
          <Card key={s.projectId} className={s.projectId === activeId ? "border-brand-soft" : ""}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-bold">
                  {i + 1}. {s.studentName}
                </p>
                <p className="text-xs text-slate-500">{s.requestTitle}</p>
              </div>
              <LevelBadge level={s.level} />
            </div>
            <p className="mt-1 truncate text-xs text-slate-500">{s.oneLiner}</p>
            <div className="mt-2 flex items-center gap-2">
              <Button
                className="!px-3 !py-1.5 text-xs"
                disabled={s.projectId === activeId}
                onClick={() => startPresentation(sessionCode, s.projectId, s.studentName)}
              >
                {s.projectId === activeId ? "발표 중" : "🎤 발표 시작"}
              </Button>
              {!s.slidesHtml && <span className="text-[11px] text-slate-400">슬라이드는 발표 시작 후 생성돼요</span>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
