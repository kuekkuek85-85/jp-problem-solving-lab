import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { generateText } from "@/lib/gemini";
import type { AnalyzeData, PrdData } from "@/lib/types";

// 기획서(의뢰 분석 + 설계도)를 보고 '사용자 흐름'을 보기 좋은 Mermaid flowchart로 그린다.
const SYSTEM_PROMPT = `너는 교사가 만들려는 웹앱의 '사용자 흐름(플로우)'을 보기 좋은 Mermaid flowchart로 그려주는 도우미야.
앱이 이미 만들어졌다고 가정하고, 사용자가 화면을 거치는 흐름을 역할별로 깔끔하게 그려.

[출력 규칙 — 반드시 지켜]
- Mermaid 코드만 출력한다. 설명·제목·코드펜스(\`\`\`) 금지. 첫 줄은 정확히 "flowchart TD".
- 둘째 줄부터 아래 색상 정의(classDef) 5줄을 그대로 포함한다:
  classDef teacher fill:#e0edff,stroke:#3b74d6,color:#14305e;
  classDef student fill:#e7f8ee,stroke:#36a568,color:#14432b;
  classDef system fill:#f3eefe,stroke:#8b5cf6,color:#3b1d6e;
  classDef decision fill:#fff4e0,stroke:#e0922f,color:#6b3d12;
  classDef data fill:#eef2f7,stroke:#64748b,color:#2a3647;
- 노드 id는 영문 대문자(A, B, C, ...). 라벨은 한국어, 반드시 큰따옴표로 감싼다.
- 노드 모양: 일반 동작 A["..."], 시작/끝 Z(["..."]), 판단/분기 D{"..."}, 데이터 저장 DB[("...")].
- 각 노드에 역할 클래스를 붙인다: 교사 동작 :::teacher, 학생 동작 :::student, 시스템/AI 동작 :::system, 판단 :::decision, 저장소 :::data. 예: A["문제 등록"]:::teacher
- 역할(교사/학생/시스템)이 둘 이상이면 subgraph로 묶어라. 제목도 큰따옴표. 예: subgraph T["교사"] ... end
- 분기 간선 라벨도 큰따옴표: D -->|"예"| E
- 라벨 안에 괄호(), 대괄호[], 콜론:, 세미콜론; 은 쓰지 마라(Mermaid 파싱 깨짐). 쉼표·점은 괜찮다.
- 노드는 8~14개 정도. 사용자 관점의 화면·동작·저장·AI·분기를 담되 과하지 않게.`;

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
