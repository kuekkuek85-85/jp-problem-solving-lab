import type { SessionDoc } from "@/lib/types";

export function LectureOverlay({ session }: { session: SessionDoc }) {
  const slide = session.slides.find((s) => s.index === session.currentSlideIndex) ?? session.slides[0];

  return (
    <main className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-slate-900 px-6 py-10 text-white">
      <div className="mb-4 text-xs font-bold uppercase tracking-widest text-rose-300">브리핑</div>
      <div className="w-full max-w-2xl whitespace-pre-wrap rounded-2xl bg-slate-800 p-8 text-lg leading-relaxed shadow-2xl">
        {slide ? (
          <MarkdownLite text={slide.markdown} />
        ) : (
          <p className="text-slate-400">브리핑 슬라이드를 준비 중이에요...</p>
        )}
        {slide?.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slide.imageUrl} alt="" className="mt-4 max-h-96 w-full rounded-lg object-contain" />
        )}
      </div>
      <p className="mt-6 text-sm text-slate-400">선생님이 화면을 넘기면 자동으로 전환돼요.</p>
    </main>
  );
}

function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (line.startsWith("# ")) return <h1 key={i} className="text-2xl font-black">{line.slice(2)}</h1>;
        if (line.startsWith("## ")) return <h2 key={i} className="text-xl font-bold">{line.slice(3)}</h2>;
        if (line.startsWith("- ")) return <li key={i} className="ml-5 list-disc">{line.slice(2)}</li>;
        if (!line.trim()) return <div key={i} className="h-2" />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}
