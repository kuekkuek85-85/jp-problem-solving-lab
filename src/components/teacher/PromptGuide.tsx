"use client";

import { Card } from "@/components/ui";

// 교사 연수용: AI 코딩 입문 교사를 위한 프롬프트/설계도 작성 가이드.
// 핵심 메시지 — "두루뭉실하게 만들어줘"가 아니라, 구체적인 작업지시서(설계도)를 먼저 쓰고 프롬프트로 변환한다.
export function PromptGuide() {
  return (
    <div className="space-y-4">
      <Card className="border-brand-soft bg-brand/5">
        <h3 className="text-base font-black text-brand-deep">🧭 핵심 — 바이브 코딩의 성패는 ‘설계도’에서 갈립니다</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          AI에게 <b>“사이트 하나 만들어줘”</b>처럼 두루뭉실하게 말하면, 두루뭉실한 결과가 나옵니다. 바이브 코딩이라도
          <b> 어떤 기능·화면·색상·레이아웃·상호작용</b>을 원하는지 <b>구체적으로</b> 정해줘야 합니다.
        </p>
        <p className="mt-2 rounded-lg bg-white/70 p-3 text-sm font-bold text-slate-800">
          👉 흐름: <span className="text-brand-deep">구체적인 작업지시서(설계도)에 전부 담기</span> → 이를{" "}
          <span className="text-brand-deep">프롬프트로 간단히 변환</span> → AI에게 전달 → 결과를 보며 <span className="text-brand-deep">대화로 수정</span>
        </p>
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-black text-slate-800">❌ 두루뭉실 vs ✅ 구체적</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-black text-red-600">❌ 이렇게 쓰면 안 돼요</p>
            <ul className="mt-1 space-y-1 text-sm text-slate-700">
              <li>“가정통신문 받는 사이트 만들어줘”</li>
              <li>“예쁘게 만들어줘”</li>
              <li>“설문 사이트 하나 뚝딱”</li>
            </ul>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-black text-emerald-700">✅ 이렇게 구체적으로</p>
            <ul className="mt-1 space-y-1 text-sm text-slate-700">
              <li>“이름·학급을 입력하고 동의/부동의를 고르는 폼”</li>
              <li>“포인트 색은 파란색(#2563eb), 큰 글씨, 둥근 모서리”</li>
              <li>“제출하면 집계 막대그래프에 즉시 반영”</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-1 text-sm font-black text-slate-800">📝 설계도에 꼭 담아야 할 6가지</h3>
        <p className="mb-3 text-xs text-slate-500">이 6가지를 구체적으로 적으면, 프롬프트는 거의 자동으로 완성됩니다.</p>
        <div className="space-y-2 text-sm">
          {[
            ["① 기능", "무엇을 할 수 있어야 하나요?", "예: 신청 입력 → 자동 집계 → 교사용 요약 화면"],
            ["② 화면·레이아웃", "무엇이 어디에 배치되나요?", "예: 상단 제목, 가운데 입력 폼, 하단 집계. 모바일 세로 배치"],
            ["③ 디자인·색상", "어떤 느낌/색/글씨인가요?", "예: 밝고 깔끔, 포인트색 파랑(#2563eb), 큰 글씨, 둥근 모서리"],
            ["④ 상호작용", "누르면·입력하면 어떻게 반응하나요?", "예: 제출 시 즉시 반영, 빈 칸이면 ‘이름을 입력하세요’ 안내"],
            ["⑤ 데이터", "무엇을 저장하고 보여주나요?", "예: 이름·학급·동의여부 저장, 목록/집계로 표시"],
            ["⑥ 사용자·목적", "누가, 왜 쓰나요?", "예: 학부모가 쉽게 회신, 교사는 집계를 한눈에"],
          ].map(([k, q, ex]) => (
            <div key={k} className="rounded-lg bg-slate-50 p-2.5">
              <p className="font-bold text-slate-800">{k} <span className="font-normal text-slate-500">— {q}</span></p>
              <p className="mt-0.5 text-xs text-slate-600">{ex}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-black text-slate-800">🪜 단계별 프롬프트 가이드</h3>
        <div className="space-y-3 text-sm">
          <Step n="1" title="의뢰 분석 (문제 정의)">
            아직 프롬프트 단계가 아니에요. <b>누가·언제·무엇 때문에 불편한지</b>를 한 문장으로 좁힙니다.
            <Example>“교사가 가정통신문 회신을 종이로 받아 손으로 세느라 번거롭다 → 온라인으로 받아 자동 집계하고 싶다.”</Example>
          </Step>
          <Step n="2" title="설계도 작성 (가장 중요!)">
            위 <b>6가지</b>를 최대한 구체적으로 채웁니다. 여기서 구체적일수록 결과가 좋아져요. 색상은 색 이름이나 코드(#2563eb),
            글씨 크기·버튼 크기·배치까지 적어주세요.
          </Step>
          <Step n="3" title="AI Grill Me 검토">
            AI가 설계도의 빈틈을 질문합니다. “빈 칸으로 제출하면?”, “중복 제출은?” 같은 질문에 답하며 설계도를 더 촘촘히 보완하세요.
          </Step>
          <Step n="4" title="바이브 코딩 (설계도 → 프롬프트)">
            설계도를 그대로 프롬프트로 옮깁니다. ‘코딩 프롬프트 복사’를 누르면 설계도가 자동으로 프롬프트가 돼요. 이를
            <b> Codex</b>에 붙여넣고, 결과를 보며 <b>대화로 수정</b>합니다.
            <Example>수정 예: “버튼을 더 크게”, “색을 파란 계열로”, “모바일에서 글씨가 작아요, 키워줘”, “저장 기능 추가해줘”</Example>
            <Example>디버깅 예: “이 오류가 떠요: (오류 메시지 붙여넣기). 원인과 해결 방법을 알려주고 코드를 고쳐줘.”</Example>
          </Step>
        </div>
      </Card>

      <Card className="border-slate-300">
        <h3 className="mb-2 text-sm font-black text-slate-800">✅ 완성형 프롬프트 예시 (복붙용)</h3>
        <p className="mb-2 text-xs text-slate-500">의뢰: ‘가정통신문 회신 취합기’ — 설계도를 프롬프트로 변환한 예</p>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">{`가정통신문 회신을 온라인으로 받고 자동 집계하는 한 페이지 웹을 만들어줘.

[기능]
1) 학부모가 자녀 이름과 학급을 입력하고 '동의/부동의'를 선택해 제출
2) 제출하면 "회신이 접수되었습니다" 안내 표시
3) 교사용 요약 영역에서 동의/부동의 인원과 비율을 실시간 막대그래프로 표시

[화면/레이아웃]
- 상단: 제목과 간단한 안내 문구
- 가운데: 입력 폼(이름 / 학급 / 동의·부동의 라디오 / 제출 버튼)
- 하단: 집계 요약(총 인원, 동의 수, 부동의 수, 막대그래프)
- 모바일에서도 보기 쉽게 세로로 배치

[디자인/색상]
- 밝고 깔끔한 느낌, 포인트 색은 파란색(#2563eb)
- 큰 글씨, 둥근 모서리, 버튼은 눈에 잘 띄게 크게

[상호작용]
- 제출을 누르면 즉시 집계에 반영
- 이름이 비어 있으면 "이름을 입력해주세요" 안내

[데이터]
- 제출 내용(이름/학급/동의여부)을 저장하고 목록으로도 확인

개인정보는 최소한만 받고, 처음 보는 사람도 쉽게 쓸 수 있게 만들어줘.`}</pre>
        <p className="mt-2 text-xs text-slate-500">💡 이 정도로 구체적이면 한 번에 쓸 만한 결과가 나오고, 이후엔 짧은 수정 요청으로 다듬으면 됩니다.</p>
      </Card>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="font-black text-slate-800">
        <span className="mr-1.5 rounded-full bg-brand px-2 py-0.5 text-xs text-white">{n}</span>
        {title}
      </p>
      <div className="mt-1 text-slate-700">{children}</div>
    </div>
  );
}

function Example({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">💬 {children}</p>;
}
