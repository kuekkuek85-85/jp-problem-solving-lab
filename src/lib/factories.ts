import type { ProjectDoc, StudentDoc, Level } from "./types";

export function parseStudentNo(studentNo: string): { grade: number; class: number; number: number } {
  // 5자리 학번: 2학년 3반 1번 -> 20301
  const digits = studentNo.padStart(5, "0");
  const grade = Number(digits.slice(0, 1));
  const klass = Number(digits.slice(1, 3));
  const number = Number(digits.slice(3, 5));
  return { grade, class: klass, number };
}

export function emptyStudent(params: {
  studentId: string;
  name: string;
  studentNo: string;
  now: number;
}): StudentDoc {
  const { grade, class: klass, number } = parseStudentNo(params.studentNo);
  return {
    studentId: params.studentId,
    name: params.name,
    studentNo: params.studentNo,
    grade,
    class: klass,
    number,
    joinedAt: params.now,
    lastActiveAt: params.now,
    level: "growing",
    diagnostic: null,
    ethicsPledge: { checkedAll: false, pledgedAt: null },
    trafficLight: null,
    stamps: [],
    badges: [],
    activeRequestId: null,
    activeProjectId: null,
    activeStep: null,
    helperModeOn: false,
  };
}

export function emptyProject(params: {
  id: string;
  requestId: string;
  requestTitle: string;
  now: number;
  level: Level;
}): ProjectDoc {
  return {
    id: params.id,
    requestId: params.requestId,
    requestTitle: params.requestTitle,
    startedAt: params.now,
    completedAt: null,
    currentStep: "analyze",
    analyze: { who: "", when: "", what: "", benefit: "" },
    prd: {
      problem: "",
      oneLiner: "",
      users: [],
      usersNote: "",
      coreFeatures: ["", "", ""],
      niceToHave: "",
      aiFeature: { needed: "", description: "" },
      screen: "",
      screenImageUrl: "",
      dataToStore: "",
      successMetric: "",
      ethicsCheck: {
        privacy: { checked: false, note: "" },
        copyright: { checked: false, note: "" },
        fairness: { checked: false, note: "" },
      },
    },
    prdHints: {},
    grillme: { questions: [], answers: [], callCount: 0 },
    codingNotes: "",
    codingFirstDone: false,
    submission: { url: "", oneLiner: "", slidesHtml: null, submittedAt: null },
    deepDive: { suggestions: [], chosen: null, completed: false },
  };
}

export function generateSessionCode(): string {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += digits[Math.floor(Math.random() * digits.length)];
  return code;
}
