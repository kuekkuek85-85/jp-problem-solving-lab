"use client";

import { useState } from "react";
import { arrayRemove, arrayUnion, doc, increment, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { projectPath, requestPath, studentPath, submissionPath } from "@/lib/paths";
import type { ProjectDoc, StudentDoc } from "@/lib/types";
import { Button, Card, Input, Textarea } from "@/components/ui";

// 축제 부스형(간단 제출) 의뢰 전용: 단계 없이 한 페이지로 산출물만 제출.
// 제목 · 링크 · 설명(사용법) · 기타
export function SimpleSubmitStage({
  sessionCode,
  student,
  project,
}: {
  sessionCode: string;
  student: StudentDoc;
  project: ProjectDoc;
}) {
  const [title, setTitle] = useState(project.submission.oneLiner ?? "");
  const [url, setUrl] = useState(project.submission.url ?? "");
  const [usage, setUsage] = useState(project.submission.usage ?? "");
  const [etc, setEtc] = useState(project.submission.etc ?? "");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(project.currentStep === "done");

  const complete = title.trim() && url.trim();

  async function submit() {
    if (!complete || saving) return;
    setSaving(true);
    try {
      const now = Date.now();
      // 1) 프로젝트 제출 저장(완료)
      await updateDoc(doc(db, projectPath(sessionCode, student.studentId, project.id)), {
        submission: {
          url: url.trim(),
          html: null,
          htmlFileName: null,
          oneLiner: title.trim(),
          usage: usage.trim(),
          etc: etc.trim(),
          slidesHtml: null,
          submittedAt: now,
        },
        currentStep: "done",
        completedAt: now,
      });
      // 2) 해결 보고회(발표)용 요약 문서 — 먼저 기록해 발표에서 누락되지 않게 한다.
      await setDoc(doc(db, submissionPath(sessionCode, project.id)), {
        projectId: project.id,
        requestId: project.requestId,
        requestTitle: project.requestTitle,
        studentId: student.studentId,
        studentName: student.name,
        level: student.level,
        oneLiner: title.trim(),
        url: url.trim(),
        html: null,
        htmlFileName: null,
        usage: usage.trim(),
        etc: etc.trim(),
        slidesHtml: null,
        badges: student.badges,
        submittedAt: now,
      });
      await updateDoc(doc(db, requestPath(sessionCode, project.requestId)), {
        activeSolverIds: arrayRemove(student.studentId),
        submissionCount: increment(1),
      });
      // 3) 완료 스탬프 지급(활성 프로젝트는 유지 — 완료 화면을 보여준 뒤 버튼으로 게시판 이동)
      await updateDoc(doc(db, studentPath(sessionCode, student.studentId)), {
        stamps: arrayUnion(5),
      });
      setDone(true);
    } finally {
      setSaving(false);
    }
  }

  async function goToBoard() {
    await updateDoc(doc(db, studentPath(sessionCode, student.studentId)), {
      activeRequestId: null,
      activeProjectId: null,
      activeStep: null,
    });
  }

  if (done) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10 text-center">
        <Card>
          <div className="text-5xl">🎪</div>
          <h2 className="mt-3 text-lg font-black">산출물을 제출했어요!</h2>
          <p className="mt-1 text-sm text-slate-500">{project.requestTitle}</p>
          {url.trim() && (
            <a href={url} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-bold text-brand underline">
              🔗 제출한 산출물 열어보기
            </a>
          )}
          <Button className="mt-6 w-full" onClick={goToBoard}>
            의뢰 게시판으로 이동하기
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <Card>
        <h2 className="mb-1 text-lg font-black">🎪 산출물 제출</h2>
        <p className="mb-5 text-sm text-slate-500">
          {project.requestTitle} — 만든 프로그램을 간단히 제출해요. (여러 단계 없이 이 화면에서 바로!)
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-800">제목 <span className="text-red-500">*</span></label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 장평 두더지 잡기 게임" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-800">링크 <span className="text-red-500">*</span></label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="산출물 주소(URL), 영상·사진 링크 등" />
            <p className="mt-1 text-xs text-slate-400">웹/게임 링크, 로봇·엔트리 작품은 영상이나 사진 링크도 좋아요.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-800">설명 (사용법)</label>
            <Textarea rows={3} value={usage} onChange={(e) => setUsage(e.target.value)} placeholder="어떻게 즐기는 건지, 조작 방법 등을 적어주세요." />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-800">기타</label>
            <Textarea rows={2} value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="준비물, 필요한 기기(햄스터 로봇 등), 하고 싶은 말 등 (선택)" />
          </div>
        </div>

        <Button className="mt-6 w-full" disabled={!complete || saving} onClick={submit}>
          {saving ? "제출 중..." : "제출하기"}
        </Button>
      </Card>
    </main>
  );
}
