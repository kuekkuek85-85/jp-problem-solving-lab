import Link from "next/link";

export function Footer() {
  return (
    <footer className="no-print border-t border-slate-200 bg-white px-4 py-4 text-center text-xs text-slate-400">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span>장평 문제해결연구소 · 하트이로봇 동아리</span>
        <span className="hidden sm:inline">·</span>
        <Link href="/terms" className="font-bold text-slate-500 hover:text-brand hover:underline">
          이용약관
        </Link>
        <Link href="/privacy" className="font-bold text-slate-500 hover:text-brand hover:underline">
          개인정보처리방침
        </Link>
      </div>
    </footer>
  );
}
