"use client";

import { useState } from "react";
import type { ProjectDoc, StudentDoc } from "@/lib/types";
import { PrdStage } from "./PrdStage";
import { SubmitStage } from "./SubmitStage";

// 제출 완료한 단계형 해결안을 다시 열어 설계도(PRD)·산출물을 수정하는 편집 화면.
export function EditSolution({
  sessionCode,
  student,
  project,
  onDone,
}: {
  sessionCode: string;
  student: StudentDoc;
  project: ProjectDoc;
  onDone: () => void;
}) {
  const [tab, setTab] = useState<"prd" | "submit">("submit");

  return (
    <div>
      <div className="mx-auto max-w-xl px-4 pt-4">
        <p className="mb-2 text-sm font-black text-slate-700">✏️ 해결안 수정 — {project.requestTitle}</p>
        <div className="inline-flex rounded-full bg-slate-200 p-1 text-xs font-bold">
          <button
            onClick={() => setTab("prd")}
            className={`rounded-full px-4 py-1.5 ${tab === "prd" ? "bg-white text-brand-deep shadow" : "text-slate-500"}`}
          >
            📐 설계도 수정
          </button>
          <button
            onClick={() => setTab("submit")}
            className={`rounded-full px-4 py-1.5 ${tab === "submit" ? "bg-white text-brand-deep shadow" : "text-slate-500"}`}
          >
            🚀 산출물 수정
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-400">설계도는 입력하는 대로 자동 저장돼요. 산출물은 ‘수정 저장’을 눌러야 반영돼요.</p>
      </div>

      {tab === "prd" ? (
        <PrdStage sessionCode={sessionCode} student={student} project={project} editMode onDone={onDone} />
      ) : (
        <SubmitStage sessionCode={sessionCode} student={student} project={project} editMode onDone={onDone} />
      )}
    </div>
  );
}
