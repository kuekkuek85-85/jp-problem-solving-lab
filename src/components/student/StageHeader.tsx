"use client";

import { useEffect, useState } from "react";
import { LEVEL_LABELS, STAGE_LABELS, type Stage, type StudentDoc } from "@/lib/types";
import { LevelBadge } from "@/components/ui";

export function StageHeader({
  student,
  stage,
  requestTitle,
  timerEnd,
}: {
  student: StudentDoc;
  stage: Stage;
  requestTitle?: string | null;
  timerEnd?: number | null;
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
          {timerEnd && <TimerText timerEnd={timerEnd} />}
        </div>
      </div>
      <div className="mx-auto mt-2 flex max-w-4xl gap-1">
        {student.stamps.length > 0 &&
          [1, 2, 3, 4, 5, 6].map((n) => (
            <span
              key={n}
              className={`h-1.5 flex-1 rounded-full ${student.stamps.includes(n) ? "bg-rose-400" : "bg-slate-150 bg-slate-200"}`}
            />
          ))}
      </div>
    </header>
  );
}

function TimerText({ timerEnd }: { timerEnd: number }) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remainingMs = timerEnd - now;
  if (remainingMs <= 0) return <div className="text-xs text-slate-400">시간 종료</div>;
  const min = Math.floor(remainingMs / 60000);
  const sec = Math.floor((remainingMs % 60000) / 1000);
  return (
    <div className="text-xs text-slate-400">
      남은 시간 {min}:{sec.toString().padStart(2, "0")}
    </div>
  );
}
