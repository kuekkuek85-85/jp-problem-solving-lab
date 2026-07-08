"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

// Firestore 규칙이 request.auth != null을 요구하므로, 앱 어디서든 Firestore를
// 호출하기 전에 반드시 익명 로그인을 완료해야 한다. 학생·교사 모두 회원가입 없이
// 이 익명 인증만으로 규칙을 통과한다(실제 신원 확인은 세션 코드+학번/PIN으로 별도 처리).
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setReady(true);
      } else {
        signInAnonymously(auth).catch(() => setError(true));
      }
    });
    return unsub;
  }, []);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 text-center">
        <p className="text-sm font-bold text-red-600">
          연구소 접속에 실패했어요. 네트워크를 확인하고 새로고침해주세요.
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand/30 border-t-brand" />
      </div>
    );
  }

  return <>{children}</>;
}
