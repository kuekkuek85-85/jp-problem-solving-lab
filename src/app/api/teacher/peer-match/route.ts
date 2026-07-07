import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { checkTeacherPin } from "../../_lib/auth";

// 5단계(동료 검토) 진입 대기 중인 연구원을 랜덤 매칭한다(홀수 시 3인 순환).
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
  const studentsSnap = await db.collection(`sessions/${sessionCode}/students`).get();

  type Candidate = { studentId: string; name: string; projectId: string };
  const candidates: Candidate[] = [];

  for (const studentDoc of studentsSnap.docs) {
    const student = studentDoc.data();
    const activeProjectId = student.activeProjectId as string | null;
    if (!activeProjectId) continue;
    const projectSnap = await db
      .doc(`sessions/${sessionCode}/students/${studentDoc.id}/projects/${activeProjectId}`)
      .get();
    const project = projectSnap.data();
    if (!project) continue;
    if (project.peerMatch?.targetProjectId) continue; // 이미 매칭됨
    candidates.push({ studentId: studentDoc.id, name: student.name, projectId: activeProjectId });
  }

  if (candidates.length < 2) {
    return NextResponse.json({ ok: false, error: "매칭할 연구원이 2명 이상 필요합니다." }, { status: 400 });
  }

  // 셔플
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const batch = db.batch();
  const pairUpdate = (a: Candidate, b: Candidate) => {
    batch.update(db.doc(`sessions/${sessionCode}/students/${a.studentId}/projects/${a.projectId}`), {
      peerMatch: {
        targetProjectId: b.projectId,
        targetStudentId: b.studentId,
        targetName: b.name,
        feedbackGiven: null,
        feedbackReceived: null,
      },
    });
  };

  if (candidates.length % 2 === 0) {
    for (let i = 0; i < candidates.length; i += 2) {
      pairUpdate(candidates[i], candidates[i + 1]);
      pairUpdate(candidates[i + 1], candidates[i]);
    }
  } else {
    // 마지막 3명은 순환 매칭(A->B->C->A)
    const evenPart = candidates.slice(0, candidates.length - 3);
    for (let i = 0; i < evenPart.length; i += 2) {
      pairUpdate(evenPart[i], evenPart[i + 1]);
      pairUpdate(evenPart[i + 1], evenPart[i]);
    }
    const [a, b, c] = candidates.slice(candidates.length - 3);
    pairUpdate(a, b);
    pairUpdate(b, c);
    pairUpdate(c, a);
  }

  await batch.commit();
  return NextResponse.json({ ok: true, matched: candidates.length });
}
