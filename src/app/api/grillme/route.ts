import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { generateJson } from "@/lib/gemini";
import type { GrillmeQuestion, Level, PrdData } from "@/lib/types";

const SYSTEM_PROMPT = `너는 중학생 웹사이트 설계도를 검토하는 친절하지만 날카로운 코치야.
설계도의 허점을 찌르는 질문을 정확히 3~4개 만들어. 반드시 쉬운 한국어를 사용해.
그 중 정확히 1개는 반드시 윤리 질문이어야 해(개인정보·저작권·공정성 중 설계도에서 가장 취약해 보이는 부분을 골라서).
질문만 만들고 답은 절대 하지 마.
학생 코스가 '새싹'이면 질문을 더 짧고 구체적으로, '나눔'이면 더 도전적으로 만들어.
아래 JSON 스키마로만 응답해:
{"questions": [{"text": "질문 내용", "type": "feature" | "data" | "ethics"}]}
questions 배열은 정확히 3~4개, 그 중 type이 "ethics"인 항목이 정확히 1개 있어야 해.`;

const MAX_CALLS = 2;

function levelLabel(level: Level) {
  if (level === "seedling") return "새싹";
  if (level === "sharing") return "나눔";
  return "성장";
}

function buildUserPrompt(prd: PrdData, level: Level) {
  return `학생 코스: ${levelLabel(level)}

[설계도]
문제 상황: ${prd.problem}
한 줄 소개: ${prd.oneLiner}
사용자: ${prd.usersNote}
핵심 기능: ${prd.coreFeatures.filter(Boolean).join(", ")}
있으면 좋은 기능: ${prd.niceToHave}
AI 기능: ${prd.aiFeature.needed === "yes" ? `필요 - ${prd.aiFeature.description}` : "불필요"}
화면 구성: ${prd.screen}
저장할 정보: ${prd.dataToStore}
성공 기준: ${prd.successMetric}
윤리 체크: 개인정보(${prd.ethicsCheck.privacy.checked ? "확인" : "미확인"}) ${prd.ethicsCheck.privacy.note}, 저작권(${prd.ethicsCheck.copyright.checked ? "확인" : "미확인"}) ${prd.ethicsCheck.copyright.note}, 공정성(${prd.ethicsCheck.fairness.checked ? "확인" : "미확인"}) ${prd.ethicsCheck.fairness.note}`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { sessionCode, studentId, projectId } = body;
  if (!sessionCode || !studentId || !projectId) {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const db = getAdminDb();
  const projectRef = db.doc(`sessions/${sessionCode}/students/${studentId}/projects/${projectId}`);
  const studentRef = db.doc(`sessions/${sessionCode}/students/${studentId}`);
  const [projectSnap, studentSnap] = await Promise.all([projectRef.get(), studentRef.get()]);
  const project = projectSnap.data();
  const student = studentSnap.data();
  if (!project || !student) {
    return NextResponse.json({ ok: false, error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  }

  const currentCalls = project.grillme?.callCount ?? 0;
  if (currentCalls >= MAX_CALLS) {
    return NextResponse.json({ ok: false, error: "그릴미 호출 횟수를 모두 사용했어요." }, { status: 429 });
  }

  try {
    const result = await generateJson<{ questions: GrillmeQuestion[] }>(
      SYSTEM_PROMPT,
      buildUserPrompt(project.prd as PrdData, student.level as Level)
    );

    const questions = (result.questions ?? []).slice(0, 4);
    await projectRef.update({
      grillme: {
        questions,
        answers: questions.map(() => ""),
        callCount: currentCalls + 1,
      },
    });

    return NextResponse.json({ ok: true, questions, callCount: currentCalls + 1 });
  } catch (err) {
    console.error("grillme error", err);
    return NextResponse.json({ ok: false, error: "AI 그릴미 호출에 실패했어요. 잠시 후 다시 시도해주세요." }, { status: 502 });
  }
}
