"use client";

import { useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { studentPath } from "@/lib/paths";
import { TRAINING_LAB_ID } from "@/lib/constants";
import { useMyProjects, useSubmissions } from "@/lib/hooks";
import { STAGE_LABELS, type HelpRequestDoc, type Level, type ProjectDoc, type ProjectStep, type StudentDoc } from "@/lib/types";
import { Card, LevelBadge, TrafficDot } from "@/components/ui";
import { HtmlArtifactButton } from "@/components/HtmlArtifact";

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
  pin,
  students,
  helpRequests,
}: {
  sessionCode: string;
  pin: string;
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
                    <span key={n} className={`h-1.5 flex-1 rounded-full ${s.stamps.includes(n) ? "bg-brand-soft" : "bg-slate-200"}`} />
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
          pin={pin}
          student={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function StudentDetailModal({
  sessionCode,
  pin,
  student,
  onClose,
}: {
  sessionCode: string;
  pin: string;
  student: StudentDoc;
  onClose: () => void;
}) {
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
                student.level === lv ? "border-brand-soft bg-brand/5 text-brand-deep" : "border-slate-200 text-slate-500"
              }`}
            >
              <LevelBadge level={lv} />
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400">맡은 의뢰 {allProjects.length}건 — 과정별 보기</p>
          {allProjects.length === 0 ? (
            <p className="text-sm text-slate-400">아직 맡은 의뢰가 없어요.</p>
          ) : (
            allProjects.map((p) => <ProjectProcess key={p.id} project={p} />)
          )}
        </div>

        {student.trainingSurvey && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
            <p className="mb-2 text-xs font-bold text-amber-700">🧑‍🏫 연수 사전 설문</p>
            <div className="space-y-1 text-slate-700">
              <p>
                <b>사용 도구:</b>{" "}
                {[...student.trainingSurvey.tools, student.trainingSurvey.toolsOther].filter(Boolean).join(", ") || "없음"}
              </p>
              <p><b>바이브 코딩 경험:</b> {student.trainingSurvey.vibeExperience === "yes" ? "있다" : "없다"}</p>
              {student.trainingSurvey.vibeApps && <p><b>만들어 본 앱:</b> {student.trainingSurvey.vibeApps}</p>}
              <p><b>오늘 만들고 싶은 것:</b> {student.trainingSurvey.workIdea}</p>
              {student.trainingSurvey.antiOutsourcing && (
                <p><b>사고의 외주화 방지 노력:</b> {student.trainingSurvey.antiOutsourcing}</p>
              )}
            </div>
          </div>
        )}

        <RecordDraft sessionCode={sessionCode} pin={pin} studentId={student.studentId} />
      </div>
    </div>
  );
}

function RecordDraft({ sessionCode, pin, studentId }: { sessionCode: string; pin: string; studentId: string }) {
  const training = sessionCode === TRAINING_LAB_ID;
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [basis, setBasis] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError("");
    setCopied(false);
    try {
      const res = await fetch("/api/teacher/record-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionCode, pin, studentId }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "생성에 실패했어요.");
        return;
      }
      setDraft(data.draft ?? "");
      setBasis(Array.isArray(data.basis) ? data.basis : []);
    } catch {
      setError("네트워크 오류로 생성에 실패했어요.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const [sent, setSent] = useState(false);
  async function sendToParticipant() {
    if (!draft.trim()) return;
    await updateDoc(doc(db, studentPath(sessionCode, studentId)), {
      instructorFeedback: { text: draft.trim(), sentAt: Date.now() },
    });
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  }

  return (
    <div className="mt-4 rounded-lg border border-brand-soft/40 bg-brand/5 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-black text-brand-deep">✍️ {training ? "선생님 피드백 초안" : "생기부 문구 초안"}</p>
        <button
          onClick={generate}
          disabled={loading}
          className="rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
        >
          {loading ? "생성 중..." : draft ? "다시 생성" : "초안 생성"}
        </button>
      </div>
      <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
        {training ? (
          <>
            참가 선생님의 활동을 근거로 강사(이승엽)가 드리는 <b>피드백 초안</b>이에요.
            <b> 보내기 전에 확인하고 다듬어</b> 사용하세요.
          </>
        ) : (
          <>
            학생 활동을 근거로 만든 <b>참고용 초안</b>이에요. 상표명은 일반명사로, 명사형 종결(~함)로 작성되며 개인정보는 제외됩니다.
            <b> 반드시 교사가 사실을 확인하고 다듬어</b> 사용하세요.
          </>
        )}
      </p>

      {error && <p className="mb-2 text-xs font-bold text-red-600">{error}</p>}

      {draft && (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={7}
            className="w-full rounded-lg border border-slate-200 p-2 text-sm leading-relaxed text-slate-800 outline-none focus:border-brand-soft"
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">{draft.replace(/\s/g, "").length}자 (공백 제외)</span>
            <div className="flex gap-1.5">
              {training && (
                <button onClick={sendToParticipant} className="rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">
                  {sent ? "전송 완료! ✅" : "📣 참가자에게 보내기"}
                </button>
              )}
              <button onClick={copy} className="rounded-full bg-ink-deep px-3 py-1 text-xs font-bold text-white">
                {copied ? "복사 완료! ✅" : "📋 복사"}
              </button>
            </div>
          </div>
          {training && (
            <p className="mt-1 text-[11px] text-slate-400">‘보내기’를 누르면 해당 선생님 화면(해결 보고회)에 ‘강사 피드백’으로 표시돼요.</p>
          )}
          {basis.length > 0 && (
            <div className="mt-2 border-t border-brand-soft/30 pt-2">
              <p className="mb-1 text-[11px] font-bold text-slate-400">반영한 활동 근거(검토용)</p>
              <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-slate-500">
                {basis.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProjectProcess({ project }: { project: ProjectDoc }) {
  const a = project.analyze ?? ({} as ProjectDoc["analyze"]);
  const prd = project.prd ?? ({} as ProjectDoc["prd"]);
  const core = (prd.coreFeatures ?? []).filter(Boolean);
  const gq = project.grillme?.questions ?? [];
  const ga = project.grillme?.answers ?? [];
  const ethics = [
    prd.ethicsCheck?.privacy?.note && `개인정보: ${prd.ethicsCheck.privacy.note}`,
    prd.ethicsCheck?.copyright?.note && `저작권: ${prd.ethicsCheck.copyright.note}`,
    prd.ethicsCheck?.fairness?.note && `공정성: ${prd.ethicsCheck.fairness.note}`,
  ].filter(Boolean) as string[];
  const done = project.currentStep === "done";

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="mb-2 font-black text-slate-800">
        {project.requestTitle}{" "}
        {done ? (
          <span className="text-xs font-bold text-emerald-600">✅ 완료</span>
        ) : (
          <span className="text-xs font-bold text-sky-600">진행 중 · {STAGE_LABELS[project.currentStep === "done" ? "submit" : project.currentStep]}</span>
        )}
      </p>
      <div className="space-y-3 text-sm">
        {(a.who || a.when || a.what || a.benefit) && (
          <Section title="① 의뢰 분석">
            {a.who && <p>누가: {a.who}</p>}
            {a.when && <p>언제: {a.when}</p>}
            {a.what && <p>무엇 때문에: {a.what}</p>}
            {a.benefit && <p>좋아지는 점: {a.benefit}</p>}
          </Section>
        )}

        <Section title="② 설계도(작업지시서)">
          {prd.problem && <p>문제 상황: {prd.problem}</p>}
          {prd.oneLiner && <p>한 줄 소개: {prd.oneLiner}</p>}
          {prd.usersNote && <p>사용자: {prd.usersNote}</p>}
          {core.length > 0 && <p>핵심 기능: {core.join(" / ")}</p>}
          {prd.niceToHave && <p>있으면 좋은 기능: {prd.niceToHave}</p>}
          <p>AI 기능: {prd.aiFeature?.needed === "yes" ? prd.aiFeature.description || "사용" : "불필요"}</p>
          {prd.screen && <p>화면 구성: {prd.screen}</p>}
          {prd.dataToStore && <p>저장할 정보: {prd.dataToStore}</p>}
          {prd.successMetric && <p>성공 기준: {prd.successMetric}</p>}
          {ethics.length > 0 && <p>지켜야 할 것: {ethics.join(" · ")}</p>}
        </Section>

        {gq.length > 0 && (
          <Section title="③ AI Grill Me 검토">
            {gq.map((q, i) => (
              <p key={i}>Q. {q.text} → {ga[i] || "-"}</p>
            ))}
          </Section>
        )}

        {project.codingNotes && (
          <Section title="④ 코딩 메모">
            <p className="whitespace-pre-wrap">{project.codingNotes}</p>
          </Section>
        )}

        {(project.submission.html || project.submission.url) && (
          <Section title="⑤ 제출된 산출물">
            <div className="flex flex-wrap items-center gap-3">
              {project.submission.html && (
                <HtmlArtifactButton
                  html={project.submission.html}
                  title={project.submission.htmlFileName || project.requestTitle}
                  label={`📄 ${project.submission.htmlFileName || "HTML 산출물"} 열어보기`}
                  className="text-brand underline"
                />
              )}
              {project.submission.url && (
                <a href={project.submission.url} target="_blank" className="text-brand underline">
                  🔗 링크 열기
                </a>
              )}
            </div>
            {project.submission.oneLiner && <p>{project.submission.oneLiner}</p>}
            {project.submission.usage && <p>🕹️ 사용법: {project.submission.usage}</p>}
            {project.submission.etc && <p>기타: {project.submission.etc}</p>}
          </Section>
        )}
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
