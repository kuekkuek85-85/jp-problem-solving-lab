"use client";

import { useEffect, useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { projectPath } from "@/lib/paths";
import { buildCanvaPrompt } from "@/lib/prompt-builder";
import { advanceProject } from "@/lib/actions";
import type { ProjectDoc, StudentDoc } from "@/lib/types";
import { Button, Card, Textarea } from "@/components/ui";
import { StampCelebration } from "./StampCelebration";

export function CodingStage({
  sessionCode,
  student,
  project,
}: {
  sessionCode: string;
  student: StudentDoc;
  project: ProjectDoc;
}) {
  const [notes, setNotes] = useState(project.codingNotes ?? "");
  const [copied, setCopied] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prompt = buildCanvaPrompt(project);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateDoc(doc(db, projectPath(sessionCode, student.studentId, project.id)), { codingNotes: notes }).catch(() => {});
    }, 1500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function markFirstDone() {
    await advanceProject({
      sessionCode,
      studentId: student.studentId,
      projectId: project.id,
      stamp: 4,
      nextStep: "submit",
      projectFields: { codingFirstDone: true },
    });
    setCelebrate(true);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-black">확정 설계도 요약</h2>
          <div className="space-y-2 text-sm">
            <p><span className="font-bold">의뢰:</span> {project.requestTitle}</p>
            <p><span className="font-bold">한 줄 소개:</span> {project.prd.oneLiner}</p>
            <p><span className="font-bold">핵심 기능:</span> {project.prd.coreFeatures.filter(Boolean).join(", ")}</p>
            <p><span className="font-bold">화면 구성:</span> {project.prd.screen}</p>
          </div>

          {project.grillme.questions.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="mb-1 text-xs font-bold text-slate-400">Grill Me 답변</p>
              <ul className="space-y-1 text-xs text-slate-600">
                {project.grillme.questions.map((q, i) => (
                  <li key={i}>
                    <span className="font-bold">Q.</span> {q.text} → {project.grillme.answers[i]}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="mb-2 font-black">캔바 코드 프롬프트</h3>
            <pre className="mb-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {prompt}
            </pre>
            <Button className="w-full" onClick={copyPrompt}>
              {copied ? "복사 완료! ✅" : "📋 프롬프트 복사하기"}
            </Button>
          </Card>

          <Card>
            <h3 className="mb-2 font-black">진행 메모장</h3>
            <Textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="캔바 코드로 작업하며 메모를 남겨보세요" />
          </Card>

          {!project.codingFirstDone ? (
            <Button className="w-full" onClick={markFirstDone}>
              1차 완성! 다음 단계로
            </Button>
          ) : (
            <Card className="bg-emerald-50 border-emerald-200 text-center text-sm font-bold text-emerald-700">
              1차 완성 체크됐어요. 계속 다듬은 뒤 해결안을 제출해주세요!
            </Card>
          )}
        </div>
      </div>

      {celebrate && <StampCelebration stamp={5} onDone={() => setCelebrate(false)} />}
    </main>
  );
}
