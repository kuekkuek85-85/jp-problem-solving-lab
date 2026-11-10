"use client";

import { useEffect, useRef, useState } from "react";
import type { ProjectDoc } from "@/lib/types";
import { Button, Card, Textarea } from "@/components/ui";

// '저장할 정보' 기반으로 Gemini가 만든 Mermaid erDiagram(데이터 스키마)을 렌더하고, 피드백으로 다시 그린다.
export function SchemaDiagram({
  sessionCode,
  studentId,
  project,
}: {
  sessionCode: string;
  studentId: string;
  project: ProjectDoc;
}) {
  const [code, setCode] = useState(project.schemaMermaid ?? "");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 스냅샷으로 schemaMermaid가 갱신되면 반영
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부(Firestore 스냅샷) 값 동기화
    if (project.schemaMermaid && project.schemaMermaid !== code) setCode(project.schemaMermaid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.schemaMermaid]);

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
          themeVariables: {
            fontSize: "13px",
            lineColor: "#94a3b8",
            primaryColor: "#eef2f7",
            primaryBorderColor: "#64748b",
            primaryTextColor: "#2a3647",
          },
          er: { useMaxWidth: true, entityPadding: 10 },
        });
        const id = "schema-" + Math.random().toString(36).slice(2);
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
          containerRef.current.innerHTML = '<p style="font-size:12px;color:#dc2626">스키마를 그리지 못했어요. 「다시 생성」을 눌러보세요.</p>';
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
      const res = await fetch("/api/schema-diagram", {
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
        <h3 className="font-black">🗄️ 데이터 스키마</h3>
        <Button className="!px-4 !py-1.5 text-xs" disabled={generating} onClick={() => generate()}>
          {generating ? "그리는 중..." : code ? "🔄 다시 생성" : "✨ 저장 정보로 그리기"}
        </Button>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        앱이 <b>저장해야 할 정보</b>를 표(테이블)와 관계로 설계해줘요. DB가 필요한 앱이라면 이 구조를 코딩 때 그대로 쓸 수 있어요.
      </p>

      {generating && (
        <div className="mb-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-gradient-to-r from-slate-400 to-slate-600 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-center text-xs text-slate-400">저장할 정보를 읽고 테이블을 설계하는 중이에요...</p>
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
                  placeholder="예: 댓글 테이블을 추가해줘 / 사용자와 게시글을 연결해줘 / 더 단순하게"
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
        !generating && <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-400">아직 스키마가 없어요. 위 「저장 정보로 그리기」를 눌러보세요.</p>
      )}
    </Card>
  );
}
