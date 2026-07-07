"use client";

import { useEffect, useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { projectPath } from "@/lib/paths";
import { advanceProject } from "@/lib/actions";
import type { PrdData, ProjectDoc, StudentDoc } from "@/lib/types";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
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
  // 답변(answer) → 설계도 다듬기(revise) 2단계 서브플로우
  const [phase, setPhase] = useState<"answer" | "revise">("answer");
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
        setError(data.error ?? "Grill Me 호출에 실패했어요.");
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

  async function goToRevise() {
    if (!allAnswered) return;
    await saveAnswers();
    setPhase("revise");
  }

  if (phase === "revise") {
    return (
      <ReviseStage
        sessionCode={sessionCode}
        student={student}
        project={project}
        answers={answers}
        onBack={() => setPhase("answer")}
        onDone={() => setCelebrate(true)}
        celebrate={celebrate}
        onCelebrateDone={() => setCelebrate(false)}
      />
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Card>
        <h2 className="mb-1 text-lg font-black">AI Grill Me 검토</h2>
        <p className="mb-5 text-sm text-slate-500">
          AI 코치가 내 설계도의 허점을 날카롭게 질문해요. 답변한 다음, 그 내용을 설계도에 반영할 거예요. (호출 {project.grillme.callCount}/2회 사용)
        </p>

        {!hasQuestions && (
          <Button className="w-full" onClick={startGrillme} disabled={loading || project.grillme.callCount >= 2}>
            {loading ? "Grill Me 준비 중..." : "Grill Me 시작"}
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
              <Button className="flex-1" disabled={!allAnswered} onClick={goToRevise}>
                답변 완료 → 설계도 다듬기
              </Button>
            </div>
          </div>
        )}
      </Card>

      {celebrate && <StampCelebration stamp={3} onDone={() => setCelebrate(false)} />}
    </main>
  );
}

// ── 답변을 바탕으로 설계도 핵심 항목을 학생이 직접 수정하는 단계 ──────────
function ReviseStage({
  sessionCode,
  student,
  project,
  answers,
  onBack,
  onDone,
  celebrate,
  onCelebrateDone,
}: {
  sessionCode: string;
  student: StudentDoc;
  project: ProjectDoc;
  answers: string[];
  onBack: () => void;
  onDone: () => void;
  celebrate: boolean;
  onCelebrateDone: () => void;
}) {
  const [prd, setPrd] = useState<PrdData>(project.prd);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 자동 저장(1.5초 디바운스) — 이탈해도 수정 내용이 유지되도록
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateDoc(doc(db, projectPath(sessionCode, student.studentId, project.id)), { prd }).catch(() => {});
    }, 1500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prd]);

  function setCore(i: number, value: string) {
    setPrd((prev) => {
      const next = [...prev.coreFeatures];
      next[i] = value;
      return { ...prev, coreFeatures: next };
    });
  }

  function setEthicsNote(key: "privacy" | "copyright" | "fairness", value: string) {
    setPrd((prev) => ({
      ...prev,
      ethicsCheck: { ...prev.ethicsCheck, [key]: { ...prev.ethicsCheck[key], note: value } },
    }));
  }

  async function finish() {
    setSaving(true);
    try {
      await advanceProject({
        sessionCode,
        studentId: student.studentId,
        projectId: project.id,
        stamp: 3,
        nextStep: "coding",
        projectFields: { prd },
      });
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Card>
        <h2 className="mb-1 text-lg font-black">설계도 다듬기</h2>
        <p className="mb-4 text-sm text-slate-500">
          Grill Me에서 답한 내용을 바탕으로 설계도를 조금 더 탄탄하게 고쳐보세요. 바뀐 설계도가 바이브 코딩에 그대로 쓰여요.
        </p>

        {/* 내 답변 참고 */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-xs font-bold text-slate-400">방금 내가 답한 내용</p>
          <ul className="space-y-2 text-sm text-slate-700">
            {project.grillme.questions.map((q, i) => (
              <li key={i}>
                <span className="font-bold">{q.type === "ethics" ? "🛡️ " : ""}Q.</span> {q.text}
                <div className="mt-0.5 text-slate-500">↳ {answers[i]}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <Field label="해결 아이디어 한 줄 소개">
            <Input value={prd.oneLiner} onChange={(e) => setPrd({ ...prd, oneLiner: e.target.value })} />
          </Field>

          <Field label="꼭 필요한 기능 3가지">
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Input key={i} value={prd.coreFeatures[i] ?? ""} onChange={(e) => setCore(i, e.target.value)} placeholder={`${i + 1}순위 기능`} />
              ))}
            </div>
          </Field>

          <Field label="저장할 정보">
            <Input value={prd.dataToStore} onChange={(e) => setPrd({ ...prd, dataToStore: e.target.value })} />
          </Field>

          <Field label="성공의 기준">
            <Input value={prd.successMetric} onChange={(e) => setPrd({ ...prd, successMetric: e.target.value })} />
          </Field>

          <Field label="지켜야 할 것 (윤리 체크 보완)">
            <div className="space-y-2">
              <Input value={prd.ethicsCheck.privacy.note} onChange={(e) => setEthicsNote("privacy", e.target.value)} placeholder="🔒 개인정보 — 어떻게 지킬까요?" />
              <Input value={prd.ethicsCheck.copyright.note} onChange={(e) => setEthicsNote("copyright", e.target.value)} placeholder="©️ 저작권 — 어떻게 지킬까요?" />
              <Input value={prd.ethicsCheck.fairness.note} onChange={(e) => setEthicsNote("fairness", e.target.value)} placeholder="🤝 공정성 — 어떻게 지킬까요?" />
            </div>
          </Field>
        </div>

        <div className="mt-6 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onBack} disabled={saving}>
            ← 답변 다시 보기
          </Button>
          <Button className="flex-1" onClick={finish} disabled={saving}>
            {saving ? "반영 중..." : "설계도 반영 완료 → 다음 단계"}
          </Button>
        </div>
      </Card>

      {celebrate && <StampCelebration stamp={3} onDone={onCelebrateDone} />}
    </main>
  );
}
