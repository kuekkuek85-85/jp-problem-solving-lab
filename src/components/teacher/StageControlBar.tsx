"use client";

import { useState } from "react";
import { STAGE_LABELS, STAGE_ORDER, type SessionDoc, type Stage } from "@/lib/types";
import { Button } from "@/components/ui";

export function StageControlBar({
  sessionCode,
  pin,
  session,
  onCloseLab,
}: {
  sessionCode: string;
  pin: string;
  session: SessionDoc;
  onCloseLab: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function setStage(stage: Stage) {
    setBusy(true);
    try {
      await fetch("/api/teacher/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionCode, pin, currentStage: stage }),
      });
    } finally {
      setBusy(false);
    }
  }

  const currentIdx = STAGE_ORDER.indexOf(session.currentStage);
  const nextStage = STAGE_ORDER[currentIdx + 1];

  return (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        <div>
          <div className="text-xs font-bold text-slate-400">현재 단계</div>
          <div className="text-lg font-black text-rose-600">{STAGE_LABELS[session.currentStage]}</div>
        </div>

        <select
          value={session.currentStage}
          disabled={busy}
          onChange={(e) => setStage(e.target.value as Stage)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-bold"
        >
          {STAGE_ORDER.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>

        {nextStage && (
          <Button variant="secondary" disabled={busy} onClick={() => setStage(nextStage)} className="!px-3 !py-1.5 text-xs">
            다음 단계 → {STAGE_LABELS[nextStage]}
          </Button>
        )}

        <div className="ml-auto flex gap-2">
          <Button variant="danger" onClick={onCloseLab} className="!px-3 !py-1.5 text-xs">
            🏁 연구소 마감
          </Button>
        </div>
      </div>
    </div>
  );
}
