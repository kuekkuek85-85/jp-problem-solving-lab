import { CLUB_NAME, LAB_NAME, STAMP_LABELS } from "@/lib/constants";
import type { ProjectDoc, StudentDoc } from "@/lib/types";

export function Certificate({ student, projects }: { student: StudentDoc; projects: ProjectDoc[] }) {
  const solved = projects.filter((p) => p.currentStep === "done");
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="mx-auto aspect-[297/210] w-full max-w-3xl border-8 border-double border-rose-300 bg-white p-10 text-center shadow-lg print:aspect-auto print:h-screen print:w-screen print:border-[12px]">
      <div className="text-sm font-bold tracking-widest text-rose-400">{LAB_NAME}</div>
      <h1 className="mt-2 text-3xl font-black text-slate-900">수료증</h1>

      <p className="mt-8 text-lg">
        {student.grade}학년 {student.class}반 {student.number}번 <span className="font-black">{student.name}</span> 연구원
      </p>
      <p className="mt-2 text-sm text-slate-500">학번 {student.studentNo}</p>

      <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-slate-700">
        위 연구원은 {LAB_NAME}에서 아래 의뢰를 해결하며 AI 윤리 서약을 지키며 수료하였음을 증명합니다.
      </p>

      <div className="mx-auto mt-4 max-w-lg text-sm text-slate-600">
        {solved.length === 0 ? (
          <p className="text-slate-400">(해결한 의뢰 없음)</p>
        ) : (
          <ul className="list-inside list-disc space-y-0.5 text-left">
            {solved.map((p) => (
              <li key={p.id}>{p.requestTitle}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="mx-auto mt-6 flex max-w-md justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-black ${
              student.stamps.includes(n) ? "bg-rose-400 text-white" : "bg-slate-100 text-slate-300"
            }`}
            title={STAMP_LABELS[n]}
          >
            {n}
          </span>
        ))}
      </div>

      <div className="mx-auto mt-4 flex max-w-md justify-center gap-3 text-xs font-bold text-slate-500">
        {student.badges.includes("ready") && <span>🎖️ 연구원증</span>}
        {student.badges.includes("helper") && <span>🤝 도우미</span>}
        {student.badges.includes("challenger") && <span>🚀 도전자</span>}
      </div>

      <div className="mt-10 flex items-end justify-between text-xs text-slate-500">
        <div>{today}</div>
        <div>
          <div>{CLUB_NAME} · {LAB_NAME}</div>
          <div className="mt-1 font-bold">연구소장(지도교사) 드림</div>
        </div>
      </div>
    </div>
  );
}
