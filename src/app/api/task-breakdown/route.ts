import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { generateJson } from "@/lib/gemini";
import type { AnalyzeData, ImplTask, PrdData } from "@/lib/types";

// 설계도를 분석해 '구현 태스크'로 쪼갠다. 한 번에 다 만들지 않고, 순서대로 하나씩 구현하도록.
const SYSTEM_PROMPT = `너는 교사가 설계한 웹앱을 '바이브 코딩으로 한 단계씩 만들 수 있게' 구현 태스크로 쪼개주는 도우미야.
한 번에 전부 만들지 말고, 작동하는 최소 기능(MVP)부터 쌓아 올리도록 순서를 정해.

[출력 형식 — JSON만]
{"tasks":[{"id":"t1","title":"...","detail":"...","checks":["...","..."]}, ...]}
- 코드펜스·설명 없이 JSON만 출력.
- tasks는 3~6개. 반드시 구현 순서대로(먼저 할 것이 앞).
- id는 "t1","t2"... 순서대로.
- title: 8자 내외의 짧은 제목(예: "기본 화면 틀").
- detail: 이 태스크에서 무엇을 만드는지 한두 문장(한국어). 사용자가 보게 될 결과 중심.
- checks: 이 태스크의 **검증 기준(체크리스트) 2~3개**. 각 항목은 한국어로, 눈으로 확인 가능하게 구체적으로("~가 보인다/된다" 형태). 1차 자가점검과 2차 사람 점검에 그대로 쓸 수 있어야 함.
- 첫 태스크는 화면 뼈대/기본 흐름처럼 바로 눈에 보이는 작동 결과가 나오게. 뒤로 갈수록 핵심 기능·저장·AI·마무리(발표용 정리) 순.
- 각 태스크는 그 자체로 한 번 구현하고 점검할 수 있는 크기로.`;

function buildUserPrompt(analyze: AnalyzeData, prd: PrdData, requestTitle: string, feedback?: string) {
  const lines = [
    `[의뢰] ${requestTitle}`,
    `[한 줄 소개] ${prd.oneLiner}`,
    `[사용자] ${prd.usersNote}`,
    `[핵심 기능] ${prd.coreFeatures.filter(Boolean).join(", ")}`,
    prd.aiFeature?.needed === "yes" ? `[AI 기능] ${prd.aiFeature.description}` : "[AI 기능] 없음",
    `[화면 구성] ${prd.screen}`,
    `[저장할 정보] ${prd.dataToStore}`,
    prd.acceptanceCriteria?.trim() ? `[수용 기준] ${prd.acceptanceCriteria.replace(/\n/g, " / ")}` : "",
    `[문제] ${analyze?.what ?? prd.problem ?? ""}`,
  ].filter(Boolean);
  if (feedback?.trim()) {
    lines.push("", `[수정 요청] 아래 피드백을 반영해서 태스크를 다시 쪼개줘: ${feedback.trim()}`);
  }
  return lines.join("\n");
}

function normalize(tasks: unknown): ImplTask[] {
  if (!Array.isArray(tasks)) return [];
  return tasks
    .slice(0, 8)
    .map((t, i) => {
      const o = (t ?? {}) as Record<string, unknown>;
      const rawChecks = Array.isArray(o.checks) ? o.checks : o.check ? [o.check] : [];
      const checks = rawChecks
        .map((c) => String(c ?? "").trim())
        .filter(Boolean)
        .slice(0, 4);
      return {
        id: typeof o.id === "string" && o.id.trim() ? o.id.trim() : `t${i + 1}`,
        title: String(o.title ?? "").trim() || `태스크 ${i + 1}`,
        detail: String(o.detail ?? "").trim(),
        checks,
      };
    })
    .filter((t) => t.detail);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { sessionCode, studentId, projectId, feedback } = body;
  if (!sessionCode || !studentId || !projectId) {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const projectRef = db.doc(`sessions/${sessionCode}/students/${studentId}/projects/${projectId}`);
    const projectSnap = await projectRef.get();
    const project = projectSnap.data();
    if (!project) {
      return NextResponse.json({ ok: false, error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }

    const prompt = buildUserPrompt(project.analyze, project.prd, project.requestTitle, feedback);
    const result = await generateJson<{ tasks?: unknown }>(SYSTEM_PROMPT, prompt);
    const tasks = normalize(result?.tasks);
    if (tasks.length === 0) {
      return NextResponse.json({ ok: false, error: "태스크 분해에 실패했어요. 다시 시도해주세요." }, { status: 502 });
    }

    await projectRef.update({ tasks });
    return NextResponse.json({ ok: true, tasks });
  } catch (err) {
    console.error("task-breakdown error", err);
    return NextResponse.json({ ok: false, error: "태스크 분해 중 오류가 발생했어요." }, { status: 500 });
  }
}
