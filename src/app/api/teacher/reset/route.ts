import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { checkTeacherPin } from "../../_lib/auth";
import { LAB_ID, isTrainingLab } from "@/lib/constants";

// 실제 수업 시작 전 데이터 초기화.
// 요청한 연구소(sessionCode)의 활동 데이터(참가자·프로젝트·제출물·반응·성찰·도움요청·발표상태)만 지우고,
// 공식 의뢰와 브리핑 슬라이드는 유지한 채 세션 상태를 초기(board)로 되돌린다.
// ⚠️ 반드시 body.sessionCode의 연구소만 대상으로 한다(다른 기수·학생용 보호).
const ACTIVITY_COLLECTIONS = ["students", "submissions", "reactions", "reflections", "helpRequests", "meta"] as const;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!checkTeacherPin(body.pin)) {
    return NextResponse.json({ ok: false, error: "PIN이 올바르지 않습니다." }, { status: 401 });
  }

  const sessionCode: string = body.sessionCode || LAB_ID;
  if (sessionCode !== LAB_ID && !isTrainingLab(sessionCode)) {
    return NextResponse.json({ ok: false, error: `알 수 없는 연구소입니다: ${sessionCode}` }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const base = `sessions/${sessionCode}`;
    const sessionSnap = await db.doc(base).get();
    if (!sessionSnap.exists) {
      return NextResponse.json({ ok: false, error: "연구소가 아직 열리지 않았어요." }, { status: 404 });
    }

    // 삭제 전 건수 집계(응답으로 돌려줘 교사가 실제 삭제를 확인할 수 있게)
    const counts = await Promise.all(
      ACTIVITY_COLLECTIONS.map(async (c) => (await db.collection(`${base}/${c}`).count().get()).data().count)
    );
    const deleted: Record<string, number> = Object.fromEntries(ACTIVITY_COLLECTIONS.map((c, i) => [c, counts[i]]));

    // 활동 데이터 컬렉션 삭제(참가자 하위 projects까지 recursiveDelete)
    await Promise.all(ACTIVITY_COLLECTIONS.map((c) => db.recursiveDelete(db.collection(`${base}/${c}`))));

    // 의뢰: 참가자 제보는 삭제, 공식 의뢰는 유지하되 카운터 초기화
    const reqs = await db.collection(`${base}/requests`).get();
    const batch = db.batch();
    let proposedDeleted = 0;
    reqs.forEach((d) => {
      if (d.data().source === "student") {
        batch.delete(d.ref);
        proposedDeleted++;
      } else batch.update(d.ref, { activeSolverIds: [], submissionCount: 0 });
    });
    await batch.commit();
    deleted.proposedRequests = proposedDeleted;

    // 세션 상태 초기화(슬라이드는 유지)
    await db.doc(base).update({ currentStage: "board", lectureMode: false, currentSlideIndex: 0 });

    // 삭제 확인: 참가자가 남아 있으면 실패로 보고
    const remaining = (await db.collection(`${base}/students`).count().get()).data().count;
    if (remaining > 0) {
      return NextResponse.json({ ok: false, error: `참가자 ${remaining}명이 삭제되지 않았어요. 다시 시도해주세요.` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, sessionCode, deleted });
  } catch (e) {
    console.error("[reset] failed:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "초기화 중 오류: " + msg.slice(0, 200) }, { status: 500 });
  }
}
