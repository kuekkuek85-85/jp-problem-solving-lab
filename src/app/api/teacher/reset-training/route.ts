import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { checkTeacherPin } from "../../_lib/auth";
import { LAB_ID } from "@/lib/constants";

// 연수(참가자) 데이터만 초기화.
// 이름으로 입장한 연수 참가자는 ID가 'edu-'로 시작하고, 학생은 5자리 숫자 학번이다.
// → 'edu-' 참가자와 그들의 프로젝트·제출물·성찰·도움요청·반응만 삭제하고,
//   학번 학생의 데이터는 그대로 보존한다. 공식 의뢰 카운터는 남은 데이터 기준으로 재계산.
const isTraining = (id: string) => id.startsWith("edu-");

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!checkTeacherPin(body.pin)) {
    return NextResponse.json({ ok: false, error: "PIN이 올바르지 않습니다." }, { status: 401 });
  }
  const sessionCode: string = body.sessionCode || LAB_ID;
  const base = `sessions/${sessionCode}`;
  const db = getAdminDb();

  const sessionSnap = await db.doc(base).get();
  if (!sessionSnap.exists) {
    return NextResponse.json({ ok: false, error: "연구소가 아직 열리지 않았어요." }, { status: 404 });
  }

  try {
    const [studentsSnap, submissionsSnap, reflectionsSnap, helpSnap, reactionsSnap, requestsSnap] = await Promise.all([
      db.collection(`${base}/students`).get(),
      db.collection(`${base}/submissions`).get(),
      db.collection(`${base}/reflections`).get(),
      db.collection(`${base}/helpRequests`).get(),
      db.collection(`${base}/reactions`).get(),
      db.collection(`${base}/requests`).get(),
    ]);

    const eduStudents = studentsSnap.docs.filter((d) => isTraining(d.id));
    const eduIds = new Set(eduStudents.map((d) => d.id));

    // 삭제될 연수 제출물의 projectId(반응 정리·발표 상태 정리에 사용)
    const eduProjectIds = new Set<string>();
    submissionsSnap.docs.forEach((d) => {
      if (eduIds.has((d.data().studentId as string) ?? "")) eduProjectIds.add(d.id);
    });

    // 1) 연수 참가자 문서 삭제(프로젝트 하위컬렉션까지)
    for (const s of eduStudents) {
      await db.recursiveDelete(s.ref);
    }

    // 2) 나머지 연수 데이터 일괄 삭제 + 공식 의뢰 카운터 재계산
    const remainingStudents = studentsSnap.docs.filter((d) => !isTraining(d.id));
    const remainingSubs = submissionsSnap.docs.filter((d) => !eduIds.has((d.data().studentId as string) ?? ""));

    const batch = db.batch();
    let deleted = 0;

    submissionsSnap.docs.forEach((d) => {
      if (eduIds.has((d.data().studentId as string) ?? "")) { batch.delete(d.ref); deleted++; }
    });
    reflectionsSnap.docs.forEach((d) => {
      if (isTraining(d.id)) { batch.delete(d.ref); deleted++; }
    });
    helpSnap.docs.forEach((d) => {
      if (eduIds.has((d.data().requesterId as string) ?? "")) { batch.delete(d.ref); deleted++; }
    });
    reactionsSnap.docs.forEach((d) => {
      if (eduProjectIds.has((d.data().targetProjectId as string) ?? "")) { batch.delete(d.ref); deleted++; }
    });

    // 의뢰: 연수 참가자가 올린 제보 의뢰는 삭제, 공식/남은 의뢰는 카운터 재계산
    requestsSnap.docs.forEach((d) => {
      const r = d.data();
      if (r.source === "student" && eduIds.has((r.proposedByStudentId as string) ?? "")) {
        batch.delete(d.ref);
        deleted++;
        return;
      }
      const activeSolverIds = remainingStudents
        .filter((s) => (s.data().activeRequestId as string) === d.id)
        .map((s) => s.id);
      const submissionCount = remainingSubs.filter((s) => (s.data().requestId as string) === d.id).length;
      batch.update(d.ref, { activeSolverIds, submissionCount });
    });

    await batch.commit();

    // 3) 발표 상태가 삭제된 연수 제출물을 가리키면 해제(학생 발표는 건드리지 않음)
    const presRef = db.doc(`${base}/meta/presentation`);
    const presSnap = await presRef.get();
    if (presSnap.exists && eduProjectIds.has((presSnap.data()?.activeSubmissionId as string) ?? "")) {
      await presRef.set({ activeSubmissionId: null, slideIndex: 0, presenterName: null, updatedAt: Date.now() });
    }

    return NextResponse.json({ ok: true, removedParticipants: eduStudents.length, removedDocs: deleted, keptStudents: remainingStudents.length });
  } catch (e) {
    console.error("[reset-training] failed:", e);
    return NextResponse.json({ ok: false, error: "초기화 중 오류가 발생했어요. 다시 시도해주세요." }, { status: 500 });
  }
}
