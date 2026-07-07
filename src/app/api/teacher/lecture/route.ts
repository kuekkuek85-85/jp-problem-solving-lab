import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { checkTeacherPin } from "../../_lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!checkTeacherPin(body.pin)) {
    return NextResponse.json({ ok: false, error: "PIN이 올바르지 않습니다." }, { status: 401 });
  }
  const { sessionCode, lectureMode, currentSlideIndex, slides } = body;
  if (!sessionCode) {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const db = getAdminDb();
  const update: Record<string, unknown> = {};
  if (typeof lectureMode === "boolean") update.lectureMode = lectureMode;
  if (typeof currentSlideIndex === "number") update.currentSlideIndex = currentSlideIndex;
  if (Array.isArray(slides)) update.slides = slides;
  await db.doc(`sessions/${sessionCode}`).update(update);

  return NextResponse.json({ ok: true });
}
