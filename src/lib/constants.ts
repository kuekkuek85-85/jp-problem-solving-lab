import type { Level } from "./types";

export const LAB_NAME = "장평 문제해결연구소";
export const CLUB_NAME = "하트이로봇 동아리";

// 학생용은 sessions/main, 교사 연수는 기수별로 sessions/{training, training2, ...} 로
// 데이터를 완전히 분리한다. (같은 연수를 여러 기수로 진행해도 서로 섞이지 않음)
export const LAB_ID = "main"; // 학생용(기본)
export const TRAINING_LAB_ID = "training"; // 교사 연수 1기(10/21) — 하위호환 유지

// 교사 연수 기수(코호트). id가 Firestore sessions/{id} 서브트리이며, date는 화면 표기용.
export interface TrainingCohort { id: string; no: number; label: string; date: string }
export const TRAINING_COHORTS: TrainingCohort[] = [
  { id: "training", no: 1, label: "교사 연수 1기", date: "10/21" },
  { id: "training2", no: 2, label: "교사 연수 2기", date: "10/28" },
];

// 이름(성함)만으로 입장하는 연수 참가자가 기본 배정되는 '현재 진행' 연수.
// 새 기수를 시작하면 이 값만 해당 id로 바꾸면 된다.
export const ACTIVE_TRAINING_LAB_ID = "training2"; // 2기(10/28)

const TRAINING_LAB_IDS = new Set(TRAINING_COHORTS.map((c) => c.id));
export const isTrainingLab = (sessionCode: string) => TRAINING_LAB_IDS.has(sessionCode);

export function trainingCohort(sessionCode: string): TrainingCohort | null {
  return TRAINING_COHORTS.find((c) => c.id === sessionCode) ?? null;
}
// 화면 표기용 라벨: "교사 연수 2기 (10/28)"
export function trainingLabel(sessionCode: string): string {
  const c = trainingCohort(sessionCode);
  return c ? `${c.label} (${c.date})` : "교사 연수";
}

// 교사 연수 참가자(이름 로그인, id 'edu-')에게는 '친구'를 '동료'로 표기한다. 학생에겐 그대로.
export function peerText(studentId: string, text: string): string {
  return studentId.startsWith("edu-") ? text.replace(/친구/g, "동료") : text;
}

// ── 0단계(A) 수준 자가 진단 5문항 ────────────────────────────────
export interface DiagnosticQuestion {
  id: string;
  text: string;
  options: string[]; // 점수 0,1,2
}

export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: "q1",
    text: "AI로 웹/앱을 만들어 본 적 있나요?",
    options: ["없다", "1~2번", "여러 번"],
  },
  {
    id: "q2",
    text: "\"프롬프트\"가 뭔지 친구에게 설명할 수 있나요?",
    options: ["아직 어렵다", "대충 안다", "자신 있다"],
  },
  {
    id: "q3",
    text: "캔바 코드 같은 도구를 써본 적 있나요?",
    options: ["없다", "1~2번", "여러 번"],
  },
  {
    id: "q4",
    text: "오늘 만들고 싶은 게 머릿속에 있나요?",
    options: ["아직 없다", "어렴풋이 있다", "확실히 있다"],
  },
  {
    id: "q5",
    text: "새로운 걸 배울 때 나는?",
    options: ["천천히 확실하게", "보통", "일단 빨리 해보는 편"],
  },
];

export function levelFromScore(score: number): Level {
  // 5문항 x 0~2점 = 0~10점
  if (score <= 3) return "seedling";
  if (score <= 7) return "growing";
  return "sharing";
}

// ── 교사 연수 사전 설문 ──────────────────────────────────────
export const TRAINING_TOOLS: string[] = [
  "Canva AI",
  "Antigravity",
  "Claude Code",
  "Codex",
  "Lovable",
  "Replit",
  "Cursor",
];

export const VIBE_CODING_ONELINE =
  "바이브 코딩이란, 코드를 직접 작성하지 않고 AI에게 자연어로 요청해 앱·웹을 만들어내는 방식이에요.";

