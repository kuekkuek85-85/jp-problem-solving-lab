import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { checkTeacherPin } from "../../_lib/auth";
import { STAGE_ORDER } from "@/lib/types";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!checkTeacherPin(body.pin)) {
    return NextResponse.json({ ok: false, error: "PIN이 올바르지 않습니다." }, { status: 401 });
  }
  const { sessionCode, currentStage } = body;
  if (!sessionCode || !STAGE_ORDER.includes(currentStage)) {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const db = getAdminDb();
  await db.doc(`sessions/${sessionCode}`).update({
    currentStage,
    lectureMode: currentStage === "lecture",
  });

  return NextResponse.json({ ok: true });
}
