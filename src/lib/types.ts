// 장평 문제해결연구소 — 공용 타입 정의 (PRD 섹션 5 데이터 모델 기준)

export type Level = "seedling" | "growing" | "sharing"; // 🌱새싹 🌿성장 🌳나눔

export type Stage =
  | "onboarding" // 0
  | "board" // 0.5
  | "lecture" // 1
  | "analyze" // 2
  | "prd" // 3
  | "grillme" // 4
  | "coding" // 5
  | "submit" // 6
  | "gallery" // 7
  | "closing"; // 8

export const STAGE_ORDER: Stage[] = [
  "onboarding",
  "board",
  "lecture",
  "analyze",
  "prd",
  "grillme",
  "coding",
  "submit",
  "gallery",
  "closing",
];

export const STAGE_LABELS: Record<Stage, string> = {
  onboarding: "연구원 등록",
  board: "의뢰 게시판",
  lecture: "브리핑",
  analyze: "의뢰 분석",
  prd: "설계도 작성",
  grillme: "AI Grill Me 검토",
  coding: "바이브 코딩",
  submit: "해결안 제출",
  gallery: "해결 보고회",
  closing: "수료·성찰",
};

export const LEVEL_LABELS: Record<Level, { emoji: string; name: string; tagline: string }> = {
  seedling: { emoji: "🌱", name: "새싹", tagline: "차근차근 함께 가요" },
  growing: { emoji: "🌿", name: "성장", tagline: "스스로 도전해요" },
  sharing: { emoji: "🌳", name: "나눔", tagline: "더 깊이 + 친구와 나눠요" },
};

export type TrafficLight = "red" | "yellow" | "green" | null;

export type Badge = "ready" | "helper" | "challenger";

export interface Slide {
  index: number;
  markdown: string;
  imageUrl?: string;
}

export interface SessionDoc {
  createdAt: number;
  teacherPinHash: string;
  currentStage: Stage;
  currentSlideIndex: number;
  lectureMode: boolean;
  presentingSubmissionId?: string | null;
  slides: Slide[];
}

export type RequestDifficulty = Level;
export type RequestSource = "official" | "student";
export type RequestStatus = "in_progress"; // P2: "open" | "in_progress" | "done"
export type ApprovalStatus = "approved" | "pending" | "rejected";

export interface RequestDoc {
  id: string;
  title: string;
  summary: string;
  difficulty: RequestDifficulty;
  source: RequestSource;
  status: RequestStatus;
  approvalStatus: ApprovalStatus;
  proposedByStudentId?: string | null;
  proposedByStudentName?: string | null;
  rejectReason?: string | null;
  activeSolverIds: string[];
  submissionCount: number;
  createdAt: number;
  // true이면 단계(분석·설계도·Grill Me·코딩)를 생략하고 산출물만 내는 간단 제출 의뢰(예: 축제 부스).
  directSubmit?: boolean;
}

export interface DiagnosticAnswers {
  answers: number[]; // 5개 문항 점수(0~2)
  score: number;
}

// 교사 연수 참가자(이름 로그인)용 사전 설문
export interface TrainingSurvey {
  tools: string[]; // 사용해 본 도구(복수)
  toolsOther: string; // 기타(주관식)
  vibeExperience: "yes" | "no"; // 바이브 코딩 경험
  vibeApps: string; // 만들어 본 앱(있다일 때, 콤마 구분)
  workIdea: string; // 오늘 만들고 싶은 업무 아이디어
  antiOutsourcing: string; // 사고의 외주화 방지 노력(선택)
  submittedAt: number;
}

export interface EthicsPledge {
  checkedAll: boolean;
  pledgedAt: number | null;
}

export interface StudentDoc {
  studentId: string; // 5자리 학번, doc id
  name: string;
  studentNo: string;
  grade: number;
  class: number;
  number: number;
  joinedAt: number;
  lastActiveAt: number;
  level: Level;
  diagnostic: DiagnosticAnswers | null;
  trainingSurvey?: TrainingSurvey | null; // 교사 연수 참가자 사전 설문(이름 로그인 시)
  ethicsPledge: EthicsPledge;
  trafficLight: TrafficLight;
  stamps: number[]; // 1..5
  badges: Badge[];
  activeRequestId: string | null;
  activeProjectId: string | null;
  activeStep: ProjectStep | null; // 현재 활성 프로젝트 진행 단계(교사 로스터 상황 표시용 비정규화)
  helperModeOn?: boolean;
  editMode?: boolean; // 제출 완료 해결안을 다시 열어 설계도·산출물을 수정 중일 때
  instructorFeedback?: { text: string; sentAt: number } | null; // 교사 연수: 강사(이승엽)가 보낸 피드백
}

