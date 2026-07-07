import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { checkTeacherPin } from "../../_lib/auth";
import { generateSessionCode } from "@/lib/factories";
import { SEED_REQUESTS } from "@/lib/constants";
import type { RequestDoc, SessionDoc } from "@/lib/types";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!checkTeacherPin(body.pin)) {
    return NextResponse.json({ ok: false, error: "PIN이 올바르지 않습니다." }, { status: 401 });
  }

  const db = getAdminDb();
  let sessionCode = "";
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateSessionCode();
    const existing = await db.doc(`sessions/${candidate}`).get();
    if (!existing.exists) {
      sessionCode = candidate;
      break;
    }
  }
  if (!sessionCode) {
    return NextResponse.json({ ok: false, error: "세션 코드를 생성하지 못했습니다. 다시 시도해주세요." }, { status: 500 });
  }

  const now = Date.now();
  const sessionDoc: SessionDoc = {
    createdAt: now,
    teacherPinHash: "env",
    currentStage: "onboarding",
    stageTimerEnd: null,
    currentSlideIndex: 0,
    lectureMode: false,
    presentingSubmissionId: null,
    slides: [
      {
        index: 0,
        markdown:
          "# 오늘 우리가 AI를 안전하게 쓰는 이유\n\n- 학생 계정으로 직접 AI에 접속하지 않아요\n- 모든 AI 요청은 학교 서버를 통해서만 전달돼요\n- 이름·학번 같은 개인정보는 AI에게 보내지 않아요\n- 캔바 코드는 선생님이 초대한 관리된 계정에서만 사용해요",
      },
    ],
  };

  const batch = db.batch();
  batch.set(db.doc(`sessions/${sessionCode}`), sessionDoc);
  for (const seed of SEED_REQUESTS) {
    const ref = db.collection(`sessions/${sessionCode}/requests`).doc();
    const requestDoc: RequestDoc = {
      id: ref.id,
      title: seed.title,
      summary: seed.summary,
      difficulty: seed.difficulty,
      source: "official",
      status: "in_progress",
      approvalStatus: "approved",
      proposedByStudentId: null,
      proposedByStudentName: null,
      rejectReason: null,
      activeSolverIds: [],
      submissionCount: 0,
      createdAt: now,
    };
    batch.set(ref, requestDoc);
  }
  await batch.commit();

  return NextResponse.json({ ok: true, sessionCode });
}
