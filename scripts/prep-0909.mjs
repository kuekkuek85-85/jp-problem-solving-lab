import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// constants.ts와 동일하게 유지(SEED_REQUESTS[0], SEED_SLIDES의 '캔바 코드로 만들기 ①' 슬라이드)
const boothReq = {
  title: "🎪 장평제 축제 부스 프로그램 만들기",
  summary: "장평제(학교 축제) 부스에서 친구들이 즐길 프로그램을 직접 만들어요. 캐주얼 게임, 카메라로 인식하는 AI 게임(엔트리), 햄스터 로봇 미로탈출·축구 등 무엇이든 좋아요!",
  difficulty: "growing",
};
const newCodingSlide = `# 🧑‍💻 캔바 코드로 만들기 ①
**먼저 캔바에 로그인해요 (Pro 무료 사용!)**
- 아래 링크로 로그인하면 캔바 **Pro**를 쓸 수 있어요.
- 👉 [캔바 Pro 초대 링크 열기](https://www.canva.com/brand/join?token=SzX1bRZsMAJe5nNeK4T89g&brandingVariant=edu&referrer=team-invite)
- (그냥 가입해도 되지만, 이 링크로 들어와야 Pro 기능이 열려요.)

**그다음 프롬프트를 붙여넣어요**
- "코딩 프롬프트 만들기" 버튼 → 설계도가 자동으로 프롬프트가 돼요.
- **복사** 후 캔바 코드에 붙여넣으면 사이트가 만들어져요.
- 💡 캔바 코드가 기본이지만, 오늘은 **Gemini Canvas · Lovable · Replit** 계정도 열려 있어요. 같은 프롬프트를 그대로 붙여넣어 만들면 돼요!`;

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

// 1) 장평제 부스 의뢰를 live 의뢰 목록에 추가 — 제목 중복 시 건너뜀
const reqCol = db.collection(`sessions/${LAB}/requests`);
const existing = await reqCol.where("title", "==", boothReq.title).get();

console.log("=== 의뢰 추가 ===");
if (!existing.empty) {
  console.log(`이미 존재함(건너뜀): ${boothReq.title}`);
} else {
  console.log(`추가 예정: ${boothReq.title} [${boothReq.difficulty}]`);
  if (APPLY) {
    const ref = reqCol.doc();
    await ref.set({
      id: ref.id,
      title: boothReq.title,
      summary: boothReq.summary,
      difficulty: boothReq.difficulty,
      source: "official",
      status: "in_progress",
      approvalStatus: "approved",
      proposedByStudentId: null,
      proposedByStudentName: null,
      rejectReason: null,
      activeSolverIds: [],
      submissionCount: 0,
      createdAt: Date.now(),
    });
    console.log(`  ✓ 추가됨 (id: ${ref.id})`);
  }
}

// 2) 코딩 슬라이드(캔바 코드로 만들기 ①) 문구를 최신 문구로 교체
const sessRef = db.doc(`sessions/${LAB}`);
const sess = await sessRef.get();
const slides = sess.data()?.slides ?? [];

console.log("\n=== 코딩 슬라이드 갱신 ===");
let changed = false;
const updated = slides.map((s) => {
  if (typeof s.markdown === "string" && s.markdown.startsWith("# 🧑‍💻 캔바 코드로 만들기 ①")) {
    if (s.markdown !== newCodingSlide) {
      changed = true;
      console.log(`슬라이드 #${s.index} 교체 예정`);
      return { ...s, markdown: newCodingSlide };
    }
  }
  return s;
});
if (!changed) {
  console.log("변경할 슬라이드 없음(이미 최신이거나 해당 슬라이드 없음).");
} else if (APPLY) {
  await sessRef.update({ slides: updated });
  console.log("  ✓ 세션 슬라이드 갱신됨");
}

if (!APPLY) console.log("\n(미적용 모드) 실제 반영하려면 --apply 옵션으로 다시 실행하세요.");
process.exit(0);
