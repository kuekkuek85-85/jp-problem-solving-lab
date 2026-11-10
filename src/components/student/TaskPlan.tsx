"use client";

import { useEffect, useState } from "react";
import type { ImplTask, ProjectDoc } from "@/lib/types";
import { Button, Card, Textarea } from "@/components/ui";

// 설계도 기반으로 AI가 쪼갠 '구현 태스크'를 보여주고, 피드백으로 다시 쪼갠다.
export function TaskPlan({
  sessionCode,
  studentId,
  project,
}: {
  sessionCode: string;
  studentId: string;
  project: ProjectDoc;
}) {
  const [tasks, setTasks] = useState<ImplTask[]>(project.tasks ?? []);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  // 스냅샷으로 tasks가 갱신되면 반영
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부(Firestore 스냅샷) 값 동기화
    if (project.tasks) setTasks(project.tasks);
  }, [project.tasks]);

  async function generate(fb?: string) {
    setGenerating(true);
    setError("");
    setProgress(10);
    const timer = setInterval(() => setProgress((p) => Math.min(p + 7, 90)), 300);
    try {
      const res = await fetch("/api/task-breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionCode, studentId, projectId: project.id, feedback: fb }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
        setFeedback("");
        setShowFeedback(false);
      } else {
        setError(data.error ?? "생성에 실패했어요.");
      }
    } catch {
      setError("네트워크 오류가 발생했어요. 다시 시도해주세요.");
    } finally {
      clearInterval(timer);
      setProgress(100);
      setGenerating(false);
      setTimeout(() => setProgress(0), 600);
    }
  }

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-black">📋 구현 태스크</h3>
        <Button className="!px-4 !py-1.5 text-xs" disabled={generating} onClick={() => generate()}>
          {generating ? "쪼개는 중..." : tasks.length ? "🔄 다시 쪼개기" : "✨ 태스크로 쪼개기"}
        </Button>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        한 번에 다 만들지 않고 <b>작동하는 것부터 하나씩</b> 쌓아요. 각 태스크는 <b>구현 → 1차 자가점검 → 2차 인간 점검</b> 순서로 진행합니다.
      </p>

      {generating && (
        <div className="mb-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-soft to-violet-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-center text-xs text-slate-400">설계를 읽고 구현 순서를 짜는 중이에요...</p>
        </div>
      )}

      {error && <p className="mb-2 text-sm font-bold text-red-600">{error}</p>}

      {tasks.length > 0 ? (
        <>
          <ol className="space-y-2">
            {tasks.map((t, i) => (
              <li key={t.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-soft/15 text-xs font-black text-brand">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800">{t.title}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{t.detail}</p>
                    {t.checks?.length > 0 && (
                      <div className="mt-1.5 rounded-lg bg-emerald-50 p-2">
                        <p className="mb-0.5 text-[11px] font-bold text-emerald-700">✅ 검증 기준 (1차 자가 · 2차 사람)</p>
                        <ul className="space-y-0.5 text-xs text-emerald-800">
                          {t.checks.map((c, ci) => (
                            <li key={ci} className="flex gap-1.5">
                              <span className="flex-none">☐</span>
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-2">
            {!showFeedback ? (
              <button className="text-xs font-bold text-brand underline" onClick={() => setShowFeedback(true)}>
                ✏️ 피드백으로 다시 쪼개기
              </button>
            ) : (
              <div className="space-y-2">
                <Textarea
                  rows={2}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="예: 로그인 태스크를 맨 앞에 / 더 잘게 쪼개줘 / 발표용 정리 태스크 추가"
                />
                <div className="flex gap-2">
                  <Button className="!px-4 !py-1.5 text-xs" disabled={generating || !feedback.trim()} onClick={() => generate(feedback)}>
                    피드백 반영해 다시 쪼개기
                  </Button>
                  <button className="text-xs text-slate-400" onClick={() => setShowFeedback(false)}>
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        !generating && (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-400">
            아직 태스크가 없어요. 위 「태스크로 쪼개기」를 눌러보세요.
          </p>
        )
      )}
    </Card>
  );
}
