import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import type { RequestDoc } from "@/lib/types";

// 학생 의뢰 등록 요청 — 승인 전까지 게시판에 노출되지 않는다(교사 승인 필요).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { sessionCode, studentId, studentName, title, summary } = body;
  if (!sessionCode || !studentId || !title || !summary) {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const db = getAdminDb();
  const sessionSnap = await db.doc(`sessions/${sessionCode}`).get();
  if (!sessionSnap.exists) {
    return NextResponse.json({ ok: false, error: "존재하지 않는 세션이에요." }, { status: 404 });
  }

  const ref = db.collection(`sessions/${sessionCode}/requests`).doc();
  const doc: RequestDoc = {
    id: ref.id,
    title,
    summary,
    difficulty: "growing",
    source: "student",
    status: "in_progress",
    approvalStatus: "pending",
    proposedByStudentId: studentId,
    proposedByStudentName: studentName ?? null,
    rejectReason: null,
    activeSolverIds: [],
    submissionCount: 0,
    createdAt: Date.now(),
  };
  await ref.set(doc);

  return NextResponse.json({ ok: true, id: ref.id });
}
