"use client";

import { useState } from "react";

// 학생이 업로드한 HTML 산출물을 안전하게(샌드박스 iframe) 그대로 렌더링한다.
// sandbox에 allow-same-origin을 주지 않으므로, 스크립트는 실행되지만
// 우리 사이트의 쿠키·저장소·부모 DOM에는 접근할 수 없다.
export function HtmlArtifactViewer({
  html,
  title,
  onClose,
}: {
  html: string;
  title?: string | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/70 p-2 sm:p-4">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
          <span className="truncate text-sm font-black text-slate-800">{title || "산출물 미리보기"}</span>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full px-3 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            ✕ 닫기
          </button>
        </div>
        <iframe
          title={title || "산출물"}
          srcDoc={html}
          className="h-full w-full flex-1 bg-white"
          sandbox="allow-scripts allow-popups allow-forms allow-modals"
        />
      </div>
    </div>
  );
}

// 클릭하면 산출물 HTML을 전체 화면 뷰어로 열어주는 버튼.
export function HtmlArtifactButton({
  html,
  title,
  className,
  label = "산출물 열어보기 →",
}: {
  html: string;
  title?: string | null;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={className ?? "inline-block text-xs font-bold text-brand underline"}
      >
        {label}
      </button>
      {open && <HtmlArtifactViewer html={html} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}
