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
}

export interface DiagnosticAnswers {
  answers: number[]; // 5개 문항 점수(0~2)
  score: number;
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
  ethicsPledge: EthicsPledge;
  trafficLight: TrafficLight;
  stamps: number[]; // 1..5
  badges: Badge[];
  activeRequestId: string | null;
  activeProjectId: string | null;
  activeStep: ProjectStep | null; // 현재 활성 프로젝트 진행 단계(교사 로스터 상황 표시용 비정규화)
  helperModeOn?: boolean;
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
  oneLiner: string;
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
  slidesHtml: string | null;
  badges: Badge[];
  submittedAt: number;
}

export type HelpCategory = "prd" | "prompt" | "canva" | "error" | "etc";
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
  createdAt: number;
}

export interface ReflectionDoc {
  studentId: string;
  proud: string;
  hard: string;
  aiLiteracy: string;
  next: string;
  submittedAt: number;
}
