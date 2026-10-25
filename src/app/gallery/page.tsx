"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LAB_ID, isTrainingLab, trainingLabel } from "@/lib/constants";
import { SubmissionGallery } from "@/components/gallery/SubmissionGallery";

function GalleryInner() {
  const params = useSearchParams();
  const labParam = params.get("lab") ?? "";
  const lab = isTrainingLab(labParam) ? labParam : LAB_ID;
  return (
    <main className="flex-1">
      <header className="border-b border-slate-200 bg-white px-4 py-4 text-center">
        <div className="text-2xl">🔬🤖</div>
        <h1 className="font-black text-slate-900">장평 문제해결연구소 — 해결 보고회</h1>
        <p className="text-xs text-slate-400">읽기 전용 참관 페이지{isTrainingLab(lab) ? ` · ${trainingLabel(lab)}` : ""}</p>
      </header>
      <SubmissionGallery sessionCode={lab} canReact={false} />
    </main>
  );
}

export default function PublicGalleryPage() {
  return (
    <Suspense fallback={null}>
      <GalleryInner />
    </Suspense>
  );
}
