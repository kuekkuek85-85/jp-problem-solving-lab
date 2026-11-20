// AI 응답을 일반 텍스트 화면에 그대로 보여줄 때, 마크다운 기호(**, __, `, # 머리말)가 노출되지 않도록 제거한다.
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[a-z]*\n?/gi, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*/g, "")
    .trim();
}
