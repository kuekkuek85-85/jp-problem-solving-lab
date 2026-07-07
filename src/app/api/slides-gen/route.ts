import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { generateText } from "@/lib/gemini";

const SYSTEM_PROMPT = `너는 중학생의 발표 슬라이드를 만들어주는 디자이너야.
설계도와 완성 소개를 바탕으로 3장짜리 발표 슬라이드를 HTML로 만들어.
1장: 문제, 2장: 해결 방법, 3장: 시연 링크 안내.
전체를 <section class="slide">...</section> 3개로 구성하고 인라인 style만 사용해(밝고 경쾌한 색感, 큰 글씨).
<html>, <head>, <body> 태그 없이 <section> 3개만 출력해. 다른 설명은 절대 추가하지 마.`;

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
    const submission = project.submission ?? {};
    const userPrompt = `의뢰 제목: ${project.requestTitle}
문제 상황: ${prd.problem ?? ""}
한 줄 소개: ${prd.oneLiner ?? ""}
완성 소개: ${submission.oneLiner ?? ""}
시연 링크: ${submission.url ?? ""}`;

    const slidesHtml = await generateText(SYSTEM_PROMPT, userPrompt);
    await projectRef.update({ "submission.slidesHtml": slidesHtml });

    return NextResponse.json({ ok: true, slidesHtml });
  } catch (err) {
    console.error("slides-gen error", err);
    return NextResponse.json({ ok: false, error: "발표 슬라이드 생성에 실패했어요." }, { status: 502 });
  }
}
