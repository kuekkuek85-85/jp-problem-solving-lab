"use client";

import { useState } from "react";
import type { SessionDoc, Slide } from "@/lib/types";
import { SEED_SLIDES } from "@/lib/constants";
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

  async function loadDefaults() {
    if (!confirm("현재 슬라이드를 기본 안내 슬라이드(단계별 전체)로 교체할까요? 편집한 내용은 사라져요.")) return;
    const defaults = SEED_SLIDES.map((markdown, index) => ({ index, markdown }));
    setSlides(defaults);
    setSaving(true);
    try {
      await call({ slides: defaults, currentSlideIndex: 0 });
    } finally {
      setSaving(false);
    }
  }

  const currentMarkdown = slides.find((s) => s.index === session.currentSlideIndex)?.markdown ?? slides[0]?.markdown ?? "";

  return (
    <div className="space-y-4">
      <Card>
        {!session.lectureMode ? (
          <div className="flex flex-col gap-2">
            <p className="font-bold">브리핑 발표</p>
            <p className="text-sm text-slate-500">
              브리핑을 시작하면 <b>모든 학생 화면이 이 슬라이드로 동기화</b>돼요. 끝내면 학생은 다시 활동 화면으로 돌아가요.
            </p>
            <Button className="w-full" onClick={() => call({ lectureMode: true, currentSlideIndex: 0 })}>
              🎤 브리핑 시작 (학생 화면 동기화)
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">
                🔴 브리핑 중 · 학생 화면 동기화
              </span>
              <Button variant="danger" className="!px-3 !py-1.5 text-xs" onClick={() => call({ lectureMode: false })}>
                브리핑 끝내기
              </Button>
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
            <div className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {currentMarkdown}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="font-bold">슬라이드 ({slides.length}장)</p>
          <Button variant="secondary" className="!px-3 !py-1.5 text-xs" disabled={saving} onClick={loadDefaults}>
            ↺ 기본 안내 슬라이드 불러오기
          </Button>
        </div>
        <p className="mb-3 text-xs text-slate-500">단계별 안내 슬라이드가 미리 준비돼 있어요. 그대로 브리핑해도 되고, 필요하면 수정·추가하세요.</p>
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
