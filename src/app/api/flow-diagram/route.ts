import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { generateText } from "@/lib/gemini";
import type { AnalyzeData, PrdData } from "@/lib/types";

// 기획서(의뢰 분석 + 설계도)를 보고 '사용자 흐름'을 Mermaid flowchart로 그린다.
const SYSTEM_PROMPT = `너는 교사가 만들려는 웹앱의 '사용자 흐름(플로우)'을 Mermaid flowchart 코드로 그려주는 도우미야.
입력(기획서)을 읽고, 앱이 이미 만들어졌다고 가정하고 사용자가 화면을 거치는 흐름을 그려.

[출력 규칙 — 반드시 지켜]
- Mermaid "flowchart TD" 코드만 출력한다. 설명·제목·코드펜스(\`\`\`) 금지. 첫 줄은 정확히 "flowchart TD".
- 노드 id는 영문 대문자(A, B, C, ...). 라벨은 한국어, 반드시 큰따옴표로 감싼다. 예: A["문제 등록"]
- 판단/분기는 중괄호 노드로: D{"빈칸인가?"} 그리고 간선 라벨은 -->|"예"| 처럼 큰따옴표로.
- 라벨 안에 괄호(), 대괄호[], 콜론:, 세미콜론; 은 쓰지 마라(Mermaid 파싱 깨짐). 쉼표·점은 괜찮다.
- 노드는 7~14개 정도. 사용자 관점의 화면·동작·저장·AI·분기를 담되 과하지 않게.
- 역할이 다르면(사용자/교사/시스템 등) subgraph로 묶어도 좋다. subgraph 제목도 "큰따옴표" 라벨.`;

function buildUserPrompt(analyze: AnalyzeData, prd: PrdData, requestTitle: string, feedback?: string) {
  const lines = [
    `[의뢰] ${requestTitle}`,
    `[문제] ${analyze?.what ?? prd.problem ?? ""}`,
    `[한 줄 소개] ${prd.oneLiner}`,
    `[사용자] ${prd.usersNote}`,
    `[핵심 기능] ${prd.coreFeatures.filter(Boolean).join(", ")}`,
    prd.aiFeature?.needed === "yes" ? `[AI 기능] ${prd.aiFeature.description}` : "[AI 기능] 없음",
    `[화면 구성] ${prd.screen}`,
    `[저장할 정보] ${prd.dataToStore}`,
    prd.acceptanceCriteria?.trim() ? `[수용 기준] ${prd.acceptanceCriteria.replace(/\n/g, " / ")}` : "",
  ].filter(Boolean);
  if (feedback?.trim()) {
    lines.push("", `[수정 요청] 아래 피드백을 반영해서 다시 그려줘: ${feedback.trim()}`);
  }
  return lines.join("\n");
}

// 모델이 코드펜스/설명을 붙여도 Mermaid 코드만 추출한다.
function extractMermaid(raw: string): string {
  let t = raw.trim();
  const fence = t.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const idx = t.search(/flowchart\s+(TD|TB|LR|RL|BT)/i);
  if (idx > 0) t = t.slice(idx).trim();
  return t;
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
    const raw = await generateText(SYSTEM_PROMPT, prompt);
    const mermaid = extractMermaid(raw);
    if (!/^flowchart\s+(TD|TB|LR|RL|BT)/i.test(mermaid)) {
      return NextResponse.json({ ok: false, error: "다이어그램 생성에 실패했어요. 다시 시도해주세요." }, { status: 502 });
    }

    await projectRef.update({ flowMermaid: mermaid });
    return NextResponse.json({ ok: true, mermaid });
  } catch (err) {
    console.error("flow-diagram error", err);
    return NextResponse.json({ ok: false, error: "다이어그램 생성 중 오류가 발생했어요." }, { status: 500 });
  }
}