export function levelFromSurvey(s: {
  tools: string[];
  toolsOther: string;
  vibeExperience: "yes" | "no";
  vibeApps: string;
}): Level {
  if (s.vibeExperience === "no") return "seedling";
  const toolCount = s.tools.length + (s.toolsOther.trim() ? 1 : 0);
  if (toolCount >= 3 || s.vibeApps.trim()) return "sharing";
  return "growing";
}

// ── 0단계(B) AI 윤리 가이드 체크 서약 ────────────────────────────
export const ETHICS_PLEDGE_ITEMS: string[] = [
  "AI 결과를 그대로 믿지 않고 내가 한 번 더 확인할게요",
  "다른 사람의 개인정보(이름·사진·연락처)를 함부로 넣지 않을게요",
  "다른 사람의 이미지·글 출처를 지킬게요",
  "내 사이트가 누군가를 불편하게 하거나 차별하지 않는지 생각할게요",
  "AI는 나의 도구, 생각과 결정은 내가 해요",
];

// ── 스탬프 ────────────────────────────────────────────────────
export const STAMP_LABELS: Record<number, string> = {
  1: "① 의뢰 분석",
  2: "② 설계도 작성",
  3: "③ AI Grill Me 검토",
  4: "④ 바이브 코딩",
  5: "⑤ 해결안 제출",
};

export const STAMP_NUMBERS = [1, 2, 3, 4, 5];

// ── 설계도(PRD) 10항목 정의 ───────────────────────────────────
export interface PrdFieldDef {
  id: string;
  label: string;
  hint: string; // 성장 코스용 정적 힌트
  deepQuestion: string; // 나눔 코스용 심화 유도 질문
}

export const PRD_FIELDS: PrdFieldDef[] = [
  { id: "problem", label: "1. 문제 상황", hint: "의뢰 분석에서 쓴 내용을 다시 확인해보세요.", deepQuestion: "이 문제, 정말 이 학교에서만 생기는 문제일까요?" },
  { id: "oneLiner", label: "2. 해결 아이디어 한 줄 소개", hint: "\"OO 하는 사람을 위한 OO 서비스\" 형식으로 써보세요.", deepQuestion: "한 문장으로 설명했을 때 친구가 바로 이해할 수 있나요?" },
  { id: "users", label: "3. 사용하는 사람", hint: "실제로 이 화면을 누를 사람을 구체적으로 떠올려보세요.", deepQuestion: "가장 불편해할 사용자와 가장 자주 쓸 사용자가 같은 사람일까요?" },
  { id: "coreFeatures", label: "4. 꼭 필요한 기능 3가지", hint: "없으면 서비스가 성립하지 않는 기능만 골라 순위를 매겨보세요.", deepQuestion: "이 3가지가 없으면 사용자는 어떤 대안을 쓸까요?" },
  { id: "niceToHave", label: "5. 있으면 좋은 기능", hint: "당장은 없어도 되지만 있으면 더 좋은 기능을 적어보세요.", deepQuestion: "이 기능은 나중에 심화 도전 때 추가해도 되지 않을까요?" },
  { id: "aiFeature", label: "6. AI 기능 넣기", hint: "AI가 꼭 필요한 지점인지 먼저 생각해보세요. 불필요도 정답일 수 있어요!", deepQuestion: "AI를 뺐을 때 서비스가 더 간단하고 정직해지지는 않나요?" },
  { id: "screen", label: "7. 화면 그리기", hint: "글로 설명하거나 손그림 사진을 올려도 좋아요.", deepQuestion: "처음 보는 친구가 이 화면만 보고 뭘 해야 할지 알 수 있나요?" },
  { id: "dataToStore", label: "8. 저장할 정보", hint: "이름·기록처럼 계속 남아야 하는 정보를 적어보세요.", deepQuestion: "이 정보 중 개인정보로 볼 수 있는 게 있나요? 꼭 저장해야 하나요?" },
  { id: "successMetric", label: "9. 성공의 기준", hint: "\"이렇게 되면 성공이다\"를 숫자나 상태로 표현해보세요.", deepQuestion: "한 달 뒤에도 이 기준으로 성공을 판단할 수 있을까요?" },
  { id: "ethicsCheck", label: "10. 지켜야 할 것(윤리 체크)", hint: "🔒개인정보 / ©️저작권 / 🤝공정성, 세 가지를 하나씩 확인해보세요.", deepQuestion: "이 중 우리 서비스에서 가장 지키기 어려운 건 무엇이고, 왜 그럴까요?" },
];

