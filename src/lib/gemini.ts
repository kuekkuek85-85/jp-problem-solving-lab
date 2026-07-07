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
  return JSON.parse(text) as T;
}

export async function generateText(systemPrompt: string, userPrompt: string): Promise<string> {
  const model = getClient().getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  });
  const result = await model.generateContent(userPrompt);
  return result.response.text();
}
