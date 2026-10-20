// 교사 연수 "사무실 뷰"용 에셋 — Higgsfield(gpt_image_2_5)로 생성 후 배경 제거 처리.
// 이 세션 컨테이너의 egress 정책이 Higgsfield CDN 호스트 직접 다운로드를 막아
// 저장소에 파일로 넣지 못하므로, 생성된 CDN URL을 런타임에 직접 참조한다.
// (교체가 필요하면 아래 URL만 바꾸면 됨)

export const OFFICE_BG_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_3KL2Zzu4Y4bwglKcNcx5yltzwk6/hf_20261020_230542_62298523-0ce1-48ed-8ade-9ef0ed2d3b6c.png";

// 참가자 구분용 캐릭터 6종(투명 배경). studentId 해시로 1명당 하나를 고정 배정한다.
export const OFFICE_AVATARS: string[] = [
  "https://d8j0ntlcm91z4.cloudfront.net/user_3KL2Zzu4Y4bwglKcNcx5yltzwk6/hf_20261020_231342_3e671def-d431-474c-a658-13920d7ceae3.png",
  "https://d8j0ntlcm91z4.cloudfront.net/user_3KL2Zzu4Y4bwglKcNcx5yltzwk6/hf_20261020_231345_b984e058-c95a-42b0-8fda-6814752ace6f.png",
  "https://d8j0ntlcm91z4.cloudfront.net/user_3KL2Zzu4Y4bwglKcNcx5yltzwk6/hf_20261020_231348_0c6f95d4-a88a-478b-b387-45516b25608d.png",
  "https://d8j0ntlcm91z4.cloudfront.net/user_3KL2Zzu4Y4bwglKcNcx5yltzwk6/hf_20261020_231351_d7ca678c-0891-4784-8b48-4194feb7efea.png",
  "https://d8j0ntlcm91z4.cloudfront.net/user_3KL2Zzu4Y4bwglKcNcx5yltzwk6/hf_20261020_231353_1ddfa925-0f7a-4abb-8bc1-27049388bd1c.png",
  "https://d8j0ntlcm91z4.cloudfront.net/user_3KL2Zzu4Y4bwglKcNcx5yltzwk6/hf_20261020_231356_e849a520-783f-4d39-8db1-1434c60eea30.png",
];

// studentId를 안정적으로 아바타 인덱스로 매핑(djb2 해시).
export function avatarForId(id: string): string {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) >>> 0;
  return OFFICE_AVATARS[h % OFFICE_AVATARS.length];
}

// 참가자가 온라인(작업 중)으로 간주되는 시간 창. 학생 화면이 30초마다 하트비트를 보낸다.
export const OFFICE_ONLINE_WINDOW_MS = 90_000;
