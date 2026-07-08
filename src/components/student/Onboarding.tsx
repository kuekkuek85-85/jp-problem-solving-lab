"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { studentPath } from "@/lib/paths";
import { DIAGNOSTIC_QUESTIONS, ETHICS_PLEDGE_ITEMS, levelFromScore } from "@/lib/constants";
import { LEVEL_LABELS, type StudentDoc } from "@/lib/types";
import { Button, Card, LevelBadge } from "@/components/ui";

export function Onboarding({ sessionCode, student }: { sessionCode: string; student: StudentDoc }) {
  const [step, setStep] = useState<"diagnostic" | "ethics" | "ready">(student.diagnostic ? "ethics" : "diagnostic");
  const [answers, setAnswers] = useState<number[]>(Array(DIAGNOSTIC_QUESTIONS.length).fill(-1));
  const [checked, setChecked] = useState<boolean[]>(Array(ETHICS_PLEDGE_ITEMS.length).fill(false));
  const [saving, setSaving] = useState(false);

  async function submitDiagnostic() {
    if (answers.some((a) => a < 0)) return;
    setSaving(true);
    const score = answers.reduce((a, b) => a + b, 0);
    const level = levelFromScore(score);
    await updateDoc(doc(db, studentPath(sessionCode, student.studentId)), {
      diagnostic: { answers, score },
      level,
    });
    setSaving(false);
    setStep("ethics");
  }

  async function submitEthics() {
    if (!checked.every(Boolean)) return;
    setSaving(true);
    await updateDoc(doc(db, studentPath(sessionCode, student.studentId)), {
      ethicsPledge: { checkedAll: true, pledgedAt: Date.now() },
      badges: student.badges.includes("ready") ? student.badges : [...student.badges, "ready"],
    });
    setSaving(false);
    setStep("ready");
  }

  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-4 py-10">
      {step === "diagnostic" && (
        <Card>
          <h2 className="mb-1 text-lg font-black">연구원 등록 — 수준 자가 진단</h2>
          <p className="mb-5 text-sm text-slate-500">부담 갖지 말고 솔직하게 답해주세요. 등수나 비교는 없어요!</p>
          <div className="space-y-5">
            {DIAGNOSTIC_QUESTIONS.map((q, qi) => (
              <div key={q.id}>
                <p className="mb-2 text-sm font-bold text-slate-800">{q.text}</p>
                <div className="flex gap-2">
                  {q.options.map((opt, oi) => (
                    <button
                      key={oi}
                      onClick={() =>
                        setAnswers((prev) => prev.map((v, i) => (i === qi ? oi : v)))
                      }
                      className={`flex-1 rounded-lg border px-2 py-2 text-xs font-bold transition ${
                        answers[qi] === oi
                          ? "border-brand-soft bg-brand/5 text-brand-deep"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Button className="mt-6 w-full" disabled={saving || answers.some((a) => a < 0)} onClick={submitDiagnostic}>
            {saving ? "저장 중..." : "다음: AI 윤리 서약"}
          </Button>
        </Card>
      )}

      {step === "ethics" && (
        <Card>
          <h2 className="mb-1 text-lg font-black">AI 윤리 가이드 체크 서약</h2>
          <p className="mb-5 text-sm text-slate-500">하나씩 읽고 체크해주세요. 전부 체크해야 다음으로 갈 수 있어요.</p>
          <div className="space-y-3">
            {ETHICS_PLEDGE_ITEMS.map((item, i) => (
              <label
                key={i}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={checked[i]}
                  onChange={(e) => setChecked((prev) => prev.map((v, idx) => (idx === i ? e.target.checked : v)))}
                  className="mt-0.5 h-4 w-4"
                />
                <span className="text-sm text-slate-800">✅ {item}</span>
              </label>
            ))}
          </div>
          <Button className="mt-6 w-full" disabled={saving || !checked.every(Boolean)} onClick={submitEthics}>
            {saving ? "저장 중..." : "서약하고 연구원증 받기"}
          </Button>
        </Card>
      )}

      {step === "ready" && (
        <Card className="text-center">
          <div className="text-5xl">🎖️</div>
          <h2 className="mt-3 text-lg font-black">연구원증 발급 완료!</h2>
          <div className="mt-3 flex justify-center">
            <LevelBadge level={student.diagnostic ? levelFromScore(student.diagnostic.score) : "growing"} />
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {LEVEL_LABELS[student.diagnostic ? levelFromScore(student.diagnostic.score) : "growing"].tagline}
          </p>
          <p className="mt-4 text-sm text-slate-500">잠시 후 의뢰 게시판이 열려요. 선생님의 안내를 기다려주세요.</p>
        </Card>
      )}
    </main>
  );
}
