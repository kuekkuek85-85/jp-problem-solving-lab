"use client";

import { useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { studentPath } from "@/lib/paths";
import { useMyProjects, useProject, useSubmissions } from "@/lib/hooks";
import { STAGE_LABELS, type HelpRequestDoc, type Level, type ProjectStep, type StudentDoc } from "@/lib/types";
import { Card, LevelBadge, TrafficDot } from "@/components/ui";

const STEP_STATUS: Record<Exclude<ProjectStep, "done">, string> = {
  analyze: "의뢰 분석 중",
  prd: "설계도 작성 중",
  grillme: "Grill Me 검토 중",
  coding: "바이브 코딩 중",
  submit: "해결안 제출 중",
};

function statusText(s: StudentDoc): string {
  if (s.activeStep && s.activeStep !== "done") return STEP_STATUS[s.activeStep];
  if (s.stamps.includes(5)) return "해결안 제출 완료 · 새 의뢰 대기";
  if (!s.ethicsPledge.checkedAll) return "연구원 등록 중";
  return "의뢰 게시판에서 고르는 중";
}

export function RosterGrid({
  sessionCode,
  students,
  helpRequests,
}: {
  sessionCode: string;
  students: StudentDoc[];
  helpRequests: HelpRequestDoc[];
}) {
  const [selected, setSelected] = useState<StudentDoc | null>(null);
  const submissions = useSubmissions(sessionCode);

  // 연구원별 완료 의뢰(제출물) 집계 — 전체 제출물을 한 번에 구독해 학생 단위로 묶는다.
  const doneByStudent = useMemo(() => {
    const m = new Map<string, { requestTitle: string }[]>();
    for (const sub of submissions) {
      const list = m.get(sub.studentId) ?? [];
      list.push({ requestTitle: sub.requestTitle });
      m.set(sub.studentId, list);
    }
    return m;
  }, [submissions]);

  const sorted = useMemo(() => {
    return [...students].sort((a, b) => {
      const redA = a.trafficLight === "red" ? 0 : 1;
      const redB = b.trafficLight === "red" ? 0 : 1;
      if (redA !== redB) return redA - redB;
      return a.studentNo.localeCompare(b.studentNo);
    });
  }, [students]);

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((s) => {
          const openHelp = helpRequests.find((h) => h.requesterId === s.studentId && h.status !== "resolved");
          const done = doneByStudent.get(s.studentId) ?? [];
          const inProgress = s.activeProjectId ? 1 : 0;
          const total = done.length + inProgress;
          return (
            <button key={s.studentId} onClick={() => setSelected(s)} className="text-left">
              <Card
                className={`transition hover:shadow-md ${
                  s.trafficLight === "red" ? "border-red-300 bg-red-50" : openHelp ? "border-amber-300 bg-amber-50" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-black text-slate-900">
                    {s.studentNo} {s.name}
                  </div>
                  <TrafficDot light={s.trafficLight} />
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <LevelBadge level={s.level} />
                  {openHelp && <span className="text-xs font-bold text-amber-700">🙋 도움요청</span>}
                </div>
                <p className="mt-2 truncate text-xs font-bold text-slate-600">{statusText(s)}</p>

                {/* 이 연구원이 맡은 의뢰 묶음: 총 N개(진행 X · 완료 Y) */}
                <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px]">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-600">
                    🗂️ 의뢰 {total}개
                  </span>
                  {inProgress > 0 && <span className="rounded-full bg-sky-100 px-2 py-0.5 font-bold text-sky-700">진행 {inProgress}</span>}
                  {done.length > 0 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">완료 {done.length}</span>}
                </div>
                {done.length > 0 && (
                  <p className="mt-1 truncate text-[11px] text-slate-400">완료: {done.map((d) => d.requestTitle).join(", ")}</p>
                )}

                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={`h-1.5 flex-1 rounded-full ${s.stamps.includes(n) ? "bg-rose-400" : "bg-slate-200"}`} />
                  ))}
                </div>
              </Card>
            </button>
          );
        })}
      </div>

      {selected && (
        <StudentDetailModal
          sessionCode={sessionCode}
          student={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function StudentDetailModal({
  sessionCode,
  student,
  onClose,
}: {
  sessionCode: string;
  student: StudentDoc;
  onClose: () => void;
}) {
  const { project } = useProject(sessionCode, student.studentId, student.activeProjectId);
  const allProjects = useMyProjects(sessionCode, student.studentId);

  async function setLevel(level: Level) {
    await updateDoc(doc(db, studentPath(sessionCode, student.studentId)), { level });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black">
            {student.studentNo} {student.name} 연구원
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">코스 수동 변경:</span>
          {(["seedling", "growing", "sharing"] as Level[]).map((lv) => (
            <button
              key={lv}
              onClick={() => setLevel(lv)}
              className={`rounded-full border px-2 py-1 text-xs font-bold ${
                student.level === lv ? "border-rose-400 bg-rose-50 text-rose-600" : "border-slate-200 text-slate-500"
              }`}
            >
              <LevelBadge level={lv} />
            </button>
          ))}
        </div>

        {project ? (
          <div className="space-y-4 text-sm">
            <p className="font-bold text-slate-700">현재 진행 중: {project.requestTitle} ({STAGE_LABELS[project.currentStep === "done" ? "board" : project.currentStep]})</p>
            <Section title="의뢰 분석">
              <p>누가: {project.analyze.who}</p>
              <p>언제: {project.analyze.when}</p>
              <p>무엇 때문에: {project.analyze.what}</p>
              <p>좋아지는 점: {project.analyze.benefit}</p>
            </Section>
            <Section title="설계도">
              <p>한 줄 소개: {project.prd.oneLiner}</p>
              <p>핵심 기능: {project.prd.coreFeatures.filter(Boolean).join(", ")}</p>
              <p>AI 기능: {project.prd.aiFeature.needed === "yes" ? project.prd.aiFeature.description : "불필요"}</p>
            </Section>
            {project.grillme.questions.length > 0 && (
              <Section title="Grill Me 답변">
                {project.grillme.questions.map((q, i) => (
                  <p key={i}>
                    Q. {q.text} → {project.grillme.answers[i]}
                  </p>
                ))}
              </Section>
            )}
            {project.submission.url && (
              <Section title="제출된 산출물">
                <a href={project.submission.url} target="_blank" className="text-rose-500 underline">
                  {project.submission.url}
                </a>
                <p>{project.submission.oneLiner}</p>
              </Section>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">현재 진행 중인 의뢰가 없어요.</p>
        )}

        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="mb-2 text-xs font-bold text-slate-400">맡은 의뢰 {allProjects.length}건</p>
          <div className="space-y-1">
            {allProjects.length === 0 && <p className="text-sm text-slate-400">아직 맡은 의뢰가 없어요.</p>}
            {allProjects.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="truncate font-bold text-slate-700">{p.requestTitle}</span>
                {p.currentStep === "done" ? (
                  <span className="shrink-0 text-xs font-bold text-emerald-600">✅ 완료</span>
                ) : (
                  <span className="shrink-0 text-xs font-bold text-sky-600">진행 중 · {STAGE_LABELS[p.currentStep]}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="mb-1 text-xs font-bold text-slate-400">{title}</p>
      <div className="space-y-0.5 text-slate-700">{children}</div>
    </div>
  );
}
