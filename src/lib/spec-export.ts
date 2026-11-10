import type { ProjectDoc, StudentDoc } from "./types";

// 참가자의 '나의 가치관(harness)'을 AGENTS.md(에이전트 지침 파일)로. Lovable·Codex·Claude Code 등이 읽는다.
export function buildAgentsMd(student: StudentDoc): string {
  const h = student.harness?.trim() || "(아직 '나의 가치관'을 적지 않았어요. 작업 화면 상단 「🧭 나의 가치관」에서 적을 수 있어요.)";
  return `# AGENTS.md — 나의 가치관(개발 원칙)

> AI가 이 프로젝트를 도울 때 항상 지킬 원칙입니다. (Lovable·Codex·Claude Code 등이 이 파일을 참고합니다.)

${h}
`;
}

// 의뢰 분석 + 설계도(PRD) + 수용 기준 + 플로우 다이어그램을 하나의 spec.md로.
export function buildSpecMd(project: ProjectDoc): string {
  const { analyze, prd, requestTitle, flowMermaid } = project;
  const core = prd.coreFeatures.filter(Boolean).map((f, i) => `  ${i + 1}. ${f}`).join("\n") || "  (미작성)";
  const accept = (prd.acceptanceCriteria ?? "")
    .split("\n")
    .map((s) => s.replace(/^[\s\-·•*]+/, "").trim())
    .filter(Boolean)
    .map((s) => `- [ ] ${s}`)
    .join("\n") || "- (미작성)";
  const flow = flowMermaid?.trim()
    ? "```mermaid\n" + flowMermaid.trim() + "\n```"
    : "_(아직 생성 안 됨 — 설계 단계에서 '플로우 다이어그램'을 생성하세요)_";
  const schemaSection = project.schemaMermaid?.trim()
    ? `\n\n## 4. 데이터 스키마 (DB 설계)\n\`\`\`mermaid\n${project.schemaMermaid.trim()}\n\`\`\``
    : "";

  return `# spec.md — ${requestTitle}

## 1. 문제 정의 (의뢰 분석)
- 누가: ${analyze.who || "-"}
- 언제: ${analyze.when || "-"}
- 무엇 때문에: ${analyze.what || "-"}
- 해결되면 좋은 점: ${analyze.benefit || "-"}

## 2. 설계도 (PRD)
- 한 줄 소개: ${prd.oneLiner || "-"}
- 사용자: ${prd.usersNote || "-"}
- 꼭 필요한 기능:
${core}
- 있으면 좋은 기능: ${prd.niceToHave || "-"}
- AI 기능: ${prd.aiFeature?.needed === "yes" ? prd.aiFeature.description : "없음"}
- 화면 구성: ${prd.screen || "-"}
- 저장할 정보: ${prd.dataToStore || "-"}
- 성공 기준: ${prd.successMetric || "-"}

### 수용 기준 (완성 판단 체크리스트)
${accept}

### 지켜야 할 것 (윤리)
- 🔒 개인정보: ${prd.ethicsCheck?.privacy.note || "-"}
- ©️ 저작권: ${prd.ethicsCheck?.copyright.note || "-"}
- 🤝 공정성: ${prd.ethicsCheck?.fairness.note || "-"}

## 3. 플로우 다이어그램
${flow}${schemaSection}
`;
}

export type PromptMode = "single" | "app";

// 구현 프롬프트. single = 하나의 통합 HTML 파일 / app = 편하게 구현 + 제출용 단일 HTML 별도 생성.
export function buildCodingPrompt(project: ProjectDoc, mode: PromptMode): string {
  const target = project.prd.oneLiner?.trim() || project.requestTitle;
  if (mode === "single") {
    return `# 구현 요청

함께 제공한 **AGENTS.md**(지킬 원칙)와 **spec.md**(기획·설계·플로우차트)를 기반으로 구현해줘.

**${target}**을(를) **하나의 통합 HTML 파일(index.html)** 로 만들어줘.
- 외부 서버 없이 그 파일 하나만으로 동작하게 (필요한 CSS·JS는 파일 안에 인라인).
- spec.md의 '꼭 필요한 기능'과 '수용 기준'을 모두 충족할 것.
- AGENTS.md의 원칙을 지킬 것.
- 완성 후, 스스로 수용 기준을 1차로 점검하고 빠진 부분을 보완해줘.`;
  }
  return `# 구현 요청

함께 제공한 **AGENTS.md**(지킬 원칙)와 **spec.md**(기획·설계·플로우차트)를 기반으로 **${target}**을(를) 편한 구조로 구현해줘.
- spec.md의 '꼭 필요한 기능'과 '수용 기준'을 충족할 것.
- AGENTS.md의 원칙을 지킬 것.
- 완성 후, 스스로 수용 기준을 1차로 점검하고 보완해줘.

구현이 끝나면, **발표·제출용으로 핵심 화면을 담은 단일 HTML 파일(index.html)** 도 별도로 만들어줘. (외부 서버 없이 그 파일만으로 동작)`;
}
