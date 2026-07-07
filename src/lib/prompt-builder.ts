import type { ProjectDoc } from "./types";

export function buildCanvaPrompt(project: ProjectDoc): string {
  const { prd, requestTitle } = project;
  const ethicsLine = `이 사이트는 개인정보를 저장하지 않고(${prd.ethicsCheck.privacy.note || "필요한 경우에만 최소한으로"}), 저작권을 지키며(${
    prd.ethicsCheck.copyright.note || "출처를 표시하고"
  }), 특정 사람을 차별하지 않도록(${prd.ethicsCheck.fairness.note || "누구나 편하게 쓸 수 있도록"}) 만들어주세요.`;

  const lines = [
    `[의뢰] ${requestTitle}`,
    `[한 줄 소개] ${prd.oneLiner}`,
    `[사용자] ${prd.usersNote}`,
    `[꼭 필요한 기능] ${prd.coreFeatures.filter(Boolean).join(" / ")}`,
    prd.niceToHave ? `[있으면 좋은 기능] ${prd.niceToHave}` : "",
    prd.aiFeature.needed === "yes" ? `[AI 기능] ${prd.aiFeature.description}` : "[AI 기능] 사용하지 않음",
    `[화면 구성] ${prd.screen}`,
    `[저장할 정보] ${prd.dataToStore}`,
    `[성공 기준] ${prd.successMetric}`,
    `[지켜야 할 것] ${ethicsLine}`,
  ].filter(Boolean);

  return lines.join("\n");
}