// ── 새싹 코스 프리필 예시 (의뢰별이 아닌 범용 예시 — 의뢰 제목으로 치환) ──
export const SEEDLING_ANALYZE_TEMPLATE = {
  who: "이 문제로 불편함을 겪는 학생들",
  when: "이 문제가 자주 발생하는 상황일 때",
  what: "필요한 정보를 빠르게 찾을 방법이 없어서",
  benefit: "필요한 정보를 쉽고 빠르게 확인할 수 있어요",
};

export const SEEDLING_PRD_TEMPLATE = {
  oneLiner: "불편함을 겪는 사람들을 위한 간단한 안내 서비스",
  usersNote: "이 문제를 직접 겪는 학생·선생님",
  niceToHave: "알림 기능이나 즐겨찾기 기능",
  screen: "제목 - 안내 목록 - 자세히 보기 버튼 순서로 화면을 구성해요.",
  dataToStore: "안내에 필요한 목록 정보(이름, 상태 등)",
  successMetric: "사용자가 원하는 정보를 3번 이내 클릭으로 찾을 수 있다.",
};

// ── 의뢰 게시판 초기 시드 데이터(교사 준비 공식 의뢰) ────────────
export const SEED_REQUESTS: { title: string; summary: string; difficulty: Level; directSubmit?: boolean }[] = [
  { title: "컴퓨터실 예약", summary: "여러 학급이 겹치지 않게 컴퓨터실을 예약할 수 있는 서비스", difficulty: "growing" },
  { title: "분실물 안내", summary: "학교에서 주운 분실물을 등록하고 찾아갈 수 있게 안내하는 서비스", difficulty: "seedling" },
  { title: "하트이로봇 동아리 홍보·포트폴리오", summary: "동아리 활동을 소개하고 결과물을 모아 보여주는 포트폴리오 사이트", difficulty: "growing" },
  { title: "아리수 인식개선", summary: "학교 수돗물(아리수)에 대한 오해를 풀고 인식을 개선하는 안내 서비스", difficulty: "seedling" },
  { title: "학교 소식 알림이", summary: "학교의 새 소식을 놓치지 않게 모아서 보여주는 알림 서비스", difficulty: "growing" },
  { title: "급식 안내 + 잔반 줄이기", summary: "오늘 급식을 안내하고 잔반을 줄이기 위한 캠페인 서비스", difficulty: "seedling" },
  { title: "체육관/운동장 사용 신청", summary: "체육관과 운동장 사용 일정을 신청하고 확인하는 서비스", difficulty: "growing" },
  { title: "교과서/준비물 알리미", summary: "과목별로 챙겨야 할 교과서와 준비물을 알려주는 서비스", difficulty: "seedling" },
  { title: "도서관 희망도서 신청·투표", summary: "읽고 싶은 책을 신청하고 다른 학생들과 투표하는 서비스", difficulty: "growing" },
  { title: "학교 시설 불편 신고", summary: "고장나거나 불편한 학교 시설을 사진과 함께 신고하는 서비스", difficulty: "growing" },
  { title: "그린스마트 미래학교 의견함", summary: "학교 리모델링에 대한 학생 의견을 모으는 의견함 서비스", difficulty: "sharing" },
  { title: "분리수거 가이드·실천 랭킹", summary: "올바른 분리수거 방법을 안내하고 실천을 독려하는 서비스", difficulty: "growing" },
  { title: "다국어 가정통신문 변환기(이주배경 학생)", summary: "가정통신문을 여러 언어로 바꿔주는 서비스", difficulty: "sharing" },
  { title: "어려운 안내문을 쉬운 말로 바꿔주는 도우미", summary: "어려운 학교 안내문을 쉬운 말로 풀어주는 서비스", difficulty: "sharing" },
  { title: "단계별 그림 안내(느린 학습자)", summary: "복잡한 절차를 그림과 단계로 쉽게 안내하는 서비스", difficulty: "sharing" },
];

