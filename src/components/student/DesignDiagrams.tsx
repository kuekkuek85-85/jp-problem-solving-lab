"use client";

import { useState } from "react";
import type { ProjectDoc } from "@/lib/types";
import { FlowDiagram } from "./FlowDiagram";
import { SchemaDiagram } from "./SchemaDiagram";
import { TaskPlan } from "./TaskPlan";

type DesignTab = "flow" | "schema" | "tasks";

const TABS: { key: DesignTab; label: string }[] = [
  { key: "flow", label: "📈 플로우" },
  { key: "schema", label: "🗄️ 스키마" },
  { key: "tasks", label: "📋 태스크" },
];

// 플로우 다이어그램·데이터 스키마·구현 태스크를 탭으로 묶어 세로 스크롤을 줄인다.
export function DesignDiagrams({
  sessionCode,
  studentId,
  project,
}: {
  sessionCode: string;
  studentId: string;
  project: ProjectDoc;
}) {
  const [tab, setTab] = useState<DesignTab>("flow");

  return (
    <div>
      <div className="mb-2 flex gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-bold transition ${
              tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "flow" && <FlowDiagram sessionCode={sessionCode} studentId={studentId} project={project} />}
      {tab === "schema" && <SchemaDiagram sessionCode={sessionCode} studentId={studentId} project={project} />}
      {tab === "tasks" && <TaskPlan sessionCode={sessionCode} studentId={studentId} project={project} />}
    </div>
  );
}
