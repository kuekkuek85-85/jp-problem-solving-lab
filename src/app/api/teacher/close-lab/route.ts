import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { checkTeacherPin } from "../../_lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!checkTeacherPin(body.pin)) {
    return NextResponse.json({ ok: false, error: "PIN이 올바르지 않습니다." }, { status: 401 });
  }
  const { sessionCode } = body;
  if (!sessionCode) {
    return NextResponse.json({ ok: false, error: "sessionCode 필요" }, { status: 400 });
  }
  const db = getAdminDb();
  await db.doc(`sessions/${sessionCode}`).update({ currentStage: "closing", stageTimerEnd: null, lectureMode: false });
  return NextResponse.json({ ok: true });
}
