"use client";

import { use } from "react";
import { SubmissionGallery } from "@/components/gallery/SubmissionGallery";

export default function PublicGalleryPage({ params }: { params: Promise<{ sessionCode: string }> }) {
  const { sessionCode } = use(params);

  return (
    <main className="flex-1">
      <header className="border-b border-slate-200 bg-white px-4 py-4 text-center">
        <div className="text-2xl">🔬🤖</div>
        <h1 className="font-black text-slate-900">장평 문제해결연구소 — 해결 보고회</h1>
        <p className="text-xs text-slate-400">읽기 전용 참관 페이지</p>
      </header>
      <SubmissionGallery sessionCode={sessionCode} canReact={false} />
    </main>
  );
}
