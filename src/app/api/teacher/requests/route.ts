import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { checkTeacherPin } from "../../_lib/auth";
import type { RequestDoc } from "@/lib/types";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!checkTeacherPin(body.pin)) {
    return NextResponse.json({ ok: false, error: "PIN이 올바르지 않습니다." }, { status: 401 });
  }
  const { sessionCode, action } = body;
  if (!sessionCode || !action) {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const db = getAdminDb();
  const col = db.collection(`sessions/${sessionCode}/requests`);

  if (action === "create") {
    const { title, summary, difficulty } = body;
    if (!title || !summary || !difficulty) {
      return NextResponse.json({ ok: false, error: "제목/설명/난이도를 모두 입력해주세요." }, { status: 400 });
    }
    const ref = col.doc();
    const doc: RequestDoc = {
      id: ref.id,
      title,
      summary,
      difficulty,
      source: "official",
      status: "in_progress",
      approvalStatus: "approved",
      proposedByStudentId: null,
      proposedByStudentName: null,
      rejectReason: null,
      activeSolverIds: [],
      submissionCount: 0,
      createdAt: Date.now(),
    };
    await ref.set(doc);
    return NextResponse.json({ ok: true, id: ref.id });
  }

  if (action === "update") {
    const { requestId, title, summary, difficulty } = body;
    if (!requestId) return NextResponse.json({ ok: false, error: "requestId 필요" }, { status: 400 });
    const update: Record<string, unknown> = {};
    if (title) update.title = title;
    if (summary) update.summary = summary;
    if (difficulty) update.difficulty = difficulty;
    await col.doc(requestId).update(update);
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    const { requestId } = body;
    if (!requestId) return NextResponse.json({ ok: false, error: "requestId 필요" }, { status: 400 });
    await col.doc(requestId).delete();
    return NextResponse.json({ ok: true });
  }

  if (action === "approve" || action === "reject") {
    const { requestId, rejectReason } = body;
    if (!requestId) return NextResponse.json({ ok: false, error: "requestId 필요" }, { status: 400 });
    await col.doc(requestId).update({
      approvalStatus: action === "approve" ? "approved" : "rejected",
      rejectReason: action === "reject" ? rejectReason ?? "" : null,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "알 수 없는 action" }, { status: 400 });
}
