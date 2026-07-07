import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { generateText } from "@/lib/gemini";
import { PRD_FIELDS } from "@/lib/constants";

const SYSTEM_PROMPT = `너는 중학생의 웹사이트 설계도 작성을 돕는 다정한 코치야.
학생이 막힌 설계도 항목 하나에 대해 짧고 구체적인 힌트를 2~3문장으로 줘.
정답을 그대로 써주지 말고, 학생이 자기 말로 채울 수 있도록 예시와 질문을 함께 제시해.
쉬운 한국어를 사용하고, 존댓말로 답해.`;

const MAX_CALLS_PER_FIELD = 2;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { sessionCode, studentId, projectId, fieldId } = body;
  if (!sessionCode || !studentId || !projectId || !fieldId) {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const field = PRD_FIELDS.find((f) => f.id === fieldId);
  if (!field) {
    return NextResponse.json({ ok: false, error: "알 수 없는 항목입니다." }, { status: 400 });
  }

  const db = getAdminDb();
  const projectRef = db.doc(`sessions/${sessionCode}/students/${studentId}/projects/${projectId}`);
  const projectSnap = await projectRef.get();
  const project = projectSnap.data();
  if (!project) {
    return NextResponse.json({ ok: false, error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  }

  const callCount = project.prdHints?.[fieldId] ?? 0;
  if (callCount >= MAX_CALLS_PER_FIELD) {
    return NextResponse.json({ ok: false, error: "이 항목의 AI 힌트를 모두 사용했어요." }, { status: 429 });
  }

  try {
    const prd = project.prd ?? {};
    const userPrompt = `의뢰 제목: ${project.requestTitle}
문제 상황: ${prd.problem ?? ""}
현재 힌트가 필요한 항목: ${field.label}
학생이 지금까지 이 항목에 쓴 내용: ${prd[fieldId] ? JSON.stringify(prd[fieldId]) : "(아직 없음)"}`;

    const hint = await generateText(SYSTEM_PROMPT, userPrompt);

    await projectRef.update({ [`prdHints.${fieldId}`]: callCount + 1 });

    return NextResponse.json({ ok: true, hint, callCount: callCount + 1 });
  } catch (err) {
    console.error("prd-hint error", err);
    return NextResponse.json({ ok: false, error: "AI 힌트 호출에 실패했어요. 잠시 후 다시 시도해주세요." }, { status: 502 });
  }
}