export interface AnalyzeData {
  who: string;
  when: string;
  what: string;
  benefit: string;
}

export interface EthicsCheckItem {
  checked: boolean;
  note: string;
}

export interface PrdData {
  problem: string; // 2단계 자동 불러오기
  oneLiner: string;
  users: string[];
  usersNote: string;
  coreFeatures: string[]; // 최대 3개, 순위
  niceToHave: string;
  aiFeature: { needed: "yes" | "no" | ""; description: string };
  screen: string;
  screenImageUrl?: string;
  dataToStore: string;
  successMetric: string;
  ethicsCheck: {
    privacy: EthicsCheckItem;
    copyright: EthicsCheckItem;
    fairness: EthicsCheckItem;
  };
}

export type GrillmeQuestionType = "feature" | "data" | "ethics";

export interface GrillmeQuestion {
  text: string;
  type: GrillmeQuestionType;
}

export interface GrillmeData {
  questions: GrillmeQuestion[];
  answers: string[];
  callCount: number;
}

export interface SubmissionData {
  url: string;
  html: string | null; // 학생이 URL 대신 업로드한 HTML 파일 내용(있으면 바로 렌더링)
  htmlFileName: string | null;
  oneLiner: string;
  usage?: string | null; // 간단 제출(축제 부스): 사용법 설명
  etc?: string | null; // 간단 제출: 기타 메모
  slidesHtml: string | null;
  submittedAt: number | null;
}

export interface DeepDiveData {
  suggestions: string[];
  chosen: string | null;
  completed: boolean;
}

export type ProjectStep = "analyze" | "prd" | "grillme" | "coding" | "submit" | "done";

export interface ProjectDoc {
  id: string;
  requestId: string;
  requestTitle: string;
  startedAt: number;
  completedAt: number | null;
  currentStep: ProjectStep;
  analyze: AnalyzeData;
  prd: PrdData;
  prdHints: Record<string, number>;
  grillme: GrillmeData;
  codingNotes: string;
  codingFirstDone: boolean;
  submission: SubmissionData;
  deepDive: DeepDiveData;
}

// 해결 보고회(갤러리) 조회용 평면화된 제출물 요약 문서
export interface SubmissionSummaryDoc {
  projectId: string;
  requestId: string;
  requestTitle: string;
  studentId: string;
  studentName: string;
  level: Level;
  oneLiner: string;
  url: string;
  html: string | null;
  htmlFileName: string | null;
  usage?: string | null;
  etc?: string | null;
  slidesHtml: string | null;
  badges: Badge[];
  submittedAt: number;
}

export type HelpCategory = "design" | "build" | "debug" | "etc";
export type HelpStatus = "open" | "claimed" | "resolved";

export interface HelpRequestDoc {
  id: string;
  requesterId: string;
  requesterName: string;
  stage: Stage;
  category: HelpCategory;
  memo: string;
  status: HelpStatus;
  helperId: string | null;
  helperName: string | null;
  createdAt: number;
  resolvedAt: number | null;
  confirmedHelpful: boolean | null;
}

export interface ReactionDoc {
  id: string;
  targetProjectId: string;
  fromName: string;
  emoji?: string;
  comment?: string;
  // 교사 연수 동료 검토용(reactions 재사용)
  kind?: "peer";
  reviewerId?: string;
  good?: string;
  improve?: string;
  createdAt: number;
}

// 발표회(해결 보고회) 동기화 상태 — sessions/{lab}/meta/presentation 단일 문서
export interface PresentationState {
  activeSubmissionId: string | null; // 발표 중인 제출물(projectId), null이면 발표 없음
  slideIndex: number;
  presenterName: string | null;
  updatedAt: number;
}

export interface ReflectionDoc {
  studentId: string;
  proud: string;
  hard: string;
  aiLiteracy: string;
  next: string;
  submittedAt: number;
}
