import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { checkTeacherPin } from "../../_lib/auth";
import { LAB_ID, seedRequestsForLab, seedSlidesForLab } from "@/lib/constants";
import type { RequestDoc, SessionDoc } from "@/lib/types";

// 학생용(main)과 교사 연수용(training) 연구소를 각각 개소한다.
// 교사가 PIN으로 입장하거나 모드를 전환할 때 호출되며, 연구소가 없으면 개소(해당 모드의 시드 의뢰 포함)하고
// 이미 있으면 그대로 재사용한다(멱등). 데이터를 덮어쓰지 않는다.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!checkTeacherPin(body.pin)) {
    return NextResponse.json({ ok: false, error: "PIN이 올바르지 않습니다." }, { status: 401 });
  }

  const sessionCode: string = body.sessionCode || LAB_ID;
  const db = getAdminDb();
  const sessionRef = db.doc(`sessions/${sessionCode}`);
  const existing = await sessionRef.get();

  if (existing.exists) {
    return NextResponse.json({ ok: true, created: false });
  }

  const now = Date.now();
  const sessionDoc: SessionDoc = {
    createdAt: now,
    teacherPinHash: "env",
    currentStage: "board", // 학생은 서약 후 바로 활동(게시판)에 진입
    currentSlideIndex: 0,
    lectureMode: false,
    presentingSubmissionId: null,
    slides: seedSlidesForLab(sessionCode).map((markdown, index) => ({ index, markdown })),
  };

  const batch = db.batch();
  batch.set(sessionRef, sessionDoc);
  for (const seed of seedRequestsForLab(sessionCode)) {
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
      directSubmit: seed.directSubmit ?? false,
    };
    batch.set(ref, requestDoc);
  }
  await batch.commit();

  return NextResponse.json({ ok: true, created: true });
}

