import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);
const LAB = "main";
const APPLY = process.argv.includes("--apply");

const subsSnap = await db.collection(`sessions/${LAB}/submissions`).get();
const existing = new Set(subsSnap.docs.map((d) => d.id));
console.log("현재 submissions 문서:", existing.size, "건\n");

const students = await db.collection(`sessions/${LAB}/students`).get();
const missing = [];

for (const s of students.docs) {
  const sd = s.data();
  const projects = await db.collection(`sessions/${LAB}/students/${s.id}/projects`).get();
  for (const p of projects.docs) {
    const pd = p.data();
    if (pd.currentStep === "done" && !existing.has(p.id)) {
      missing.push({ studentId: s.id, student: sd, projectId: p.id, project: pd });
    }
  }
}

console.log("=== 제출 완료(done)인데 submissions 문서가 없는 프로젝트 ===", missing.length, "건");
for (const m of missing) {
  console.log(` - ${m.student.name} (${m.studentId}) | ${m.project.requestTitle} | url:${JSON.stringify(m.project.submission?.url)} | html?:${!!m.project.submission?.html}`);
}

if (!APPLY) {
  console.log("\n(미적용 모드) 실제 백필하려면 --apply 옵션으로 다시 실행하세요.");
  process.exit(0);
}

console.log("\n백필 시작...");
for (const m of missing) {
  const pd = m.project;
  const sub = pd.submission ?? {};
  await db.doc(`sessions/${LAB}/submissions/${m.projectId}`).set({
    projectId: m.projectId,
    requestId: pd.requestId,
    requestTitle: pd.requestTitle,
    studentId: m.studentId,
    studentName: m.student.name,
    level: m.student.level,
    oneLiner: sub.oneLiner ?? "",
    url: sub.url ?? "",
    html: sub.html ?? null,
    htmlFileName: sub.htmlFileName ?? null,
    slidesHtml: sub.slidesHtml ?? null,
    badges: m.student.badges ?? [],
    submittedAt: sub.submittedAt ?? pd.completedAt ?? Date.now(),
  });
  console.log(`  ✓ ${m.student.name} · ${pd.requestTitle}`);
}
console.log("\n백필 완료:", missing.length, "건");
process.exit(0);
