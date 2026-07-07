"use client";

import { useState } from "react";
import type { SessionDoc, Slide } from "@/lib/types";
import { Button, Card, Textarea } from "@/components/ui";

export function SlidesPanel({ sessionCode, pin, session }: { sessionCode: string; pin: string; session: SessionDoc }) {
  const [slides, setSlides] = useState<Slide[]>(session.slides);
  const [saving, setSaving] = useState(false);

  async function call(body: Record<string, unknown>) {
    await fetch("/api/teacher/lecture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionCode, pin, ...body }),
    });
  }

  async function saveSlides() {
    setSaving(true);
    try {
      await call({ slides });
    } finally {
      setSaving(false);
    }
  }

  function updateSlide(i: number, markdown: string) {
    setSlides((prev) => prev.map((s, idx) => (idx === i ? { ...s, markdown } : s)));
  }

  function addSlide() {
    setSlides((prev) => [...prev, { index: prev.length, markdown: "" }]);
  }

  function removeSlide(i: number) {
    setSlides((prev) => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, index: idx })));
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-bold">브리핑 발표 제어</p>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={session.lectureMode}
              onChange={(e) => call({ lectureMode: e.target.checked })}
            />
            학생 화면 강제 동기화
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="!px-3 !py-1.5 text-xs"
            disabled={session.currentSlideIndex <= 0}
            onClick={() => call({ currentSlideIndex: session.currentSlideIndex - 1 })}
          >
            ← 이전
          </Button>
          <span className="text-sm font-bold">
            {session.currentSlideIndex + 1} / {slides.length}
          </span>
          <Button
            variant="secondary"
            className="!px-3 !py-1.5 text-xs"
            disabled={session.currentSlideIndex >= slides.length - 1}
            onClick={() => call({ currentSlideIndex: session.currentSlideIndex + 1 })}
          >
            다음 →
          </Button>
        </div>
      </Card>

      <Card>
        <p className="mb-3 font-bold">슬라이드 편집 (마크다운)</p>
        <div className="space-y-3">
          {slides.map((s, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">슬라이드 {i + 1}</span>
                <button onClick={() => removeSlide(i)} className="text-xs font-bold text-red-500">
                  삭제
                </button>
              </div>
              <Textarea rows={3} value={s.markdown} onChange={(e) => updateSlide(i, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" className="flex-1 text-xs" onClick={addSlide}>
            + 슬라이드 추가
          </Button>
          <Button className="flex-1 text-xs" disabled={saving} onClick={saveSlides}>
            {saving ? "저장 중..." : "슬라이드 저장"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
