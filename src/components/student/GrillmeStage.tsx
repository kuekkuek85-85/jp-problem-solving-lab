"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { projectPath } from "@/lib/paths";
import { advanceProject } from "@/lib/actions";
import type { ProjectDoc, StudentDoc } from "@/lib/types";
import { Button, Card, Textarea } from "@/components/ui";
import { StampCelebration } from "./StampCelebration";

const TYPE_LABEL: Record<string, string> = { feature: "기능", data: "데이터", ethics: "윤리" };

export function GrillmeStage({
  sessionCode,
  student,
  project,
}: {
  sessionCode: string;
  student: StudentDoc;
  project: ProjectDoc;
}) {
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<string[]>(project.grillme.answers.length ? project.grillme.answers : []);
  const [celebrate, setCelebrate] = useState(false);
  const [error, setError] = useState("");

  const hasQuestions = project.grillme.questions.length > 0;

  async function startGrillme() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/grillme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionCode, studentId: student.studentId, projectId: project.id }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "그릴미 호출에 실패했어요.");
        return;
      }
      setAnswers(data.questions.map(() => ""));
    } finally {
      setLoading(false);
    }
  }

  function updateAnswer(i: number, value: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  }

  async function saveAnswers() {
    await updateDoc(doc(db, projectPath(sessionCode, student.studentId, project.id)), {
      "grillme.answers": answers,
    });
  }

  const allAnswered = hasQuestions && answers.length === project.grillme.questions.length && answers.every((a) => a.trim());

  async function submit() {
    if (!allAnswered) return;
    await saveAnswers();
    await advanceProject({
      sessionCode,
      studentId: student.studentId,
      projectId: project.id,
      stamp: 3,
      nextStep: "peer",
    });
    setCelebrate(true);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Card>
        <h2 className="mb-1 text-lg font-black">AI 그릴미 검토</h2>
        <p className="mb-5 text-sm text-slate-500">
          AI 코치가 내 설계도의 허점을 날카롭게 질문해요. (호출 {project.grillme.callCount}/2회 사용)
        </p>

        {!hasQuestions && (
          <Button className="w-full" onClick={startGrillme} disabled={loading || project.grillme.callCount >= 2}>
            {loading ? "그릴미 준비 중..." : "그릴미 시작"}
          </Button>
        )}

        {error && <p className="mt-2 text-sm font-bold text-red-600">{error}</p>}

        {hasQuestions && (
          <div className="space-y-5">
            {project.grillme.questions.map((q, i) => (
              <div key={i} className={`rounded-xl border p-4 ${q.type === "ethics" ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}>
                <div className="mb-2 flex items-center gap-2">
                  {q.type === "ethics" && <span title="윤리 질문">🛡️</span>}
                  <span className="text-xs font-bold text-slate-400">{TYPE_LABEL[q.type] ?? q.type}</span>
                </div>
                <p className="mb-2 font-bold text-slate-800">{q.text}</p>
                <Textarea rows={2} value={answers[i] ?? ""} onChange={(e) => updateAnswer(i, e.target.value)} placeholder="답변을 적어보세요" />
              </div>
            ))}

            <div className="flex gap-2">
              {project.grillme.callCount < 2 && (
                <Button variant="secondary" className="flex-1" onClick={startGrillme} disabled={loading}>
                  {loading ? "재도전 중..." : "다시 질문받기 (재도전)"}
                </Button>
              )}
              <Button className="flex-1" disabled={!allAnswered} onClick={submit}>
                답변 완료하고 다음 단계로
              </Button>
            </div>
          </div>
        )}
      </Card>

      {celebrate && <StampCelebration stamp={3} onDone={() => setCelebrate(false)} />}
    </main>
  );
}