// 교사 연수용(sessions/training) 샘플 의뢰 — 행정 업무 중심. 학생용과 완전히 분리.
// 2기(10/28) 주제: 선생님 각자의 '교과 수업 플랫폼' 또는 '수행평가 도구'를 직접 만든다.
// 아래는 예시 주제로, 참가자는 하나를 고르거나 '+ 의뢰 등록 요청'으로 본인 교과 아이디어를 올려도 된다.
export const SEED_REQUESTS_TRAINING: { title: string; summary: string; difficulty: Level; directSubmit?: boolean }[] = [
  { title: "형성평가 퀴즈 앱", summary: "수업 중 교과 개념 퀴즈를 내고 학생 응답을 자동 채점·집계해 보여주는 도구", difficulty: "growing" },
  { title: "수행평가 루브릭 채점 도구", summary: "평가 기준(루브릭)별로 점수를 입력하면 합산·등급·피드백 문구를 만들어주는 도구", difficulty: "growing" },
  { title: "서술형 답안 자기점검 체크리스트", summary: "학생이 기준에 맞게 자기 답안을 점검하고 보완점을 확인하는 도구", difficulty: "seedling" },
  { title: "모둠활동 역할·진행 보드", summary: "모둠별 역할 분담과 활동 진행 상황을 함께 보고 기록하는 수업 보드", difficulty: "seedling" },
  { title: "차시별 수업자료·과제 안내 사이트", summary: "교과 차시별 학습자료·과제·링크를 모아 학생에게 안내하는 미니 사이트", difficulty: "seedling" },
  { title: "실시간 의견 수합(투표·워드클라우드)", summary: "수업 중 질문에 학생이 응답하면 실시간으로 모아 보여주는 참여 도구", difficulty: "growing" },
  { title: "개념 플래시카드 학습 도구", summary: "교과 핵심 개념을 카드로 익히고 스스로 점검하는 복습 도구", difficulty: "growing" },
  { title: "독서·탐구 활동 기록장", summary: "학생이 활동을 기록하고 교사가 피드백을 남기는 교과 활동 기록 도구", difficulty: "sharing" },
];

