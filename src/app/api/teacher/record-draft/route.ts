import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { generateJson, generateText } from "@/lib/gemini";
import { checkTeacherPin } from "../../_lib/auth";
import { LAB_ID } from "@/lib/constants";
import type { HelpRequestDoc, ProjectDoc, ReflectionDoc, StudentDoc } from "@/lib/types";

// 생기부(창의적 체험활동 동아리활동 특기사항 / 교과 세부능력 및 특기사항) 문구 초안 생성.
// 학생의 활동 데이터를 서버에서 모아 '비식별' 상태로 Gemini에 전달하고, 교사가 검토·수정할 초안을 돌려준다.
// 실명·학번은 프롬프트에 포함하지 않는다(개인정보처리방침 준수).

const SYSTEM = `당신은 대한민국 중학교 교사의 학교생활기록부(창의적 체험활동 '동아리활동' 특기사항, 또는 교과 '세부능력 및 특기사항') 문구 작성을 돕는 보조자입니다. 아래 규칙을 반드시 지켜 '초안'을 작성합니다.

[작성 규칙]
1. 제공된 활동 '사실'에만 근거합니다. 근거 없는 추측·과장·미사여구 나열을 금지합니다.
2. 문장 종결은 명사형 어미('~함', '~하였음', '~을 보임', '~에 기여함')로 통일합니다. '학생은/그는' 같은 주어나 이름을 쓰지 않습니다.
3. 특정 상표·제품·서비스명(예: 캔바, Canva, Lovable, Replit, Gemini, ChatGPT, Claude, 엔트리 등)은 절대 쓰지 않고 일반명사로 바꿉니다: '생성형 AI', 'AI 코딩 도구', '노코드 웹 제작 도구', '블록형 프로그래밍 도구', 'AI 이미지 인식 도구', '교육용 로봇' 등.
4. 성적·석차·수치 등급·대회 수상·교외 활동·가정환경 등은 쓰지 않습니다.
5. 입력에 실명·학번 등 개인정보가 섞여 있어도 문구에는 포함하지 않습니다.
6. 학생의 '역량과 성장' 중심으로 서술합니다: 문제 발견·정의력, 창의적 설계, 디지털·AI 리터러시, 정보윤리 의식, 자기주도성, 협업·나눔, 성찰을 통한 성장.
7. 분량은 공백 포함 250~450자 내외의, 자연스럽게 이어지는 하나의 특기사항 문단으로 작성합니다.
8. 활동 근거가 빈약하면 무리하게 늘리지 말고, 확인된 사실만으로 짧고 담백하게 작성합니다.`;

const OUT_JSON = `\n\n[출력 형식] 아래 JSON 하나만 출력합니다(코드펜스·설명 없이).
{"draft": "특기사항 문단 텍스트", "basis": ["문구가 근거한 활동 사실 3~6개(교사 검토용, 짧은 구)"]}`;

const OUT_TEXT = `\n\n[출력 형식] 특기사항 문단 텍스트만 출력합니다. 머리말·설명·JSON·따옴표 없이 문단만 작성합니다.`;

// 오류 원인을 교사에게 간결히 노출(진단용). 민감정보는 담기지 않는다.
function reason(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.replace(/\s+/g, " ").slice(0, 240);
}

