"use client";

import { useState } from "react";
import { arrayRemove, arrayUnion, doc, increment, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { projectPath, requestPath, studentPath, submissionPath } from "@/lib/paths";
import type { ProjectDoc, StudentDoc } from "@/lib/types";
import { Button, Card, Input } from "@/components/ui";
import { HtmlArtifactButton } from "@/components/HtmlArtifact";
import { StampCelebration } from "./StampCelebration";

// 업로드 HTML은 제출물 문서(발표 슬라이드와 함께)에 인라인 저장되므로 Firestore 1MB 한도를 고려해 넉넉히 제한.
const MAX_HTML_BYTES = 600 * 1024;

export function SubmitStage({
  sessionCode,
  student,
  project,
}: {
  sessionCode: string;
  student: StudentDoc;
  project: ProjectDoc;
}) {
  const [mode, setMode] = useState<"url" | "html">(project.submission.html ? "html" : "url");
  const [url, setUrl] = useState(project.submission.url ?? "");
  const [html, setHtml] = useState(project.submission.html ?? "");
  const [fileName, setFileName] = useState(project.submission.htmlFileName ?? "");
  const [fileError, setFileError] = useState("");
  const [oneLiner, setOneLiner] = useState(project.submission.oneLiner ?? "");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("");
  const [celebrate, setCelebrate] = useState(false);

  const artifactReady = mode === "url" ? !!url.trim() : !!html.trim();
  const complete = artifactReady && oneLiner.trim();

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 다시 선택 가능하도록 초기화
    if (!file) return;
    setFileError("");
    if (!/\.html?$/i.test(file.name)) {
      setFileError("HTML 파일(.html)만 올릴 수 있어요.");
      return;
    }
    if (file.size > MAX_HTML_BYTES) {
      setFileError("파일이 너무 커요(최대 600KB). 이미지가 많다면 링크(URL)로 제출해주세요.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setHtml(String(reader.result ?? ""));
      setFileName(file.name);
    };
    reader.onerror = () => setFileError("파일을 읽지 못했어요. 다시 시도해주세요.");
    reader.readAsText(file);
  }
  const willCompleteAllStamps = !student.stamps.includes(5) && [1, 2, 3, 4].every((n) => student.stamps.includes(n));

  async function submit() {
    if (!complete) return;
    setSaving(true);
    setProgress(8);
    setPhase("해결안을 저장하고 있어요...");
    let timer: ReturnType<typeof setInterval> | null = null;
    try {
      const now = Date.now();
      const submittedUrl = mode === "url" ? url.trim() : "";
      const submittedHtml = mode === "html" ? html : null;
      const submittedFileName = mode === "html" ? (fileName || "산출물.html") : null;
      const priorSlidesHtml: string | null = project.submission.slidesHtml ?? null;

      // 1) 프로젝트 문서를 제출 완료 상태로 저장.
      await updateDoc(doc(db, projectPath(sessionCode, student.studentId, project.id)), {
        submission: {
          url: submittedUrl,
          html: submittedHtml,
          htmlFileName: submittedFileName,
          oneLiner,
          slidesHtml: priorSlidesHtml,
          submittedAt: now,
        },
        currentStep: "done",
        completedAt: now,
      });

      // 2) 해결 보고회(발표)에 반드시 뜨도록, 갤러리용 요약 문서를 "먼저" 저장한다.
      //    (슬라이드 생성·화면 전환보다 앞서 기록해, 중간에 끊겨도 발표에서 누락되지 않게 한다.)
      setProgress(30);
      setPhase("해결 보고회에 등록하고 있어요...");
      await setDoc(doc(db, submissionPath(sessionCode, project.id)), {
        projectId: project.id,
        requestId: project.requestId,
        requestTitle: project.requestTitle,
        studentId: student.studentId,
        studentName: student.name,
        level: student.level,
        oneLiner,
        url: submittedUrl,
        html: submittedHtml,
        htmlFileName: submittedFileName,
        slidesHtml: priorSlidesHtml,
        badges: student.badges,
        submittedAt: now,
      });
      await updateDoc(doc(db, requestPath(sessionCode, project.requestId)), {
        activeSolverIds: arrayRemove(student.studentId),
        submissionCount: increment(1),
      });

      // 3) 발표 슬라이드 자동 생성(실패해도 제출은 이미 완료 — 발표 화면에서 재생성 가능).
      setProgress(45);
      setPhase("발표 슬라이드를 만들고 있어요...");
      timer = setInterval(() => setProgress((p) => Math.min(p + 3, 90)), 250);
      try {
        const res = await fetch("/api/slides-gen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionCode, studentId: student.studentId, projectId: project.id }),
        });
        const data = await res.json();
        if (data.ok && data.slidesHtml) {
          // 슬라이드가 생성되면 요약 문서에도 반영(발표에서 슬라이드까지 보이도록).
          await setDoc(doc(db, submissionPath(sessionCode, project.id)), { slidesHtml: data.slidesHtml }, { merge: true });
        }
      } catch {
        // 무시 — 발표 슬라이드는 나중에 생성 가능
      }
      if (timer) {
        clearInterval(timer);
        timer = null;
      }

      // 4) 마지막으로 스탬프 지급 + 활성 프로젝트 정리(이 순간 화면이 게시판으로 전환된다).
      setProgress(95);
      setPhase("마무리하고 있어요...");
      await updateDoc(doc(db, studentPath(sessionCode, student.studentId)), {
        stamps: arrayUnion(5),
        activeRequestId: null,
        activeProjectId: null,
        activeStep: null,
      });
      setProgress(100);
      setCelebrate(true);
    } finally {
      if (timer) clearInterval(timer);
      setSaving(false);
    }
  }

  async function goToBoard() {
    // 새 의뢰를 맡을 수 있도록 활성 프로젝트를 정리하면 자동으로 의뢰 게시판으로 전환된다.
    await updateDoc(doc(db, studentPath(sessionCode, student.studentId)), {
      activeRequestId: null,
      activeProjectId: null,
      activeStep: null,
    });
  }

  if (project.currentStep === "done") {
    return (
      <main className="mx-auto max-w-xl px-4 py-10 text-center">
        <Card>
          <div className="text-5xl">🎉</div>
          <h2 className="mt-3 text-lg font-black">해결안을 제출했어요!</h2>
          <p className="mt-1 text-sm text-slate-500">{project.requestTitle} 의뢰가 해결됐습니다.</p>

          {project.submission.html ? (
            <div className="mt-4">
              <HtmlArtifactButton
                html={project.submission.html}
                title={project.submission.htmlFileName || project.requestTitle}
                label="📄 제출한 산출물 열어보기"
                className="text-sm font-bold text-brand underline"
              />
            </div>
          ) : (
            project.submission.url && (
              <a href={project.submission.url} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-bold text-brand underline">
                🔗 제출한 산출물 열어보기
              </a>
            )
          )}

          <Button className="mt-6 w-full" onClick={goToBoard}>
            의뢰 게시판으로 이동하기
          </Button>
          <p className="mt-3 text-sm text-slate-500">게시판에서 새 의뢰를 맡거나, 다음 브리핑을 기다려주세요.</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <Card>
        <h2 className="mb-1 text-lg font-black">해결안 제출 · 배포</h2>
        <p className="mb-5 text-sm text-slate-500">완성한 산출물의 링크를 내거나, HTML 파일을 올려주세요.</p>

        <div className="space-y-4">
          <div>
            <div className="mb-2 inline-flex rounded-full bg-slate-200 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setMode("url")}
                className={`rounded-full px-4 py-1.5 ${mode === "url" ? "bg-white text-brand-deep shadow" : "text-slate-500"}`}
              >
                🔗 링크(URL)
              </button>
              <button
                type="button"
                onClick={() => setMode("html")}
                className={`rounded-full px-4 py-1.5 ${mode === "html" ? "bg-white text-brand-deep shadow" : "text-slate-500"}`}
              >
                📄 HTML 파일
              </button>
            </div>

            {mode === "url" ? (
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">산출물 URL</label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">HTML 파일 업로드</label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-bold text-slate-500 hover:border-brand-soft hover:bg-brand-soft/5">
                  <input type="file" accept=".html,.htm,text/html" onChange={onPickFile} className="hidden" />
                  {fileName ? `📄 ${fileName} (다시 선택하려면 클릭)` : "📄 .html 파일을 선택하세요"}
                </label>
                {fileError && <p className="mt-1.5 text-xs font-bold text-red-600">{fileError}</p>}
                {html.trim() && (
                  <div className="mt-2">
                    <HtmlArtifactButton
                      html={html}
                      title={fileName || "산출물 미리보기"}
                      label="👀 업로드한 화면 미리보기"
                      className="text-xs font-bold text-brand underline"
                    />
                  </div>
                )}
                <p className="mt-1.5 text-xs text-slate-400">업로드한 HTML은 발표회에서 바로 화면으로 보여줘요. (최대 600KB)</p>
              </div>
            )}
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

      {saving && <SubmitProgress progress={progress} phase={phase} />}

      {celebrate && (
        <StampCelebration stamp={5} allDone={willCompleteAllStamps} onDone={() => setCelebrate(false)} />
      )}
    </main>
  );
}

function SubmitProgress({ progress, phase }: { progress: number; phase: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <Card className="w-full max-w-sm text-center">
        <div className="text-4xl">🚀</div>
        <p className="mt-3 font-black text-slate-800">해결안 제출 중</p>
        <p className="mt-1 text-sm text-slate-500">{phase}</p>
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-soft to-violet-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-lg font-black text-brand">{progress}%</p>
      </Card>
    </div>
  );
}
