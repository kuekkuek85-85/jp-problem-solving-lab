import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { generateText } from "@/lib/gemini";

const SYSTEM_PROMPT = `너는 중학생의 발표 슬라이드를 만들어주는 디자이너야.
설계도와 완성 소개를 바탕으로 3장짜리 발표 슬라이드를 HTML로 만들어.
1장: 문제, 2장: 해결 방법, 3장: 시연 링크 안내. 각 장에는 실제 내용을 채워(빈 항목 금지).

크기 규칙(매우 중요):
- 각 <section>은 화면 컨테이너에 꽉 맞아야 해. width, height에 px 같은 고정 픽셀 값을 절대 쓰지 마.
- 각 <section>의 style에는 width:100%; box-sizing:border-box; 를 반드시 포함해.
- 폰트 크기는 rem 또는 % 등 상대 단위만 사용하고, 제목도 너무 크지 않게(2rem 이하 권장). 내용이 화면 밖으로 넘치지 않게 해.
- 인라인 style만 사용(밝고 경쾌한 색감).

<html>, <head>, <body> 태그 없이 <section class="slide">...</section> 3개만 출력해. 다른 설명은 절대 추가하지 마.`;

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