function summarizeProject(p: ProjectDoc, idx: number): string {
  const lines: string[] = [`[의뢰 ${idx + 1}] ${p.requestTitle} (진행상태: ${p.currentStep === "done" ? "완료·제출" : p.currentStep})`];
  const a = p.analyze ?? ({} as ProjectDoc["analyze"]);
  if (a.who || a.what || a.benefit) {
    lines.push(`- 문제 정의: 누가=${a.who || "-"}, 무엇 때문에=${a.what || "-"}, 해결되면=${a.benefit || "-"}`);
  }
  const prd = p.prd ?? ({} as ProjectDoc["prd"]);
  if (prd.oneLiner) lines.push(`- 한 줄 소개: ${prd.oneLiner}`);
  const core = (prd.coreFeatures ?? []).filter(Boolean);
  if (core.length) lines.push(`- 핵심 기능: ${core.join(" / ")}`);
  if (prd.aiFeature?.needed === "yes" && prd.aiFeature.description) lines.push(`- 설계한 AI 기능: ${prd.aiFeature.description}`);
  if (prd.successMetric) lines.push(`- 성공 기준: ${prd.successMetric}`);
  const ethicsNotes = [prd.ethicsCheck?.privacy?.note, prd.ethicsCheck?.copyright?.note, prd.ethicsCheck?.fairness?.note].filter(Boolean);
  if (ethicsNotes.length) lines.push(`- 정보윤리 고려(개인정보/저작권/공정성): ${ethicsNotes.join(" / ")}`);
  const gq = p.grillme?.questions ?? [];
  const ga = p.grillme?.answers ?? [];
  if (gq.length) {
    const qa = gq.map((q, i) => `Q:${q.text} → A:${ga[i] ?? "-"}`).slice(0, 4).join(" | ");
    lines.push(`- AI의 날카로운 질문에 대한 답변(비판적 사고): ${qa}`);
  }
  if (p.codingNotes) lines.push(`- 제작 메모: ${p.codingNotes}`);
  if (p.submission?.oneLiner) lines.push(`- 산출물 소개: ${p.submission.oneLiner}${p.submission.url || p.submission.html ? " (실제 결과물 제출함)" : ""}`);
  return lines.join("\n");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!checkTeacherPin(body.pin)) {
    return NextResponse.json({ ok: false, error: "PIN이 올바르지 않습니다." }, { status: 401 });
  }
  const sessionCode: string = body.sessionCode || LAB_ID;
  const studentId: string = body.studentId;
  if (!studentId) {
    return NextResponse.json({ ok: false, error: "studentId가 필요합니다." }, { status: 400 });
  }

  let student: StudentDoc;
  let projects: ProjectDoc[];
  let reflection: ReflectionDoc | null;
  let helpedOthers = 0;
  let askedHelp = 0;
  try {
    const db = getAdminDb();
    const base = `sessions/${sessionCode}`;
    const [studentSnap, projectsSnap, reflectionSnap, helpSnap] = await Promise.all([
      db.doc(`${base}/students/${studentId}`).get(),
      db.collection(`${base}/students/${studentId}/projects`).get(),
      db.doc(`${base}/reflections/${studentId}`).get(),
      db.collection(`${base}/helpRequests`).get(),
    ]);
    if (!studentSnap.exists) {
      return NextResponse.json({ ok: false, error: "학생을 찾을 수 없습니다." }, { status: 404 });
    }
    student = studentSnap.data() as StudentDoc;
    projects = projectsSnap.docs.map((d) => d.data() as ProjectDoc);
    reflection = reflectionSnap.exists ? (reflectionSnap.data() as ReflectionDoc) : null;
    const helps = helpSnap.docs.map((d) => d.data() as HelpRequestDoc);
    helpedOthers = helps.filter((h) => h.helperId === studentId).length;
    askedHelp = helps.filter((h) => h.requesterId === studentId).length;
  } catch (e) {
    console.error("[record-draft] DB read failed:", e);
    return NextResponse.json({ ok: false, error: "활동 데이터를 불러오지 못했어요: " + reason(e) }, { status: 500 });
  }

  const levelText = { seedling: "새싹(기초)", growing: "성장(자기주도)", sharing: "나눔(심화·공유)" }[student.level] ?? student.level;
  const doneCount = projects.filter((p) => p.currentStep === "done").length;

  const digest: string[] = [
    `수준 코스: ${levelText}`,
    `맡은 의뢰 수: ${projects.length}건(완료·제출 ${doneCount}건)`,
    projects.length ? projects.map(summarizeProject).join("\n\n") : "아직 맡은 의뢰가 없음.",
  ];
  if (helpedOthers > 0) digest.push(`동료를 도운 횟수: ${helpedOthers}회(협업·나눔 근거)`);
  if (askedHelp > 0) digest.push(`막혔을 때 도움을 요청해 해결한 횟수: ${askedHelp}회(자기조절·문제해결 근거)`);
  if (reflection) {
    digest.push(
      `성찰: 뿌듯한 점=${reflection.proud || "-"} / 어려웠던 점=${reflection.hard || "-"} / AI를 그대로 믿지 않고 확인한 경험=${reflection.aiLiteracy || "-"} / 더 해보고 싶은 것=${reflection.next || "-"}`
    );
  }

  const userPrompt = `다음은 한 학생이 '문제해결 연구소(AI 바이브 코딩)' 동아리 활동에서 남긴 활동 기록입니다(비식별). 이를 근거로 규칙에 맞는 생기부 특기사항 초안을 작성하세요.\n\n${digest.join("\n")}`;

  // 1차: 구조화(JSON) 생성. 실패하면 2차: 평문 문단으로 폴백해 최대한 초안을 돌려준다.
  let draft = "";
  let basis: string[] = [];
  try {
    const result = await generateJson<{ draft: string; basis: string[] }>(SYSTEM + OUT_JSON, userPrompt);
    draft = (result.draft ?? "").trim();
    basis = Array.isArray(result.basis) ? result.basis : [];
  } catch (e1) {
    console.error("[record-draft] JSON gen failed, falling back to text:", e1);
    try {
      draft = (await generateText(SYSTEM + OUT_TEXT, userPrompt)).trim();
    } catch (e2) {
      console.error("[record-draft] text gen failed:", e2);
      return NextResponse.json({ ok: false, error: "AI 초안 생성 실패: " + reason(e2) }, { status: 500 });
    }
  }

  if (!draft) {
    return NextResponse.json({ ok: false, error: "초안이 비어 있어요. 활동 기록이 충분한지 확인 후 다시 시도해주세요." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, draft, basis });
}
