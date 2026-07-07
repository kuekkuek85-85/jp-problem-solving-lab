"use client";

import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { reflectionPath } from "@/lib/paths";
import { useMyProjects, useReflection } from "@/lib/hooks";
import { REFLECTION_QUESTIONS } from "@/lib/constants";
import type { StudentDoc } from "@/lib/types";
import { Button, Card, Textarea } from "@/components/ui";
import { Certificate } from "./Certificate";

export function ClosingStage({ sessionCode, student }: { sessionCode: string; student: StudentDoc }) {
  const projects = useMyProjects(sessionCode, student.studentId);
  const { reflection, loading } = useReflection(sessionCode, student.studentId);
  const [answers, setAnswers] = useState<Record<string, string>>({ proud: "", hard: "", aiLiteracy: "", next: "" });
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const allFilled = REFLECTION_QUESTIONS.every((q) => answers[q.id]?.trim());

  async function submit() {
    if (!allFilled) return;
    setSaving(true);
    try {
      await setDoc(doc(db, reflectionPath(sessionCode, student.studentId)), {
        studentId: student.studentId,
        proud: answers.proud,
        hard: answers.hard,
        aiLiteracy: answers.aiLiteracy,
        next: answers.next,
        submittedAt: Date.now(),
      });
      setSubmitted(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <div className="no-print">
        <h2 className="mb-3 text-lg font-black">🎓 연구소 마감 — 수료증</h2>
        <Certificate student={student} projects={projects} />
        <Button className="mt-4" onClick={() => window.print()}>
          🖨️ 수료증 인쇄하기
        </Button>
      </div>

      <div className="print-only">
        <Certificate student={student} projects={projects} />
      </div>

      <Card className="no-print">
        <h3 className="mb-1 font-black">성찰 후기</h3>
        {!loading && (reflection || submitted) ? (
          <p className="text-sm text-slate-500">이미 성찰 후기를 제출했어요. 참여해줘서 고마워요!</p>
        ) : (
          <div className="space-y-4">
            {REFLECTION_QUESTIONS.map((q) => (
              <div key={q.id}>
                <label className="mb-1 block text-sm font-bold text-slate-800">{q.label}</label>
                <Textarea
                  rows={2}
                  value={answers[q.id]}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                />
              </div>
            ))}
            <Button className="w-full" disabled={!allFilled || saving} onClick={submit}>
              {saving ? "제출 중..." : "성찰 후기 제출하기"}
            </Button>
          </div>
        )}
      </Card>
    </main>
  );
}
