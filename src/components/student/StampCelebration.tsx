"use client";

import { useEffect } from "react";
import { STAMP_LABELS } from "@/lib/constants";

export function StampCelebration({ stamp, allDone, onDone }: { stamp: number; allDone?: boolean; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1600);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50">
      <div className="animate-bounce text-7xl">🏅</div>
      <p className="mt-4 text-xl font-black text-white">{STAMP_LABELS[stamp]} 스탬프 획득!</p>
      {allDone && <p className="mt-1 text-sm font-bold text-amber-300">✨ 모든 스탬프 완성! ✨</p>}
    </div>
  );
}
