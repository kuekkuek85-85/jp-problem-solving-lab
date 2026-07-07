import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { generateJson } from "@/lib/gemini";

const SYSTEM_PROMPT = `너는 중학생 개발자에게 심화 도전 과제를 제안하는 코치야.
완성된 웹사이트 설계도를 보고, 더 도전해볼 만한 개선 과제를 2~3개 제안해.
예: 예약 중복 방지, 글자 크기 조절 접근성, 관리자 통계 화면처럼 구체적이고 실행 가능한 과제로.
쉬운 한국어로, 각 과제는 1문장으로.
아래 JSON 스키마로만 응답해: {"suggestions": ["과제1", "과제2", "과제3"]}`;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { sessionCode, studentId, projectId } = body;
  if (!sessionCode || !studentId || !projectId) {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const db = getAdminDb();
  const projectRef = db.doc(`sessions/${sessionCode}/students/${studentId}/projects/${projectId}`);
  const projectSnap = await projectRef.get();
  const project = projectSnap.data();
  if (!project) {
    return NextResponse.json({ ok: false, error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const prd = project.prd ?? {};
    const userPrompt = `의뢰 제목: ${project.requestTitle}
한 줄 소개: ${prd.oneLiner ?? ""}
핵심 기능: ${(prd.coreFeatures ?? []).filter(Boolean).join(", ")}
완성 소개: ${project.submission?.oneLiner ?? ""}`;

    const result = await generateJson<{ suggestions: string[] }>(SYSTEM_PROMPT, userPrompt);
    const suggestions = (result.suggestions ?? []).slice(0, 3);

    await projectRef.update({ "deepDive.suggestions": suggestions });

    return NextResponse.json({ ok: true, suggestions });
  } catch (err) {
    console.error("deep-dive error", err);
    return NextResponse.json({ ok: false, error: "심화 도전 제안 생성에 실패했어요." }, { status: 502 });
  }
}
