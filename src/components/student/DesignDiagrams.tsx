"use client";

import { useState } from "react";
import type { ProjectDoc } from "@/lib/types";
import { FlowDiagram } from "./FlowDiagram";
import { SchemaDiagram } from "./SchemaDiagram";

// 플로우 다이어그램과 데이터 스키마를 탭으로 묶어 세로 스크롤을 줄인다.
export function DesignDiagrams({
  sessionCode,
  studentId,
  project,
}: {
  sessionCode: string;
  studentId: string;
  project: ProjectDoc;
}) {
  const [tab, setTab] = useState<"flow" | "schema">("flow");

  return (
    <div>
      <div className="mb-2 flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setTab("flow")}
          className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold transition ${
            tab === "flow" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          }`}
        >
          📈 플로우 다이어그램
        </button>
        <button
          onClick={() => setTab("schema")}
          className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold transition ${
            tab === "schema" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          }`}
        >
          🗄️ 데이터 스키마
        </button>
      </div>
      {tab === "flow" ? (
        <FlowDiagram sessionCode={sessionCode} studentId={studentId} project={project} />
      ) : (
        <SchemaDiagram sessionCode={sessionCode} studentId={studentId} project={project} />
      )}
    </div>
  );
}