// ── 브리핑 슬라이드 자동 생성(단계별 교사 안내) ──────────────────
// 연구소 개소 시 자동으로 등록되어, 교사가 수정 없이 바로 브리핑할 수 있다.
export const SEED_SLIDES: string[] = [
  `# 🔬🤖 오늘의 문제해결연구소
- 우리는 오늘 **연구원**이 되어 장평중의 불편함(의뢰)을 해결해요.
- AI로 웹/앱을 뚝딱 만들어보는 **바이브 코딩** 수업이에요.
- 흐름: 의뢰 맡기 → 분석 → 설계도 → Grill Me → 바이브 코딩 → 해결안 제출 → 해결 보고회`,

  `# 🛡️ 오늘 우리가 AI를 안전하게 쓰는 이유
- 학생 계정으로 직접 AI에 접속하지 않아요.
- 모든 AI 요청은 학교 서버를 통해서만 전달돼요.
- 이름·학번 같은 개인정보는 AI에게 보내지 않아요.
- 캔바 코드는 선생님이 초대한 관리된 계정에서만 사용해요.`,

  `# 🧭 플랫폼 메뉴 살펴보기
- **의뢰 게시판**: 해결할 의뢰를 고르는 곳
- **내 해결안**: 진행 중·완료한 의뢰 모아보기
- **신호등**: 🟢순조로워요 🟡조금 막혔어요 🔴도움이 필요해요
- **Help Me 버튼**: 막히면 눌러서 선생님께 도움 요청`,

  `# 🎖️ 연구원 등록
- **수준 자가 진단** 5문항 (등수·비교 없어요!)
- 결과로 🌱새싹 / 🌿성장 / 🌳나눔 코스 배정
- **AI 윤리 서약** 5가지를 읽고 체크하면 연구원증 발급`,

  `# 📌 의뢰 분석 (문제 정의)
- 맡은 의뢰를 **내 말로** 다시 정의해요.
- **누가 · 언제 · 무엇 때문에** 불편한지, 해결되면 **무엇이 좋아지는지**
- 4칸을 채우면 한 문장으로 자동 정리돼요.`,

  `# 📐 설계도 작성 (10항목)
1. 문제 상황  2. 한 줄 소개  3. 사용하는 사람
4. 꼭 필요한 기능 3가지  5. 있으면 좋은 기능  6. AI 기능(필요/불필요)
7. 화면 그리기  8. 저장할 정보  9. 성공의 기준
10. **지켜야 할 것**(🔒개인정보 ©️저작권 🤝공정성)`,

  `# 🔥 AI Grill Me 검토란?
- AI 코치가 내 설계도의 **허점을 날카롭게 질문**해요(윤리 질문 1개 포함).
- 질문에 답한 뒤, 그 내용을 바탕으로 **설계도를 직접 다듬어요**.
- 목표는 정답 맞히기가 아니라 **설계를 더 탄탄하게** 만드는 것!`,

  `# 🧑‍💻 캔바 코드로 만들기 ①
**먼저 캔바에 로그인해요 (Pro 무료 사용!)**
- 아래 링크로 로그인하면 캔바 **Pro**를 쓸 수 있어요.
- 👉 [캔바 Pro 초대 링크 열기](https://www.canva.com/brand/join?token=SzX1bRZsMAJe5nNeK4T89g&brandingVariant=edu&referrer=team-invite)
- (그냥 가입해도 되지만, 이 링크로 들어와야 Pro 기능이 열려요.)

**그다음 프롬프트를 붙여넣어요**
- "코딩 프롬프트 만들기" 버튼 → 설계도가 자동으로 프롬프트가 돼요.
- **복사** 후 캔바 코드에 붙여넣으면 사이트가 만들어져요.
- 💡 캔바 코드가 기본이지만, 오늘은 **Gemini Canvas · Lovable · Replit** 계정도 열려 있어요. 같은 프롬프트를 그대로 붙여넣어 만들면 돼요!`,

  `# 🛠️ 캔바 코드, 이런 것도 돼요 ②
프롬프트만으로 설계도의 기능을 대부분 붙일 수 있어요!
- 💾 **데이터 저장(DB)** → **캔바 시트(Canva Sheets)** 로 정보를 저장해요.
- 🤖 **AI 기능** → **캔바 AI**를 프롬프트로 바로 추가해요.
- 🖼️ **사진 업로드** → 이미지를 올려서 화면에 넣을 수 있어요.
- 만들다 막히면 신호등·Help Me 버튼을 활용하세요.`,

  `# 🚀 해결안 제출
- 완성한 산출물의 **링크(URL)** 와 **한 줄 소개**를 제출해요.
- 제출하면 스탬프가 완성되고, **새 의뢰**를 맡을 수도 있어요.`,

  `# 🏆 해결 보고회
- 친구들의 해결안을 함께 보고 **이모지·댓글**로 응원해요.
- 서로의 아이디어에서 배우는 시간이에요.`,

  `# ✍️ 성찰 후기 작성
- ① 가장 뿌듯한 순간  ② 어려웠던 점
- ③ **AI가 만든 것 중 그대로 믿으면 안 됐던 부분? 어떻게 확인했나요?**
- ④ 실제 학교에서 쓰려면 무엇을 더 해야 할까요?
- 수료증을 인쇄하며 오늘을 마무리해요.`,
];

