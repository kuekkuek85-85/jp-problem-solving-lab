"use client";

import { useEffect, useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { projectPath } from "@/lib/paths";
import { PRD_FIELDS, SEEDLING_PRD_TEMPLATE } from "@/lib/constants";
import { advanceProject } from "@/lib/actions";
import type { PrdData, ProjectDoc, StudentDoc } from "@/lib/types";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { StampCelebration } from "./StampCelebration";

const USER_OPTIONS = ["학생", "선생님", "학부모", "방문객", "기타"];

function withSeedlingDefaults(prd: PrdData): PrdData {
  if (prd.oneLiner) return prd; // 이미 시작했으면 그대로
  return {
    ...prd,
    oneLiner: SEEDLING_PRD_TEMPLATE.oneLiner,
    usersNote: SEEDLING_PRD_TEMPLATE.usersNote,
    niceToHave: SEEDLING_PRD_TEMPLATE.niceToHave,
    screen: SEEDLING_PRD_TEMPLATE.screen,
    dataToStore: SEEDLING_PRD_TEMPLATE.dataToStore,
    successMetric: SEEDLING_PRD_TEMPLATE.successMetric,
  };
}

export function PrdStage({
  sessionCode,
  student,
  project,
}: {
  sessionCode: string;
  student: StudentDoc;
  project: ProjectDoc;
}) {
  const [prd, setPrd] = useState<PrdData>(() =>
    student.level === "seedling" ? withSeedlingDefaults(project.prd) : project.prd
  );
  const [hints, setHints] = useState<Record<string, string>>({});
  const [hintLoading, setHintLoading] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function update<K extends keyof PrdData>(key: K, value: PrdData[K]) {
    setPrd((prev) => ({ ...prev, [key]: value }));
  }

  function toggleUser(name: string) {
    setPrd((prev) => ({
      ...prev,
      users: prev.users.includes(name) ? prev.users.filter((u) => u !== name) : [...prev.users, name],
    }));
  }

  async function fetchHint(fieldId: string) {
    setHintLoading(fieldId);
    try {
      const res = await fetch("/api/prd-hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionCode, studentId: student.studentId, projectId: project.id, fieldId }),
      });
      const data = await res.json();
      if (data.ok) setHints((prev) => ({ ...prev, [fieldId]: data.hint }));
    } finally {
      setHintLoading(null);
    }
  }

  const complete =
    prd.oneLiner.trim() &&
    prd.usersNote.trim() &&
    prd.coreFeatures.some((f) => f.trim()) &&
    prd.aiFeature.needed &&
    prd.screen.trim() &&
    prd.dataToStore.trim() &&
    prd.successMetric.trim() &&
    prd.ethicsCheck.privacy.checked &&
    prd.ethicsCheck.copyright.checked &&
    prd.ethicsCheck.fairness.checked;

  async function submit() {
    if (!complete) return;
    await advanceProject({
      sessionCode,
      studentId: student.studentId,
      projectId: project.id,
      stamp: 2,
      nextStep: "grillme",
      projectFields: { prd },
    });
    setCelebrate(true);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Card>
        <h2 className="mb-1 text-lg font-black">설계도 작성</h2>
        <p className="mb-5 text-sm text-slate-500">10개 항목을 채워 나만의 설계도를 완성해보세요.</p>

        <div className="space-y-6">
          <FieldWithHelp fieldId="problem" student={student} hints={hints} hintLoading={hintLoading} onHint={fetchHint}>
            <Field label="1. 문제 상황">
              <Textarea rows={2} value={prd.problem || project.analyze.what} readOnly className="bg-slate-50" />
            </Field>
          </FieldWithHelp>

          <FieldWithHelp fieldId="oneLiner" student={student} hints={hints} hintLoading={hintLoading} onHint={fetchHint}>
            <Field label="2. 해결 아이디어 한 줄 소개">
              <Input value={prd.oneLiner} onChange={(e) => update("oneLiner", e.target.value)} placeholder='"OO 하는 사람을 위한 OO 서비스"' />
            </Field>
          </FieldWithHelp>

          <FieldWithHelp fieldId="users" student={student} hints={hints} hintLoading={hintLoading} onHint={fetchHint}>
            <Field label="3. 사용하는 사람">
              <div className="mb-2 flex flex-wrap gap-2">
                {USER_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleUser(opt)}
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${
                      prd.users.includes(opt) ? "border-rose-400 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-500"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <Input value={prd.usersNote} onChange={(e) => update("usersNote", e.target.value)} placeholder="구체적으로 설명해주세요" />
            </Field>
          </FieldWithHelp>

          <FieldWithHelp fieldId="coreFeatures" student={student} hints={hints} hintLoading={hintLoading} onHint={fetchHint}>
            <Field label="4. 꼭 필요한 기능 3가지 (순위)">
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Input
                    key={i}
                    value={prd.coreFeatures[i] ?? ""}
                    onChange={(e) => {
                      const next = [...prd.coreFeatures];
                      next[i] = e.target.value;
                      update("coreFeatures", next);
                    }}
                    placeholder={`${i + 1}순위 기능`}
                  />
                ))}
              </div>
            </Field>
          </FieldWithHelp>

          <FieldWithHelp fieldId="niceToHave" student={student} hints={hints} hintLoading={hintLoading} onHint={fetchHint}>
            <Field label="5. 있으면 좋은 기능">
              <Input value={prd.niceToHave} onChange={(e) => update("niceToHave", e.target.value)} />
            </Field>
          </FieldWithHelp>

          <FieldWithHelp fieldId="aiFeature" student={student} hints={hints} hintLoading={hintLoading} onHint={fetchHint}>
            <Field label="6. AI 기능 넣기" hint="불필요도 정답일 수 있어요!">
              <div className="mb-2 flex gap-2">
                {(["yes", "no"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => update("aiFeature", { ...prd.aiFeature, needed: v })}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-bold ${
                      prd.aiFeature.needed === v ? "border-rose-400 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-500"
                    }`}
                  >
                    {v === "yes" ? "필요해요" : "불필요해요"}
                  </button>
                ))}
              </div>
              {prd.aiFeature.needed === "yes" && (
                <Input
                  value={prd.aiFeature.description}
                  onChange={(e) => update("aiFeature", { ...prd.aiFeature, description: e.target.value })}
                  placeholder="어떤 AI 기능인가요?"
                />
              )}
            </Field>
          </FieldWithHelp>

          <FieldWithHelp fieldId="screen" student={student} hints={hints} hintLoading={hintLoading} onHint={fetchHint}>
            <Field label="7. 화면 그리기">
              <Textarea rows={3} value={prd.screen} onChange={(e) => update("screen", e.target.value)} placeholder="화면 구성을 글로 설명해보세요" />
            </Field>
          </FieldWithHelp>

          <FieldWithHelp fieldId="dataToStore" student={student} hints={hints} hintLoading={hintLoading} onHint={fetchHint}>
            <Field label="8. 저장할 정보">
              <Input value={prd.dataToStore} onChange={(e) => update("dataToStore", e.target.value)} />
            </Field>
          </FieldWithHelp>

          <FieldWithHelp fieldId="successMetric" student={student} hints={hints} hintLoading={hintLoading} onHint={fetchHint}>
            <Field label="9. 성공의 기준">
              <Input value={prd.successMetric} onChange={(e) => update("successMetric", e.target.value)} />
            </Field>
          </FieldWithHelp>

          <FieldWithHelp fieldId="ethicsCheck" student={student} hints={hints} hintLoading={hintLoading} onHint={fetchHint}>
            <Field label="10. 지켜야 할 것 (윤리 체크)">
              <div className="space-y-3">
                {(
                  [
                    ["privacy", "🔒 개인정보"],
                    ["copyright", "©️ 저작권"],
                    ["fairness", "🤝 공정성"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="rounded-lg border border-slate-200 p-3">
                    <label className="flex items-center gap-2 text-sm font-bold">
                      <input
                        type="checkbox"
                        checked={prd.ethicsCheck[key].checked}
                        onChange={(e) =>
                          update("ethicsCheck", {
                            ...prd.ethicsCheck,
                            [key]: { ...prd.ethicsCheck[key], checked: e.target.checked },
                          })
                        }
                      />
                      {label} 확인했어요
                    </label>
                    <Input
                      className="mt-2"
                      value={prd.ethicsCheck[key].note}
                      onChange={(e) =>
                        update("ethicsCheck", {
                          ...prd.ethicsCheck,
                          [key]: { ...prd.ethicsCheck[key], note: e.target.value },
                        })
                      }
                      placeholder="어떻게 지킬 건가요?"
                    />
                  </div>
                ))}
              </div>
            </Field>
          </FieldWithHelp>
        </div>

        <Button className="mt-6 w-full" disabled={!complete} onClick={submit}>
          설계도 완성하고 다음 단계로
        </Button>
      </Card>

      {celebrate && <StampCelebration stamp={2} onDone={() => setCelebrate(false)} />}
    </main>
  );
}

function FieldWithHelp({
  fieldId,
  student,
  hints,
  hintLoading,
  onHint,
  children,
}: {
  fieldId: string;
  student: StudentDoc;
  hints: Record<string, string>;
  hintLoading: string | null;
  onHint: (fieldId: string) => void;
  children: React.ReactNode;
}) {
  const field = PRD_FIELDS.find((f) => f.id === fieldId)!;

  return (
    <div>
      {children}
      {student.level === "seedling" && (
        <div className="mt-1.5">
          <button
            type="button"
            onClick={() => onHint(fieldId)}
            disabled={hintLoading === fieldId}
            className="text-xs font-bold text-lime-700 hover:underline disabled:opacity-40"
          >
            {hintLoading === fieldId ? "AI 힌트 불러오는 중..." : "💡 AI 힌트 (최대 2회)"}
          </button>
          {hints[fieldId] && <p className="mt-1 rounded-lg bg-lime-50 p-2 text-xs text-lime-800">{hints[fieldId]}</p>}
        </div>
      )}
      {student.level === "growing" && <p className="mt-1 text-xs text-slate-400">💬 {field.hint}</p>}
      {student.level === "sharing" && <p className="mt-1 text-xs text-teal-600">🌳 {field.deepQuestion}</p>}
    </div>
  );
}
