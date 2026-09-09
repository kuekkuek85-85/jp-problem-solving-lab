"use client";

import { useEffect, useState } from "react";
import { arrayRemove, arrayUnion, collection, doc, increment, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { projectPath, projectsPath, requestPath, studentPath, submissionPath } from "@/lib/paths";
import { emptyProject } from "@/lib/factories";
import type { ProjectDoc, StudentDoc } from "@/lib/types";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { HtmlArtifactButton } from "@/components/HtmlArtifact";
import { MAX_INLINE_HTML_BYTES, MAX_UPLOAD_BYTES, isHtmlFile, uploadSubmissionFile } from "@/lib/upload";

// 축제 부스형(간단 제출) 의뢰 전용: 단계 없이 한 페이지로 산출물만 제출.
// 제목 · 링크 또는 파일 업로드(확장자 제한 없음) · 설명(사용법) · 기타
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
  const [mode, setMode] = useState<"url" | "file">(project.submission.html || project.submission.htmlFileName ? "file" : "url");
  const [url, setUrl] = useState(project.submission.url ?? "");
  const [html, setHtml] = useState(project.submission.html ?? "");
  const [fileUrl, setFileUrl] = useState(project.submission.html ? "" : project.submission.url ?? "");
  const [fileName, setFileName] = useState(project.submission.htmlFileName ?? "");
  const [fileError, setFileError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [usage, setUsage] = useState(project.submission.usage ?? "");
  const [etc, setEtc] = useState(project.submission.etc ?? "");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(project.currentStep === "done");

  const artifactReady = mode === "url" ? !!url.trim() : !!html.trim() || !!fileUrl.trim();
  const complete = !!title.trim() && artifactReady && !uploading;

  // 간단 제출 화면에 있는데 저장된 진행단계(activeStep)가 옛 단계로 남아 있으면(토글 켜기 전 맡은 경우)
  // 교사 화면에 정확히 보이도록 'submit'으로 한 번 교정한다.
  useEffect(() => {
    if (project.currentStep !== "done" && student.activeStep !== "submit") {
      updateDoc(doc(db, studentPath(sessionCode, student.studentId)), { activeStep: "submit" }).catch(() => {});
    }
  }, [sessionCode, student.studentId, student.activeStep, project.currentStep]);

  // 확장자 제한 없음. HTML은 발표에서 바로 렌더링하도록 인라인 저장,
  // 그 외 파일(ZIP 등)은 Firebase Storage에 올려 다운로드 링크로 저장.
  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileError("");
    setHtml("");
    setFileUrl("");
    setFileName("");

    if (isHtmlFile(file)) {
      if (file.size > MAX_INLINE_HTML_BYTES) {
        setFileError("HTML 파일이 너무 커요(최대 600KB). 이미지가 많다면 ZIP으로 올리거나 링크로 제출해주세요.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setHtml(String(reader.result ?? ""));
        setFileName(file.name);
      };
      reader.onerror = () => setFileError("파일을 읽지 못했어요. 다시 시도해주세요.");
      reader.readAsText(file);
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setFileError("파일이 너무 커요(최대 25MB). 더 작게 압축하거나 링크로 제출해주세요.");
      return;
    }
    setUploading(true);
    try {
      const { url: uploadedUrl, fileName: name } = await uploadSubmissionFile(sessionCode, student.studentId, project.id, file);
      setFileUrl(uploadedUrl);
      setFileName(name);
    } catch {
      setFileError("업로드에 실패했어요. 파일 크기를 줄이거나 링크로 제출해보세요. (문제가 계속되면 선생님께 알려주세요)");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!complete || saving) return;
    setSaving(true);
    try {
      const now = Date.now();
      // 링크 모드: url. 파일 모드: HTML이면 인라인(html), 그 외 파일이면 업로드 URL(fileUrl).
      const submittedHtml = mode === "file" && html ? html : null;
      const submittedUrl = mode === "url" ? url.trim() : submittedHtml ? "" : fileUrl.trim();
      const submittedFileName = mode === "file" ? fileName || null : null;
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
          {html.trim() ? (
            <div className="mt-4">
              <HtmlArtifactButton html={html} title={fileName || title || project.requestTitle} label="📄 제출한 산출물 열어보기" className="text-sm font-bold text-brand underline" />
            </div>
          ) : (
            (url.trim() || fileUrl.trim()) && (
              <a href={mode === "url" ? url : fileUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-bold text-brand underline">
                {fileName ? `📎 제출한 파일 열어보기 (${fileName})` : "🔗 제출한 산출물 열어보기"}
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
                onClick={() => setMode("file")}
                className={`rounded-full px-4 py-1.5 ${mode === "file" ? "bg-white text-brand-deep shadow" : "text-slate-500"}`}
              >
                📄 파일 업로드
              </button>
            </div>

            {mode === "url" ? (
              <>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="산출물 주소(URL), 영상·사진 링크 등" />
                <p className="mt-1 text-xs text-slate-400">웹/게임 링크, 로봇·엔트리 작품은 영상이나 사진 링크도 좋아요.</p>
              </>
            ) : (
              <>
                <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-sm font-bold ${uploading ? "border-slate-200 bg-slate-100 text-slate-400" : "border-slate-300 bg-slate-50 text-slate-500 hover:border-brand-soft hover:bg-brand-soft/5"}`}>
                  <input type="file" onChange={onPickFile} className="hidden" disabled={uploading} />
                  {uploading ? "⏳ 업로드 중..." : fileName ? `📄 ${fileName} (다시 선택하려면 클릭)` : "📄 파일을 선택하세요 (HTML·ZIP·이미지 등 무엇이든)"}
                </label>
                {fileError && <p className="mt-1.5 text-xs font-bold text-red-600">{fileError}</p>}
                {html.trim() && (
                  <div className="mt-2">
                    <HtmlArtifactButton html={html} title={fileName || title || "산출물 미리보기"} label="👀 업로드한 화면 미리보기" className="text-xs font-bold text-brand underline" />
                  </div>
                )}
                {!html.trim() && fileUrl.trim() && (
                  <p className="mt-2 text-xs font-bold text-emerald-600">✅ 업로드 완료: {fileName}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">배포 링크가 없으면 파일을 올리세요. HTML은 발표회에서 바로 보이고, ZIP 등 다른 파일은 다운로드 링크로 공유돼요. (최대 25MB)</p>
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
