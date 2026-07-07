"use client";

import { LEVEL_LABELS, STAGE_LABELS, type Stage, type StudentDoc } from "@/lib/types";
import { LevelBadge } from "@/components/ui";

export function StageHeader({
  student,
  stage,
  requestTitle,
}: {
  student: StudentDoc;
  stage: Stage;
  requestTitle?: string | null;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur px-4 py-3">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-900">{student.name}</span>
            <LevelBadge level={student.level} />
            <span className="text-xs text-slate-400">{LEVEL_LABELS[student.level].tagline}</span>
          </div>
          {requestTitle && <div className="text-xs text-slate-500 mt-0.5">맡은 의뢰: {requestTitle}</div>}
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-rose-600">{STAGE_LABELS[stage]}</div>
        </div>
      </div>
      <div className="mx-auto mt-2 flex max-w-4xl gap-1">
        {student.stamps.length > 0 &&
          [1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className={`h-1.5 flex-1 rounded-full ${student.stamps.includes(n) ? "bg-rose-400" : "bg-slate-200"}`}
            />
          ))}
      </div>
    </header>
  );
}
