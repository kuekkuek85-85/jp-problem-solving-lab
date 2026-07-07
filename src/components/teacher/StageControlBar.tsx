"use client";

import { useState } from "react";
import type { SessionDoc, Stage } from "@/lib/types";
import { Button } from "@/components/ui";

// 순차 단계 제어는 제거하고, 교사는 전체 관리 액션(해결 보고회·연구소 마감)만 수행한다.
// 브리핑은 "브리핑 슬라이드" 탭에서 켜고 끈다.
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

  return (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔬🤖</span>
          <span className="text-lg font-black text-slate-900">장평 문제해결연구소</span>
        </div>

        <div className="ml-auto flex flex-wrap gap-2">
          {session.currentStage === "gallery" || session.currentStage === "closing" ? (
            <Button variant="secondary" disabled={busy} onClick={() => setStage("board")} className="!px-3 !py-1.5 text-xs">
              ◀ 활동으로 돌아가기
            </Button>
          ) : (
            <Button variant="secondary" disabled={busy} onClick={() => setStage("gallery")} className="!px-3 !py-1.5 text-xs">
              🏆 해결 보고회 열기
            </Button>
          )}

          {session.currentStage !== "closing" && (
            <Button variant="danger" onClick={onCloseLab} className="!px-3 !py-1.5 text-xs">
              🏁 연구소 마감
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
