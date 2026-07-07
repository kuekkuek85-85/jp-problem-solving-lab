"use client";

import { useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { studentPath } from "@/lib/paths";
import { useMyProjects, useProject } from "@/lib/hooks";
import { STAGE_LABELS, type HelpRequestDoc, type Level, type StudentDoc } from "@/lib/types";
import { Card, LevelBadge, TrafficDot } from "@/components/ui";

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
                <p className="mt-2 truncate text-xs text-slate-500">{s.activeRequestId ? "의뢰 진행 중" : "게시판 대기"}</p>
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
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
              <Section title="그릴미 답변">
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
          <p className="mb-1 text-xs font-bold text-slate-400">누적 프로젝트 {allProjects.length}건</p>
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
