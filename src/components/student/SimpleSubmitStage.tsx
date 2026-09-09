"use client";

import { useState } from "react";
import { arrayRemove, arrayUnion, collection, doc, increment, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { projectPath, projectsPath, requestPath, studentPath, submissionPath } from "@/lib/paths";
import { emptyProject } from "@/lib/factories";
import type { ProjectDoc, StudentDoc } from "@/lib/types";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { HtmlArtifactButton } from "@/components/HtmlArtifact";

const MAX_HTML_BYTES = 600 * 1024;

// 축제 부스형(간단 제출) 의뢰 전용: 단계 없이 한 페이지로 산출물만 제출.
// 제목 · 링크 또는 HTML 파일 업로드 · 설명(사용법) · 기타
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
  const [mode, setMode] = useState<"url" | "html">(project.submission.html ? "html" : "url");
  const [url, setUrl] = useState(project.submission.url ?? "");
  const [html, setHtml] = useState(project.submission.html ?? "");
  const [fileName, setFileName] = useState(project.submission.htmlFileName ?? "");
  const [fileError, setFileError] = useState("");
  const [usage, setUsage] = useState(project.submission.usage ?? "");
  const [etc, setEtc] = useState(project.submission.etc ?? "");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(project.currentStep === "done");

  const artifactReady = mode === "url" ? !!url.trim() : !!html.trim();
  const complete = !!title.trim() && artifactReady;

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileError("");
    if (!/\.html?$/i.test(file.name)) {
      setFileError("HTML 파일(.html)만 올릴 수 있어요.");
      return;
    }
    if (file.size > MAX_HTML_BYTES) {
      setFileError("파일이 너무 커요(최대 600KB). 이미지가 많다면 링크로 제출해주세요.");
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

  async function submit() {
    if (!complete || saving) return;
    setSaving(true);
    try {
      const now = Date.now();
      const submittedUrl = mode === "url" ? url.trim() : "";
      const submittedHtml = mode === "html" ? html : null;
      const submittedFileName = mode === "html" ? (fileName || "산출물.html") : null;
      // 1) 프로젝트 제출 저장(완료)
      await updateDoc(doc(db, projectPath(sessionCode, student.studentId, project.id)), {
        submission: {
          url: submittedUrl,
          html: submittedHtml,
          htmlFileName: submittedFileName,
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
        url: submittedUrl,
        html: submittedHtml,
        htmlFileName: submittedFileName,
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

  // 같은 축제 의뢰로 산출물을 하나 더 등록: 새 프로젝트를 만들어 바로 제출 화면으로 전환.
  const [adding, setAdding] = useState(false);
  async function addAnother() {
    if (adding) return;
    setAdding(true);
    try {
      const now = Date.now();
      const projectRef = doc(collection(db, projectsPath(sessionCode, student.studentId)));
      const np = emptyProject({
        id: projectRef.id,
        requestId: project.requestId,
        requestTitle: project.requestTitle,
        now,
        level: student.level,
      });
      np.currentStep = "submit";
      await setDoc(projectRef, np);
      await updateDoc(doc(db, requestPath(sessionCode, project.requestId)), {
        activeSolverIds: arrayUnion(student.studentId),
      });
      await updateDoc(doc(db, studentPath(sessionCode, student.studentId)), {
        activeRequestId: project.requestId,
        activeProjectId: projectRef.id,
        activeStep: "submit",
      });
      // activeProjectId가 새 프로젝트로 바뀌면 상위 페이지가 새 SimpleSubmitStage로 리마운트(key=project.id)한다.
    } finally {
      setAdding(false);
    }
  }

  if (done) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10 text-center">
        <Card>
          <div className="text-5xl">🎪</div>
          <h2 className="mt-3 text-lg font-black">산출물을 제출했어요!</h2>
          <p className="mt-1 text-sm text-slate-500">{project.requestTitle}</p>
          {mode === "html" && html.trim() ? (
            <div className="mt-4">
              <HtmlArtifactButton html={html} title={fileName || title || project.requestTitle} label="📄 제출한 산출물 열어보기" className="text-sm font-bold text-brand underline" />
            </div>
          ) : (
            url.trim() && (
              <a href={url} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-bold text-brand underline">
                🔗 제출한 산출물 열어보기
              </a>
            )
          )}
          <Button className="mt-6 w-full" disabled={adding} onClick={addAnother}>
            {adding ? "준비 중..." : "➕ 산출물 하나 더 등록하기"}
          </Button>
          <Button variant="secondary" className="mt-2 w-full" onClick={goToBoard}>
            의뢰 게시판으로 이동하기
          </Button>
          <p className="mt-3 text-xs text-slate-400">축제 부스 프로그램은 여러 개를 등록할 수 있어요.</p>
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
            <label className="mb-1 block text-sm font-bold text-slate-800">산출물 <span className="text-red-500">*</span></label>
            <div className="mb-2 inline-flex rounded-full bg-slate-200 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setMode("url")}
                className={`rounded-full px-4 py-1.5 ${mode === "url" ? "bg-white text-brand-deep shadow" : "text-slate-500"}`}
              >
                🔗 링크
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
              <>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="산출물 주소(URL), 영상·사진 링크 등" />
                <p className="mt-1 text-xs text-slate-400">웹/게임 링크, 로봇·엔트리 작품은 영상이나 사진 링크도 좋아요.</p>
              </>
            ) : (
              <>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-bold text-slate-500 hover:border-brand-soft hover:bg-brand-soft/5">
                  <input type="file" accept=".html,.htm,text/html" onChange={onPickFile} className="hidden" />
                  {fileName ? `📄 ${fileName} (다시 선택하려면 클릭)` : "📄 .html 파일을 선택하세요"}
                </label>
                {fileError && <p className="mt-1.5 text-xs font-bold text-red-600">{fileError}</p>}
                {html.trim() && (
                  <div className="mt-2">
                    <HtmlArtifactButton html={html} title={fileName || title || "산출물 미리보기"} label="👀 업로드한 화면 미리보기" className="text-xs font-bold text-brand underline" />
                  </div>
                )}
                <p className="mt-1 text-xs text-slate-400">배포 링크가 없으면 HTML 파일을 올려주세요. 발표회에서 바로 화면으로 보여줘요. (최대 600KB)</p>
              </>
            )}
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
