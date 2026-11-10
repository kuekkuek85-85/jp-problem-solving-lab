"use client";

import { useState } from "react";
import { isTrainingLab, trainingTrack } from "@/lib/constants";
import { advanceProject } from "@/lib/actions";
import { buildAgentsMd, buildSpecMd, buildCodingPrompt, type PromptMode } from "@/lib/spec-export";
import type { ProjectDoc, StudentDoc } from "@/lib/types";
import { Button, Card, Textarea } from "@/components/ui";
import { StampCelebration } from "./StampCelebration";

type TabKey = "agents" | "spec" | "prompt";

const TABS: { key: TabKey; label: string; file: string }[] = [
  { key: "agents", label: "🧭 가치관", file: "AGENTS.md" },
  { key: "spec", label: "📄 설계서", file: "spec.md" },
  { key: "prompt", label: "⌨️ 프롬프트", file: "prompt.txt" },
];

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function CodingStage({
  sessionCode,
  student,
  project,
}: {
  sessionCode: string;
  student: StudentDoc;
  project: ProjectDoc;
}) {
  const lovable = isTrainingLab(sessionCode) && trainingTrack(sessionCode) === "lovable";

  const [tab, setTab] = useState<TabKey>("agents");
  // 러버블은 앱(멀티파일) 구조라 '편하게 구현 + 제출용 HTML 별도'(app)를, 그 외는 '단일 통합 HTML'(single)을 기본값으로.
  const [promptMode, setPromptMode] = useState<PromptMode>(lovable ? "app" : "single");

  // 세 파일 내용(편집 가능). 설계 데이터로부터 최초 1회 생성.
  const [agentsText, setAgentsText] = useState(() => buildAgentsMd(student));
  const [specText, setSpecText] = useState(() => buildSpecMd(project));
  const [promptText, setPromptText] = useState(() => buildCodingPrompt(project, lovable ? "app" : "single"));

  const [copied, setCopied] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const current = { agents: agentsText, spec: specText, prompt: promptText }[tab];
  const setCurrent = { agents: setAgentsText, spec: setSpecText, prompt: setPromptText }[tab];
  const currentFile = TABS.find((t) => t.key === tab)!.file;

  function selectPromptMode(mode: PromptMode) {
    setPromptMode(mode);
    setPromptText(buildCodingPrompt(project, mode));
  }

  // 현재 탭을 최신 설계 데이터 기준으로 다시 생성(편집 내용은 덮어씀).
  function regenerate() {
    if (tab === "agents") setAgentsText(buildAgentsMd(student));
    else if (tab === "spec") setSpecText(buildSpecMd(project));
    else setPromptText(buildCodingPrompt(project, promptMode));
  }

  async function copyCurrent() {
    await navigator.clipboard.writeText(current);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function markFirstDone() {
    await advanceProject({
      sessionCode,
      studentId: student.studentId,
      projectId: project.id,
      stamp: 4,
      nextStep: "submit",
      projectFields: { codingFirstDone: true },
    });
    setCelebrate(true);
  }

  // 이미 1차 완성한 뒤 '← 이전 단계'로 돌아온 경우: 축하 없이 바로 제출 단계로 다시 이동.
  async function goToSubmit() {
    await advanceProject({
      sessionCode,
      studentId: student.studentId,
      projectId: project.id,
      stamp: 4,
      nextStep: "submit",
      projectFields: { codingFirstDone: true },
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Card>
        <h2 className="mb-1 text-lg font-black">바이브 코딩 — 설계서 넘기기</h2>
        <p className="mb-4 text-sm text-slate-500">
          설계한 내용을 <b>3개의 파일</b>로 정리했어요. 내용을 확인·수정한 뒤, AI 도구에 그대로 넘겨 구현하면 됩니다.
          <br />
          <span className="text-xs text-slate-400">
            ① 가치관(AGENTS.md) = 지킬 원칙 · ② 설계서(spec.md) = 기획·설계·플로우 · ③ 프롬프트 = 구현 지시
          </span>
        </p>

        {/* 탭 */}
        <div className="mb-3 flex gap-1 rounded-xl bg-slate-100 p-1">
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

        {/* 파일명 + 안내 */}
        <div className="mb-2 flex items-center justify-between">
          <code className="rounded bg-slate-900 px-2 py-0.5 text-xs font-bold text-slate-100">{currentFile}</code>
          <button onClick={regenerate} className="text-xs font-bold text-slate-400 underline" title="설계 내용 기준으로 다시 만들기">
            ↻ 설계 기준으로 새로고침
          </button>
        </div>

        {tab === "agents" && (
          <p className="mb-2 text-xs text-amber-700">
            💡 내가 적은 「나의 가치관」이 그대로 들어있어요. Codex·Claude Code·Lovable 등은 <b>AGENTS.md</b> 파일을 원칙으로 읽습니다.
          </p>
        )}
        {tab === "spec" && (
          <p className="mb-2 text-xs text-slate-500">의뢰 분석 + 설계도 + 수용 기준 + 플로우 다이어그램을 한 파일로 모았어요.</p>
        )}
        {tab === "prompt" && (
          <div className="mb-2">
            <p className="mb-1.5 text-xs text-slate-500">두 파일을 어떤 방식으로 구현할지 선택하세요. (텍스트는 자유롭게 수정 가능)</p>
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs">
              <button
                onClick={() => selectPromptMode("single")}
                className={`flex-1 rounded-md px-2 py-1.5 font-bold transition ${promptMode === "single" ? "bg-white shadow-sm" : "text-slate-500"}`}
              >
                하나의 통합 HTML로 구현
              </button>
              <button
                onClick={() => selectPromptMode("app")}
                className={`flex-1 rounded-md px-2 py-1.5 font-bold transition ${promptMode === "app" ? "bg-white shadow-sm" : "text-slate-500"}`}
              >
                편하게 구현 + 제출용 HTML 별도
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
              {promptMode === "single"
                ? "제출·발표·AI 피드백이 바로 되는 index.html 한 파일로 완성합니다. (Gemini·ChatGPT·Claude·Codex 추천)"
                : "익숙한 구조로 먼저 구현하고, 제출·발표용 단일 HTML을 따로 만들게 합니다. (Lovable 등 앱 빌더 추천)"}
            </p>
          </div>
        )}

        <Textarea
          rows={16}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="font-mono text-[12px] leading-relaxed"
        />

        <div className="mt-3 flex gap-2">
          <Button className="flex-1" onClick={copyCurrent}>
            {copied ? "복사 완료! ✅" : "📋 복사하기"}
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => downloadText(currentFile, current)}>
            ⬇️ {currentFile} 다운로드
          </Button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          {lovable ? (
            <>오늘은 <b>Lovable</b> 채팅에 세 파일을 함께 올리고(또는 붙여넣고) 프롬프트를 보내보세요.</>
          ) : isTrainingLab(sessionCode) && trainingTrack(sessionCode) === "dev" ? (
            <>오늘은 <b>Codex 또는 Claude Code</b>에 <code>AGENTS.md</code>·<code>spec.md</code>를 두고 프롬프트를 보내보세요.</>
          ) : (
            <>오늘은 <b>Gemini · ChatGPT · Claude</b> 중 편한 도구에 세 파일 내용을 붙여넣고 프롬프트를 보내보세요.</>
          )}
        </p>
      </Card>

      <div className="mt-4">
        {!project.codingFirstDone ? (
          <Button className="w-full" onClick={markFirstDone}>
            1차 완성! 다음 단계로
          </Button>
        ) : (
          <>
            <Card className="bg-emerald-50 border-emerald-200 text-center text-sm font-bold text-emerald-700">
              1차 완성 체크됐어요. 계속 다듬은 뒤 해결안을 제출해주세요!
            </Card>
            <Button className="mt-3 w-full" onClick={goToSubmit}>
              다음 단계: 해결안 제출하기 →
            </Button>
          </>
        )}
      </div>

      {celebrate && <StampCelebration stamp={5} onDone={() => setCelebrate(false)} />}
    </main>
  );
}
