import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase/client";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB (storage.rules와 맞춤)
export const MAX_INLINE_HTML_BYTES = 600 * 1024; // 인라인 렌더용 HTML은 Firestore 문서에 저장하므로 작게 제한

export function isHtmlFile(file: File): boolean {
  return /\.html?$/i.test(file.name) || file.type === "text/html";
}

// 확장자 제한 없이 임의 파일을 Firebase Storage에 올리고 다운로드 URL을 돌려준다.
export async function uploadSubmissionFile(
  sessionCode: string,
  studentId: string,
  projectId: string,
  file: File
): Promise<{ url: string; fileName: string }> {
  const safeName = file.name.replace(/[^\w.\-가-힣]/g, "_") || "file";
  const path = `sessions/${sessionCode}/submissions/${studentId}/${projectId}/${Date.now()}_${safeName}`;
  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type || "application/octet-stream" });
  const url = await getDownloadURL(r);
  return { url, fileName: file.name };
}