// ── 교사 연수용 브리핑 슬라이드(2기: 내 교과 도구 만들기 — Codex/Claude Code + 배포) ──
// 교사 대시보드 '브리핑 슬라이드'에서 버튼으로 불러온다. 공용 기본 슬라이드와 별도.
export const SEED_SLIDES_TRAINING: string[] = [
  `# 🔬🤖 교사 연수 — 내 교과 수업 도구 만들기
- 선생님이 **연구원**이 되어, **내 교과 수업 플랫폼** 또는 **수행평가 도구**를 직접 만들어요.
- 아이디어 → 설계도 → **GitHub 저장소** → AI 코딩으로 **MVP** → **Gemini API**(AI) → **Firestore**(DB) → **Vercel 배포**
- 도구는 **Codex 또는 Claude Code** 중 편한 것으로!`,

  `# 🧭 오늘의 전체 흐름 (한눈에)
1. 주제 정하기(의뢰) → 2. 의뢰 분석 → 3. 설계도(MVP 명세) → 4. AI Grill Me 검토
5. **GitHub 저장소** 만들기 → 6. **Codex/Claude Code**로 MVP 구현(틈틈이 push)
7. **Gemini API**로 AI 기능 → 8. **Firestore**로 DB → 9. **Vercel** 배포 → 10. 제출·공유`,

  `# 🎯 오늘의 주제
- **내 교과 수업 플랫폼** 또는 **내 교과 수행평가 도구** 중 하나를 만들어요.
- 예: 형성평가 퀴즈 앱 · 수행평가 루브릭 채점 도구 · 실시간 의견 수합 · 플래시카드 · 활동 기록장
- 거창하지 않아도 돼요. **오늘 내 수업에 바로 쓸 작은 도구** 하나!`,

  `# ✅ 준비물 체크리스트(계정)
- 🧑‍💻 **AI 코딩 도구**: ChatGPT **Plus**(Codex) 또는 Claude **Pro or Max**(Claude Code) 중 하나
- 🐙 **GitHub** 계정 (저장소 만들기)
- 🔵 **Google** 계정 (Gemini API 키 + Firebase)
- ▲ **Vercel** 계정 (배포 — GitHub와 연동 가능)
- 로그인·가입이 막히면 바로 **🙋 도움 요청**하세요.`,

  `# 💻 오늘의 도구 — Codex 또는 Claude Code (택1)
- 본인이 **유료 구독 중인(편한) 것 하나**를 고르면 돼요.
- **Codex**(OpenAI, ChatGPT **Plus**): [https://chatgpt.com/ko-KR/download](https://chatgpt.com/ko-KR/download) 에서 ChatGPT 앱 설치 → Plus 계정 로그인 → **Codex** 열기
- **Claude Code**(Anthropic, Claude **Pro/Max**): [https://claude.com/ko/product/claude-code](https://claude.com/ko/product/claude-code) 에서 Claude Code 앱 설치 → Pro or Max 계정 로그인 → **Claude Code** 열기
- ⚠️ 공식 경로로만 설치. 설치가 막히면 **강사에게 요청** 🙋`,

  `# 🛡️ AI를 안전하게 쓰는 원칙
- 학생·학부모의 **개인정보·평가 데이터는 프롬프트/코드에 그대로 넣지 않기**
- **API 키·비밀번호는 공개 저장소에 올리지 않기**(.env, 환경변수 사용)
- AI 결과를 **그대로 믿지 않고 한 번 더 검토**, 저작권·공정성 고려`,

  `# 🎖️ 연구원 등록
- **성함만 입력**하면 입장할 수 있어요. (로그인 화면 → '이름으로 입장(연수)')
- 간단 자가진단 + AI 윤리 서약을 마치면 바로 활동 시작
- 수준(🌱새싹/🌿성장/🌳나눔)은 비교·평가가 아니라 안내용이에요.`,

  `# 📌 1단계 · 주제 고르기 + 의뢰 분석
- 의뢰 게시판에서 주제를 고르거나 **'+ 의뢰 등록 요청'** 으로 내 아이디어 등록
- **누가 · 언제 · 무엇 때문에** 필요한지, 만들면 **무엇이 좋아지는지**
- 막연한 생각을 **구체적인 문제/목표**로 좁혀요.`,

  `# 📐 2단계 · 설계도(MVP 명세) 작성
- 한 줄 소개 · 사용자 · **꼭 필요한 기능 3가지**(MVP) · AI 기능 · 화면 · 저장할 정보 · 성공 기준
- **MVP = 가장 작동하는 최소 버전**. 처음엔 기능 1~2개부터!
- **지켜야 할 것**: 🔒개인정보 ©️저작권 🤝공정성`,

  `# 🔥 3단계 · AI Grill Me 검토
- AI 코치가 설계도의 **허점을 날카롭게 질문**해요(윤리 질문 포함).
- 질문에 답하면서 **설계도를 직접 더 탄탄하게** 다듬습니다.
- 여기서 다듬은 설계도가 그대로 **AI 코딩 프롬프트**가 됩니다.`,

  `# 🐙 4단계 · GitHub 저장소 만들기
- [https://github.com](https://github.com) → **New repository** 로 내 프로젝트 저장소를 만들어요.
- Codex/Claude Code에게 "이 저장소에서 작업해줘"라고 시키고, **틈틈이 커밋·push**!
- push해 두면 **되돌리기·공유·배포**가 쉬워져요. (오늘의 작업 기록이 남아요)`,

  `# ⚡ 5단계 · Codex/Claude Code로 MVP 구현
- 설계도(프롬프트)를 그대로 도구에 주고 **MVP부터** 만들어요.
- 실행해 보고 "버튼 크게", "목록으로 보여줘"처럼 **대화하듯** 고쳐요.
- 막히면 **오류 메시지를 그대로 붙여넣고 "이 오류 고쳐줘"**`,

  `# 🤖 6단계 · Gemini API로 AI 기능 붙이기
- **Google AI Studio**([https://aistudio.google.com](https://aistudio.google.com))에서 **Gemini API 키 발급**
- 도구에게 "이 키로 Gemini를 호출해서 요약/채점/추천 기능을 넣어줘"라고 요청
- ⚠️ **키는 .env(환경변수)에** 두고, GitHub에는 올리지 않기!`,

  `# 💾 7단계 · Firestore(DB)로 데이터 저장
- **Firebase 콘솔**([https://console.firebase.google.com](https://console.firebase.google.com))에서 프로젝트 생성 → **Firestore** 켜기
- "입력한 내용을 Firestore에 저장하고 목록으로 보여줘"처럼 요청
- 학생 개인정보·평가 데이터는 **최소한만**, 접근 규칙도 함께 설정`,

  `# ▲ 8단계 · Vercel로 배포 + 제출·공유
- **Vercel**([https://vercel.com](https://vercel.com))에 **GitHub 연동** → 내 저장소로 **New Project → Deploy**
- 환경변수(Gemini 키 등)는 Vercel 설정에 등록
- 완성된 **배포 링크 + 저장소 링크**를 제출하고, 해결 보고회에서 서로 피드백!`,

  `# ✍️ 성찰 · 내 수업 적용
- 오늘 만든 도구를 **내 수업·평가에 어떻게** 쓸 수 있을까요?
- AI가 만든 것 중 **꼭 확인·수정해야 했던 부분**은 무엇이었나요?
- 실제로 적용하려면 **무엇을 더** 해야 할까요?`,
];

