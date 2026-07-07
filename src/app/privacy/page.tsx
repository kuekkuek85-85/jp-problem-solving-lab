import Link from "next/link";
import { LAB_NAME } from "@/lib/constants";

export const metadata = {
  title: "개인정보처리방침 · 장평 문제해결연구소",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
      <Link href="/" className="text-sm font-bold text-rose-500 hover:underline">
        ← 처음으로
      </Link>
      <h1 className="mt-4 text-2xl font-black text-slate-900">개인정보처리방침</h1>
      <p className="mt-1 text-sm text-slate-400">시행일: 2026-07-07</p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-700">
        <p>
          {LAB_NAME}(이하 “서비스”)는 장평중학교 하트이로봇 동아리의 교육 활동을 위해 운영되는 비영리 학습 플랫폼으로,
          최소한의 정보만을 수집·이용합니다.
        </p>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">1. 수집하는 항목</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>이름, 5자리 학번(학년·반·번호)</li>
            <li>학습 활동 기록(수준 자가 진단 응답, 의뢰 분석·설계도, 제출한 산출물 링크, 성찰 후기 등)</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">2. 수집·이용 목적</h2>
          <p>수업 진행, 학습 활동 관리 및 안내, 수료증 발급 등 교육 목적으로만 이용합니다.</p>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">3. AI 이용 시 개인정보 보호</h2>
          <p>
            AI 기능(설계도 검토, 힌트, 발표 슬라이드 생성 등)을 사용할 때 이용자의 실명·학번 등 개인정보는 AI 요청에
            포함되지 않습니다. 모든 AI 요청은 학교 서버를 통해서만 전달됩니다.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">4. 보관 및 파기</h2>
          <p>
            수집된 정보는 수업 운영 기간 동안 보관되며, 수업 종료 후 지도교사의 관리에 따라 파기됩니다. 이용자는
            지도교사를 통해 본인 정보의 열람·정정·삭제를 요청할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">5. 처리 위탁 및 저장</h2>
          <p>
            데이터는 실시간 동기화와 저장을 위해 Google Firebase(Cloud Firestore) 서비스를 이용하여 저장되며, 이용자는
            익명 인증 방식으로 접속합니다. 서비스는 정보를 제3자에게 판매하거나 광고 목적으로 이용하지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">6. 이용자(및 보호자)의 권리</h2>
          <p>
            만 14세 미만 학생의 경우 보호자는 지도교사를 통해 자녀의 개인정보 처리에 대해 문의하고 열람·삭제를 요청할 수
            있습니다.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">문의</h2>
          <p>개인정보 처리에 관한 문의는 지도교사(연구소장)에게 해주세요.</p>
        </section>

        <p className="pt-4">
          <Link href="/terms" className="font-bold text-rose-500 hover:underline">
            이용약관 보기 →
          </Link>
        </p>
      </div>
    </main>
  );
}
