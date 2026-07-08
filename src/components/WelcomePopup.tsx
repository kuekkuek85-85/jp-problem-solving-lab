"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "jp-lab-welcome-seen";

export function WelcomePopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // 세션당 1회 자동 표시(닫으면 그 세션 동안 다시 뜨지 않음).
    // sessionStorage는 클라이언트에서만 접근 가능하므로 마운트 후 판단한다.
    if (typeof window === "undefined") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 클라이언트 전용 sessionStorage 기반 초기 표시
    if (!sessionStorage.getItem(SEEN_KEY)) setOpen(true);
  }, []);

  function close() {
    sessionStorage.setItem(SEEN_KEY, "1");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={close}>
      <div
        className="jp-pop-in relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 블링블링 헤더 */}
        <div className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-fuchsia-500 to-violet-500 px-6 pb-8 pt-7 text-center text-white">
          {/* 반짝이는 별들 */}
          <span className="pointer-events-none absolute left-5 top-4 text-lg opacity-80 jp-float">✨</span>
          <span className="pointer-events-none absolute right-8 top-6 text-sm opacity-70 jp-float" style={{ animationDelay: "0.6s" }}>⭐</span>
          <span className="pointer-events-none absolute bottom-4 left-10 text-sm opacity-70 jp-float" style={{ animationDelay: "1.1s" }}>💫</span>
          <span className="pointer-events-none absolute right-6 bottom-6 text-lg opacity-80 jp-float" style={{ animationDelay: "0.3s" }}>🌟</span>

          <button
            onClick={close}
            aria-label="닫기"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/35"
          >
            ✕
          </button>

          <div className="text-4xl">🔬🤖</div>
          <div className="mt-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold tracking-wide">
            하트이로봇 동아리 · 바이브 코딩 수업
          </div>
          <h2 className="mt-3 text-2xl font-black drop-shadow">장평 문제해결연구소 개소!</h2>
        </div>

        {/* 교장 인사 말씀 */}
        <div className="px-6 py-6">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-rose-200 text-2xl">
              🎓
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">장평중학교 교장 한상목</p>
              <p className="text-xs text-slate-400">환영 · 축하 말씀</p>
            </div>
          </div>

          <blockquote className="rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
            사랑하는 <b>하트이로봇 동아리 연구원 여러분</b>, 반갑습니다. 🎉
            <br />
            <br />
            오늘 여러분은 AI를 <b>도구</b> 삼아 우리 장평중학교의 불편함을 직접 해결하는 <b className="jp-shine-text font-black">문제해결연구소</b>의 어엿한 연구원이 됩니다.
            스스로 묻고, 설계하고, 만들어 보는 이 값진 경험이 여러분을 미래의 창의적 문제해결자로 키워 줄 것입니다.
            <br />
            <br />
            여러분의 <b>반짝이는 아이디어</b>를 마음껏 펼치기를 응원합니다. 오늘도 안전하고 즐겁게, 함께 성장합시다! ✨
          </blockquote>

          <button
            onClick={close}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-rose-500 to-violet-500 px-4 py-3 font-black text-white shadow-lg shadow-rose-200 transition hover:brightness-110"
          >
            연구소 입장하기 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
