import { NextResponse } from "next/server";
import { checkTeacherPin } from "../../_lib/auth";
import { isTrainingId, resetScoped } from "../../_lib/resetScoped";
import { getAdminDb } from "@/lib/firebase/admin";
import { LAB_ID } from "@/lib/constants";

// 연수(참가자) 데이터만 초기화 — ID가 'edu-'로 시작하는 이름 로그인 참가자만 삭제, 학번 학생은 보존.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!checkTeacherPin(body.pin)) {
    return NextResponse.json({ ok: false, error: "PIN이 올바르지 않습니다." }, { status: 401 });
  }
  const sessionCode: string = body.sessionCode || LAB_ID;
  const sessionSnap = await getAdminDb().doc(`sessions/${sessionCode}`).get();
  if (!sessionSnap.exists) {
    return NextResponse.json({ ok: false, error: "연구소가 아직 열리지 않았어요." }, { status: 404 });
  }
  try {
    const result = await resetScoped(sessionCode, (id) => isTrainingId(id));
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[reset-training] failed:", e);
    return NextResponse.json({ ok: false, error: "초기화 중 오류가 발생했어요. 다시 시도해주세요." }, { status: 500 });
  }
}