export const HELP_CATEGORY_LABELS: Record<string, string> = {
  design: "설계",
  build: "구현",
  debug: "디버깅",
  etc: "기타",
};

export const REFLECTION_QUESTIONS = [
  { id: "proud", label: "① 가장 뿌듯한 순간은?" },
  { id: "hard", label: "② 어려웠던 점은?" },
  { id: "aiLiteracy", label: "③ AI가 만든 것 중 그대로 믿으면 안 됐던 부분은? 어떻게 확인했나요?" },
  { id: "next", label: "④ 실제 학교에서 쓰려면 무엇을 더 해야 할까요?" },
] as const;

// 교사 연수용 성찰 문항(3문항). ReflectionDoc 필드(proud/aiLiteracy/next)에 매핑.
export const REFLECTION_QUESTIONS_TRAINING = [
  { id: "proud", label: "① 오늘 연수에서 얻은 인사이트는?" },
  { id: "aiLiteracy", label: "② 생성형 인공지능을 사용할 때 사고의 외주화를 막는 아이디어는?" },
  { id: "next", label: "③ 향후 학교에 돌아가서 나의 다짐" },
] as const;

export function reflectionQuestionsForLab(sessionCode: string) {
  return isTrainingLab(sessionCode) ? REFLECTION_QUESTIONS_TRAINING : REFLECTION_QUESTIONS;
}

// lab(학생용/연수용)에 맞는 시드 선택
export function seedRequestsForLab(sessionCode: string) {
  return isTrainingLab(sessionCode) ? SEED_REQUESTS_TRAINING : SEED_REQUESTS;
}
export function seedSlidesForLab(sessionCode: string) {
  return isTrainingLab(sessionCode) ? SEED_SLIDES_TRAINING : SEED_SLIDES;
}
