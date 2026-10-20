"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { studentPath } from "@/lib/paths";
import {
  DIAGNOSTIC_QUESTIONS,
  ETHICS_PLEDGE_ITEMS,
  TRAINING_TOOLS,
  VIBE_CODING_ONELINE,
  levelFromScore,
  levelFromSurvey,
} from "@/lib/constants";
import { LEVEL_LABELS, type StudentDoc } from "@/lib/types";
import { Button, Card, Input, LevelBadge, Textarea } from "@/components/ui";

export function Onboarding({ sessionCode, student }: { sessionCode: string; student: StudentDoc }) {
  // 이름으로 입장한 교사 연수 참가자는 사전 설문(survey), 학생은 기존 자가진단(diagnostic)을 거친다.
  const isTraining = student.studentId.startsWith("edu-");
  const firstDone = isTraining ? !!student.trainingSurvey : !!student.diagnostic;
  const [step, setStep] = useState<"intro" | "ethics" | "ready">(firstDone ? "ethics" : "intro");

  // 학생 자가진단
  const [answers, setAnswers] = useState<number[]>(Array(DIAGNOSTIC_QUESTIONS.length).fill(-1));
  // 연수 설문
  const [tools, setTools] = useState<string[]>([]);
  const [toolsOther, setToolsOther] = useState("");
  const [vibeExperience, setVibeExperience] = useState<"yes" | "no" | "">("");
  const [vibeApps, setVibeApps] = useState("");
  const [workIdea, setWorkIdea] = useState("");
  const [antiOutsourcing, setAntiOutsourcing] = useState("");

  const [checked, setChecked] = useState<boolean[]>(Array(ETHICS_PLEDGE_ITEMS.length).fill(false));
  const [saving, setSaving] = useState(false);

  function toggleTool(t: string) {
    setTools((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function submitDiagnostic() {
    if (answers.some((a) => a < 0)) return;
    setSaving(true);
    const score = answers.reduce((a, b) => a + b, 0);
    await updateDoc(doc(db, studentPath(sessionCode, student.studentId)), {
      diagnostic: { answers, score },
      level: levelFromScore(score),
    });
    setSaving(false);
    setStep("ethics");
  }

  const surveyComplete = !!vibeExperience && !!workIdea.trim();
  async function submitSurvey() {
    if (!surveyComplete) return;
    setSaving(true);
    const survey = {
      tools,
      toolsOther: toolsOther.trim(),
      vibeExperience: vibeExperience as "yes" | "no",
      vibeApps: vibeExperience === "yes" ? vibeApps.trim() : "",
      workIdea: workIdea.trim(),
      antiOutsourcing: antiOutsourcing.trim(),
      submittedAt: Date.now(),
    };
    await updateDoc(doc(db, studentPath(sessionCode, student.studentId)), {
      trainingSurvey: survey,
      level: levelFromSurvey(survey),
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
      {step === "intro" && !isTraining && (
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
                      onClick={() => setAnswers((prev) => prev.map((v, i) => (i === qi ? oi : v)))}
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

      {step === "intro" && isTraining && (
        <Card>
          <h2 className="mb-1 text-lg font-black">연수 참가자 등록 — 사전 설문</h2>
          <p className="mb-5 text-sm text-slate-500">간단한 사전 설문이에요. 편하게 답해주세요.</p>

          <div className="space-y-6">
            <div>
              <p className="mb-2 text-sm font-bold text-slate-800">1. 사용해 본 도구를 모두 골라 주세요. (복수 선택 가능)</p>
              <div className="flex flex-wrap gap-2">
                {TRAINING_TOOLS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTool(t)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      tools.includes(t)
                        ? "border-brand-soft bg-brand/5 text-brand-deep"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {tools.includes(t) ? "✓ " : ""}
                    {t}
                  </button>
                ))}
              </div>
              <Input
                className="mt-2"
                value={toolsOther}
                onChange={(e) => setToolsOther(e.target.value)}
                placeholder="기타 — 사용해 본 다른 도구를 적어주세요 (선택)"
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-bold text-slate-800">2. 바이브 코딩을 해 본 적 있나요?</p>
              <div className="flex gap-2">
                {(["yes", "no"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVibeExperience(v)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-bold transition ${
                      vibeExperience === v
                        ? "border-brand-soft bg-brand/5 text-brand-deep"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {v === "yes" ? "있다" : "없다"}
                  </button>
                ))}
              </div>
            </div>

            {vibeExperience === "yes" && (
              <div>
                <p className="mb-2 text-sm font-bold text-slate-800">3. 바이브 코딩으로 만들어 본 앱을 적어 주세요.</p>
                <Textarea
                  rows={2}
                  value={vibeApps}
                  onChange={(e) => setVibeApps(e.target.value)}
                  placeholder="콤마(,)로 여러 개 작성 가능 — 예: 설문 집계 앱, 좌석 배치 도구"
                />
              </div>
            )}

            <div>
              <p className="mb-1 text-sm font-bold text-slate-800">4. 오늘 바이브 코딩으로 만들고 싶은 업무 아이디어를 적어 주세요.</p>
              <p className="mb-2 text-xs text-slate-400">💡 {VIBE_CODING_ONELINE}</p>
              <Textarea
                rows={3}
                value={workIdea}
                onChange={(e) => setWorkIdea(e.target.value)}
                placeholder="예: 가정통신문 회신을 자동 집계하는 간단한 웹"
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-bold text-slate-800">
                5. 학생들이 생성형 AI를 사용할 때, 사고의 외주화를 막기 위해 어떤 노력을 하나요?{" "}
                <span className="font-normal text-slate-400">(선택)</span>
              </p>
              <Textarea
                rows={2}
                value={antiOutsourcing}
                onChange={(e) => setAntiOutsourcing(e.target.value)}
                placeholder="평소 수업에서의 생각이나 방법을 자유롭게 적어주세요 (선택)"
              />
            </div>
          </div>

          <Button className="mt-6 w-full" disabled={saving || !surveyComplete} onClick={submitSurvey}>
            {saving ? "저장 중..." : "다음: AI 윤리 서약"}
          </Button>
          {!surveyComplete && <p className="mt-2 text-center text-xs text-slate-400">2번과 4번은 꼭 답해주세요.</p>}
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
            <LevelBadge level={student.level} />
          </div>
          <p className="mt-3 text-sm text-slate-500">{LEVEL_LABELS[student.level].tagline}</p>
          <p className="mt-4 text-sm text-slate-500">잠시 후 의뢰 게시판이 열려요. 선생님의 안내를 기다려주세요.</p>
        </Card>
      )}
    </main>
  );
}
