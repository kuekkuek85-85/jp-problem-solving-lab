import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { generateText } from "@/lib/gemini";
import type { AnalyzeData, PrdData } from "@/lib/types";

// '저장할 정보'를 보고 데이터베이스 스키마(테이블/관계)를 Mermaid erDiagram으로 그린다.
const SYSTEM_PROMPT = `너는 교사가 만들려는 웹앱의 '데이터 스키마(DB 설계)'를 Mermaid erDiagram으로 그려주는 도우미야.
앱이 저장해야 하는 정보를 테이블(엔티티)과 관계로 깔끔하게 설계해줘.

[출력 규칙 — 반드시 지켜]
- Mermaid 코드만 출력한다. 설명·제목·코드펜스(\`\`\`) 금지. 첫 줄은 정확히 "erDiagram".
- 엔티티(테이블) 이름은 영문 PascalCase 단수형(예: Student, Submission, Vote). 3~6개 정도.
- 각 엔티티 안에 필드를 "타입 이름" 형식으로 적는다. 타입은 string/int/datetime/boolean/text 중 하나.
  - 기본키에는 PK, 외래키에는 FK 표시. 예:
    Student {
      string id PK
      string name
      datetime createdAt
    }
- 필드 이름은 영문 camelCase. 각 엔티티에 id(PK)와 의미 있는 필드 3~6개.
- 관계는 Mermaid 표기로 적고 관계 라벨은 큰따옴표 한국어. 예:
  Student ||--o{ Submission : "제출한다"
  Request ||--o{ Submission : "담는다"
- 카디널리티 기호: ||--o{ (1:다), ||--|| (1:1), }o--o{ (다:다). 상황에 맞게.
- 한국어 설명/주석은 관계 라벨에만. 필드·엔티티 이름은 영문.
- 과하지 않게, 이 앱에 꼭 필요한 데이터만 담아라.`;

function buildUserPrompt(analyze: AnalyzeData, prd: PrdData, requestTitle: string, feedback?: string) {
  const lines = [
    `[의뢰] ${requestTitle}`,
    `[한 줄 소개] ${prd.oneLiner}`,
    `[사용자] ${prd.usersNote}`,
    `[핵심 기능] ${prd.coreFeatures.filter(Boolean).join(", ")}`,
    `[저장할 정보] ${prd.dataToStore}`,
    prd.aiFeature?.needed === "yes" ? `[AI 기능] ${prd.aiFeature.description}` : "",
    `[문제] ${analyze?.what ?? prd.problem ?? ""}`,
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
  const idx = t.search(/erDiagram/i);
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
    if (!/^erDiagram/i.test(mermaid)) {
      return NextResponse.json({ ok: false, error: "스키마 생성에 실패했어요. 다시 시도해주세요." }, { status: 502 });
    }

    await projectRef.update({ schemaMermaid: mermaid });
    return NextResponse.json({ ok: true, mermaid });
  } catch (err) {
    console.error("schema-diagram error", err);
    return NextResponse.json({ ok: false, error: "스키마 생성 중 오류가 발생했어요." }, { status: 500 });
  }
}
