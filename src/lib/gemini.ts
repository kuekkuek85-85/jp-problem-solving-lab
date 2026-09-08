import { GoogleGenerativeAI } from "@google/generative-ai";

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
  if (!client) client = new GoogleGenerativeAI(apiKey);
  return client;
}

// 서버 라우트 전용: 학생 개인정보(실명·학번)를 프롬프트에 포함하지 않는다.
export async function generateJson<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const model = getClient().getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
    generationConfig: { responseMimeType: "application/json" },
  });

  const result = await model.generateContent(userPrompt);
  const text = result.response.text();
  // 모델이 간혹 ```json 코드펜스로 감싸거나 앞뒤에 설명을 붙일 수 있어, JSON 본문만 안전하게 추출한다.
  return JSON.parse(extractJson(text)) as T;
}

function extractJson(raw: string): string {
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const first = t.search(/[[{]/);
  const last = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (first >= 0 && last > first) t = t.slice(first, last + 1);
  return t;
}

export async function generateText(systemPrompt: string, userPrompt: string): Promise<string> {
  const model = getClient().getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  });
  const result = await model.generateContent(userPrompt);
  return result.response.text();
}
