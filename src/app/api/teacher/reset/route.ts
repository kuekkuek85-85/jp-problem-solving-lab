import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { checkTeacherPin } from "../../_lib/auth";
import { LAB_ID } from "@/lib/constants";

// 실제 수업 시작 전 데이터 초기화.
// 연구원 활동 데이터(학생·프로젝트·제출물·반응·성찰·도움요청·발표상태)를 모두 지우고,
// 공식 의뢰와 브리핑 슬라이드는 유지한 채 세션 상태를 초기(board)로 되돌린다.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!checkTeacherPin(body.pin)) {
    return NextResponse.json({ ok: false, error: "PIN이 올바르지 않습니다." }, { status: 401 });
  }

  const db = getAdminDb();
  const base = `sessions/${LAB_ID}`;
  const sessionSnap = await db.doc(base).get();
  if (!sessionSnap.exists) {
    return NextResponse.json({ ok: false, error: "연구소가 아직 열리지 않았어요." }, { status: 404 });
  }

  // 활동 데이터 컬렉션 삭제(학생 하위 projects까지 recursiveDelete)
  await Promise.all([
    db.recursiveDelete(db.collection(`${base}/students`)),
    db.recursiveDelete(db.collection(`${base}/submissions`)),
    db.recursiveDelete(db.collection(`${base}/reactions`)),
    db.recursiveDelete(db.collection(`${base}/reflections`)),
    db.recursiveDelete(db.collection(`${base}/helpRequests`)),
    db.recursiveDelete(db.collection(`${base}/meta`)),
  ]);

  // 의뢰: 학생 제보는 삭제, 공식 의뢰는 유지하되 카운터 초기화
  const reqs = await db.collection(`${base}/requests`).get();
  const batch = db.batch();
  reqs.forEach((d) => {
    if (d.data().source === "student") batch.delete(d.ref);
    else batch.update(d.ref, { activeSolverIds: [], submissionCount: 0 });
  });
  await batch.commit();

  // 세션 상태 초기화(슬라이드는 유지)
  await db.doc(base).update({ currentStage: "board", lectureMode: false, currentSlideIndex: 0 });

  return NextResponse.json({ ok: true });
}
