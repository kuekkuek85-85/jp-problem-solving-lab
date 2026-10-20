import { getAdminDb } from "@/lib/firebase/admin";

// 참가자 ID 기준으로 '지울 대상'만 선택해 초기화하는 공통 로직.
// - 연수 참가자(이름 로그인): ID 'edu-' 접두
// - 학생(학번 로그인): 5자리 숫자 ID
// shouldRemove(id)가 true인 참가자와 그들의 프로젝트·제출물·성찰·도움요청·반응만 삭제하고,
// 나머지 참가자 데이터는 보존한다. 공식 의뢰 카운터는 '남은' 데이터 기준으로 재계산.
export async function resetScoped(
  sessionCode: string,
  shouldRemove: (studentId: string) => boolean
): Promise<{ removedParticipants: number; removedDocs: number; keptStudents: number }> {
  const base = `sessions/${sessionCode}`;
  const db = getAdminDb();

  const [studentsSnap, submissionsSnap, reflectionsSnap, helpSnap, reactionsSnap, requestsSnap] = await Promise.all([
    db.collection(`${base}/students`).get(),
    db.collection(`${base}/submissions`).get(),
    db.collection(`${base}/reflections`).get(),
    db.collection(`${base}/helpRequests`).get(),
    db.collection(`${base}/reactions`).get(),
    db.collection(`${base}/requests`).get(),
  ]);

  const removeStudents = studentsSnap.docs.filter((d) => shouldRemove(d.id));
  const removeIds = new Set(removeStudents.map((d) => d.id));

  // 삭제될 제출물의 projectId(반응 정리·발표 상태 정리에 사용)
  const removeProjectIds = new Set<string>();
  submissionsSnap.docs.forEach((d) => {
    if (removeIds.has((d.data().studentId as string) ?? "")) removeProjectIds.add(d.id);
  });

  // 1) 대상 참가자 문서 삭제(프로젝트 하위컬렉션까지)
  for (const s of removeStudents) {
    await db.recursiveDelete(s.ref);
  }

  // 2) 나머지 데이터 일괄 삭제 + 공식 의뢰 카운터 재계산
  const remainingStudents = studentsSnap.docs.filter((d) => !removeIds.has(d.id));
  const remainingSubs = submissionsSnap.docs.filter((d) => !removeIds.has((d.data().studentId as string) ?? ""));

  const batch = db.batch();
  let deleted = 0;

  submissionsSnap.docs.forEach((d) => {
    if (removeIds.has((d.data().studentId as string) ?? "")) { batch.delete(d.ref); deleted++; }
  });
  reflectionsSnap.docs.forEach((d) => {
    if (removeIds.has(d.id)) { batch.delete(d.ref); deleted++; }
  });
  helpSnap.docs.forEach((d) => {
    if (removeIds.has((d.data().requesterId as string) ?? "")) { batch.delete(d.ref); deleted++; }
  });
  reactionsSnap.docs.forEach((d) => {
    if (removeProjectIds.has((d.data().targetProjectId as string) ?? "")) { batch.delete(d.ref); deleted++; }
  });

  // 의뢰: 대상 참가자가 올린 제보 의뢰는 삭제, 공식/남은 의뢰는 카운터 재계산
  requestsSnap.docs.forEach((d) => {
    const r = d.data();
    if (r.source === "student" && removeIds.has((r.proposedByStudentId as string) ?? "")) {
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

  // 3) 발표 상태가 삭제된 제출물을 가리키면 해제
  const presRef = db.doc(`${base}/meta/presentation`);
  const presSnap = await presRef.get();
  if (presSnap.exists && removeProjectIds.has((presSnap.data()?.activeSubmissionId as string) ?? "")) {
    await presRef.set({ activeSubmissionId: null, slideIndex: 0, presenterName: null, updatedAt: Date.now() });
  }

  return { removedParticipants: removeStudents.length, removedDocs: deleted, keptStudents: remainingStudents.length };
}

export const isTrainingId = (id: string) => id.startsWith("edu-");
