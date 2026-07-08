"use client";

import { useState } from "react";
import { arrayRemove, arrayUnion, doc, increment, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { projectPath, requestPath, studentPath, submissionPath } from "@/lib/paths";
import type { ProjectDoc, StudentDoc } from "@/lib/types";
import { Button, Card, Input } from "@/components/ui";
import { StampCelebration } from "./StampCelebration";

export function SubmitStage({
  sessionCode,
  student,
  project,
}: {
  sessionCode: string;
  student: StudentDoc;
  project: ProjectDoc;
}) {
  const [url, setUrl] = useState(project.submission.url ?? "");
  const [oneLiner, setOneLiner] = useState(project.submission.oneLiner ?? "");
  const [saving, setSaving] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);

  const complete = url.trim() && oneLiner.trim();
  const willCompleteAllStamps = !student.stamps.includes(5) && [1, 2, 3, 4].every((n) => student.stamps.includes(n));

  async function submit() {
    if (!complete) return;
    setSaving(true);
    try {
      const now = Date.now();
      await updateDoc(doc(db, projectPath(sessionCode, student.studentId, project.id)), {
        submission: { url, oneLiner, slidesHtml: project.submission.slidesHtml ?? null, submittedAt: now },
        currentStep: "done",
        completedAt: now,
      });
      // 제출 내용 기반 발표 슬라이드 자동 생성(실패해도 제출은 완료 — 발표 화면에서 재생성 가능)
      let slidesHtml: string | null = project.submission.slidesHtml ?? null;
      try {
        const res = await fetch("/api/slides-gen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionCode, studentId: student.studentId, projectId: project.id }),
        });
        const data = await res.json();
        if (data.ok && data.slidesHtml) slidesHtml = data.slidesHtml;
      } catch {
        // 무시 — 발표 슬라이드는 나중에 생성 가능
      }
      await updateDoc(doc(db, studentPath(sessionCode, student.studentId)), {
        stamps: arrayUnion(5),
        activeRequestId: null,
        activeProjectId: null,
        activeStep: null,
      });
      await updateDoc(doc(db, requestPath(sessionCode, project.requestId)), {
        activeSolverIds: arrayRemove(student.studentId),
        submissionCount: increment(1),
      });
      await setDoc(doc(db, submissionPath(sessionCode, project.id)), {
        projectId: project.id,
        requestId: project.requestId,
        requestTitle: project.requestTitle,
        studentId: student.studentId,
        studentName: student.name,
        level: student.level,
        oneLiner,
        url,
        slidesHtml,
        badges: student.badges,
        submittedAt: now,
      });
      setCelebrate(true);
    } finally {
      setSaving(false);
    }
  }

  async function requestDeepDive() {
    setDeepDiveLoading(true);
    try {
      await fetch("/api/deep-dive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionCode, studentId: student.studentId, projectId: project.id }),
      });
    } finally {
      setDeepDiveLoading(false);
    }
  }

  if (project.currentStep === "done") {
    return (
      <main className="mx-auto max-w-xl px-4 py-10 text-center">
        <Card>
          <div className="text-5xl">🎉</div>
          <h2 className="mt-3 text-lg font-black">해결안을 제출했어요!</h2>
          <p className="mt-1 text-sm text-slate-500">{project.requestTitle} 의뢰가 해결됐습니다.</p>

          {project.deepDive.suggestions.length === 0 ? (
            <Button variant="secondary" className="mt-5 w-full" onClick={requestDeepDive} disabled={deepDiveLoading}>
              {deepDiveLoading ? "생각하는 중..." : "🚀 심화 도전 과제 받아보기"}
            </Button>
          ) : (
            <div className="mt-5 space-y-2 text-left">
              <p className="text-xs font-bold text-slate-400">🚀 심화 도전 제안</p>
              {project.deepDive.suggestions.map((s, i) => (
                <p key={i} className="rounded-lg bg-teal-50 p-2 text-sm text-teal-800">{s}</p>
              ))}
            </div>
          )}

          <p className="mt-6 text-sm text-slate-500">의뢰 게시판에서 새 의뢰를 맡거나, 다음 브리핑을 기다려주세요.</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <Card>
        <h2 className="mb-1 text-lg font-black">해결안 제출 · 배포</h2>
        <p className="mb-5 text-sm text-slate-500">완성한 산출물의 링크를 제출해주세요.</p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-800">산출물 URL</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-800">한 줄 소개</label>
            <Input value={oneLiner} onChange={(e) => setOneLiner(e.target.value)} placeholder="어떤 문제를 어떻게 해결했나요?" />
          </div>
        </div>

        <Button className="mt-6 w-full" disabled={!complete || saving} onClick={submit}>
          {saving ? "제출 중..." : "해결안 제출하기"}
        </Button>
      </Card>

      {celebrate && (
        <StampCelebration stamp={5} allDone={willCompleteAllStamps} onDone={() => setCelebrate(false)} />
      )}
    </main>
  );
}
