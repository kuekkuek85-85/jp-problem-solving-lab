import Link from "next/link";
import { LAB_NAME } from "@/lib/constants";

export const metadata = {
  title: "이용약관 · 장평 문제해결연구소",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
      <Link href="/" className="text-sm font-bold text-brand hover:underline">
        ← 처음으로
      </Link>
      <h1 className="mt-4 text-2xl font-black text-slate-900">이용약관</h1>
      <p className="mt-1 text-sm text-slate-400">시행일: 2026-07-07</p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-700">
        <section>
          <h2 className="mb-1 font-bold text-slate-900">제1조 (목적)</h2>
          <p>
            본 약관은 {LAB_NAME}(이하 “서비스”)의 이용에 관한 조건과 절차, 이용자와 서비스의 권리·의무를 정하는 것을
            목적으로 합니다. 본 서비스는 장평중학교 하트이로봇 동아리의 교육 활동을 위해 운영되는 비영리 학습 플랫폼입니다.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">제2조 (이용 대상)</h2>
          <p>
            본 서비스는 장평중학교 하트이로봇 동아리 소속 학생(연구원)과 지도교사(연구소장)를 대상으로 합니다. 학생은
            별도의 회원가입 없이 지도교사가 안내한 방법(이름·5자리 학번)으로 입장합니다.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">제3조 (이용자의 의무)</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>타인의 개인정보(이름·사진·연락처 등)를 함부로 입력하지 않습니다.</li>
            <li>타인의 이미지·글의 출처를 지키고 저작권을 존중합니다.</li>
            <li>누군가를 불편하게 하거나 차별하는 내용을 만들지 않습니다.</li>
            <li>AI가 만든 결과를 그대로 믿지 않고 스스로 한 번 더 확인합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">제4조 (AI 기능의 이용)</h2>
          <p>
            본 서비스의 AI 기능은 학습 보조를 위한 도구이며, 모든 AI 요청은 학교 서버를 통해서만 전달됩니다. 이용자의
            실명·학번 등 개인정보는 AI 요청에 포함되지 않습니다. AI의 결과물에 대한 최종 판단과 책임은 이용자 본인에게
            있습니다.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">제5조 (서비스의 변경·중단)</h2>
          <p>
            서비스는 교육 운영상 필요에 따라 내용의 전부 또는 일부를 변경하거나 중단할 수 있으며, 수업 종료 후 관련
            데이터는 파기될 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">제6조 (면책)</h2>
          <p>
            본 서비스는 교육 목적의 비영리 플랫폼으로, 이용자가 만든 산출물 및 외부 도구(캔바 코드 등) 이용으로 발생한
            결과에 대해서는 관련 법령이 허용하는 범위에서 책임을 지지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">문의</h2>
          <p>본 약관에 관한 문의는 지도교사(연구소장)에게 해주세요.</p>
        </section>

        <p className="pt-4">
          <Link href="/privacy" className="font-bold text-brand hover:underline">
            개인정보처리방침 보기 →
          </Link>
        </p>
      </div>
    </main>
  );
}
