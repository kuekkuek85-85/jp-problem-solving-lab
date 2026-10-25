"use client";

import { LEVEL_LABELS, STAGE_LABELS, type Stage, type StudentDoc } from "@/lib/types";
import { peerText } from "@/lib/constants";
import { LevelBadge } from "@/components/ui";

export function StageHeader({
  student,
  stage,
  requestTitle,
  onGoToBoard,
  cohortLabel,
}: {
  student: StudentDoc;
  stage: Stage;
  requestTitle?: string | null;
  onGoToBoard?: () => void;
  cohortLabel?: string; // 교사 연수 기수·날짜 표기(예: "교사 연수 2기 (10/28)")
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur px-4 py-3">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
        {onGoToBoard && (
          <button
            onClick={onGoToBoard}
            className="shrink-0 rounded-full border-2 border-ink-deep bg-white px-3 py-1.5 text-xs font-bold text-ink-deep hover:bg-slate-50"
          >
            ← 의뢰 목록
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-black text-slate-900">{student.name}</span>
            <LevelBadge level={student.level} />
            {cohortLabel && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">{cohortLabel}</span>
            )}
            <span className="text-xs text-slate-400">{peerText(student.studentId, LEVEL_LABELS[student.level].tagline)}</span>
          </div>
          {requestTitle && <div className="text-xs text-slate-500 mt-0.5">맡은 의뢰: {requestTitle}</div>}
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-brand-deep">{STAGE_LABELS[stage]}</div>
        </div>
      </div>
      <div className="mx-auto mt-2 flex max-w-4xl gap-1">
        {student.stamps.length > 0 &&
          [1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className={`h-1.5 flex-1 rounded-full ${student.stamps.includes(n) ? "bg-brand-soft" : "bg-slate-200"}`}
            />
          ))}
      </div>
    </header>
  );
}
