"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LAB_ID, TRAINING_LAB_ID } from "@/lib/constants";
import { useStudents, useSubmissions } from "@/lib/hooks";
import { OfficeView } from "@/components/teacher/OfficeView";

function OfficeInner() {
  const params = useSearchParams();
  const lab = params.get("lab") === "training" ? TRAINING_LAB_ID : LAB_ID;
  const students = useStudents(lab);
  const submissions = useSubmissions(lab);

  return (
    <main className="flex-1">
      <header className="border-b border-slate-200 bg-white px-4 py-3 text-center">
        <h1 className="font-black text-slate-900">🏢 장평 문제해결연구소 — 실시간 사무실</h1>
        <p className="text-xs text-slate-400">읽기 전용 송출 페이지{lab === TRAINING_LAB_ID ? " · 교사 연수" : ""}</p>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-4">
        <OfficeView students={students} submissions={submissions} />
      </div>
    </main>
  );
}

export default function PublicOfficePage() {
  return (
    <Suspense fallback={null}>
      <OfficeInner />
    </Suspense>
  );
}
