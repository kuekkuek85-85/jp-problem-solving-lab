"use client";

import { useEffect, useRef, useState } from "react";
import type { ProjectDoc } from "@/lib/types";
import { Button, Card, Textarea } from "@/components/ui";

// 기획서(설계도) 기반으로 Gemini가 만든 Mermaid 플로우차트를 렌더하고, 피드백으로 다시 그린다.
export function FlowDiagram({
  sessionCode,
  studentId,
  project,
}: {
  sessionCode: string;
  studentId: string;
  project: ProjectDoc;
}) {
  const [code, setCode] = useState(project.flowMermaid ?? "");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 스냅샷으로 flowMermaid가 갱신되면 반영
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부(Firestore 스냅샷) 값 동기화
    if (project.flowMermaid && project.flowMermaid !== code) setCode(project.flowMermaid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.flowMermaid]);

  // code가 바뀌면 mermaid로 렌더
  useEffect(() => {
    if (!code || !containerRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          securityLevel: "loose",
          fontFamily: "inherit",
          themeVariables: { fontSize: "14px", lineColor: "#94a3b8", primaryBorderColor: "#cbd5e1" },
          flowchart: { curve: "basis", htmlLabels: true, padding: 14, nodeSpacing: 46, rankSpacing: 54, useMaxWidth: true },
        });
        const id = "flow-" + Math.random().toString(36).slice(2);
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          const el = containerRef.current.querySelector<SVGSVGElement>("svg");
          if (el) {
            el.removeAttribute("height");
            el.style.maxWidth = "100%";
            el.style.height = "auto";
          }
        }
      } catch {
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = '<p style="font-size:12px;color:#dc2626">다이어그램을 그리지 못했어요. 「다시 생성」을 눌러보세요.</p>';
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function generate(fb?: string) {
    setGenerating(true);
    setError("");
    setProgress(10);
    const timer = setInterval(() => setProgress((p) => Math.min(p + 7, 90)), 300);
    try {
      const res = await fetch("/api/flow-diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionCode, studentId, projectId: project.id, feedback: fb }),
      });
      const data = await res.json();
      if (data.ok && data.mermaid) {
        setCode(data.mermaid);
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
        <h3 className="font-black">📈 플로우 다이어그램</h3>
        <Button className="!px-4 !py-1.5 text-xs" disabled={generating} onClick={() => generate()}>
          {generating ? "그리는 중..." : code ? "🔄 다시 생성" : "✨ 기획서로 그리기"}
        </Button>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        지금까지 작성한 설계도를 바탕으로 <b>앱이 만들어졌다고 가정한 사용자 흐름</b>을 그려줘요. 보고 어색하면 피드백으로 다시 그릴 수 있어요.
      </p>

      {generating && (
        <div className="mb-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-soft to-violet-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-center text-xs text-slate-400">기획서를 읽고 흐름을 그리는 중이에요...</p>
        </div>
      )}

      {error && <p className="mb-2 text-sm font-bold text-red-600">{error}</p>}

      {code ? (
        <>
          <div ref={containerRef} className="flex justify-center overflow-x-auto rounded-xl border border-slate-200 bg-white p-3" />
          <div className="mt-2">
            {!showFeedback ? (
              <button className="text-xs font-bold text-brand underline" onClick={() => setShowFeedback(true)}>
                ✏️ 피드백으로 고치기
              </button>
            ) : (
              <div className="space-y-2">
                <Textarea
                  rows={2}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="예: 로그인 단계를 앞에 넣어줘 / 교사 화면 흐름도 추가해줘 / 더 간단하게"
                />
                <div className="flex gap-2">
                  <Button className="!px-4 !py-1.5 text-xs" disabled={generating || !feedback.trim()} onClick={() => generate(feedback)}>
                    피드백 반영해 다시 그리기
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
        !generating && <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-400">아직 다이어그램이 없어요. 위 「기획서로 그리기」를 눌러보세요.</p>
      )}
    </Card>
  );
}
