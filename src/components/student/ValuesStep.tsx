"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { studentPath } from "@/lib/paths";
import { DEFAULT_HARNESS } from "@/lib/constants";
import type { StudentDoc } from "@/lib/types";
import { Button, Card, Textarea } from "@/components/ui";

// 활동(기획) 시작 전 첫 단계 — 오늘 지킬 '나의 가치관(개발 원칙)'을 적는다.
// 내부 저장 필드는 student.harness. (한 번 적으면 다음부터 생략)
export function ValuesStep({ sessionCode, student }: { sessionCode: string; student: StudentDoc }) {
  const [text, setText] = useState(student.harness?.trim() ? student.harness : DEFAULT_HARNESS);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, studentPath(sessionCode, student.studentId)), { harness: text.trim() });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-4 py-10">
      <Card>
        <div className="mb-1 text-xs font-bold text-amber-700">기획 첫걸음</div>
        <h2 className="mb-1 text-lg font-black">🧭 나의 가치관 — 오늘 지킬 원칙</h2>
        <p className="mb-4 text-sm text-slate-500">
          AI와 함께 만들기 전에, <b>내가 스스로 지킬 원칙</b>을 적어요. 아래 예시를 고치거나 더해도 됩니다.
          여기서 적은 내용은 작업 화면 상단 「🧭 나의 가치관」에서 언제든 다시 볼 수 있어요.
        </p>
        <Textarea
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={DEFAULT_HARNESS}
          className="text-[13px] leading-relaxed"
        />
        <Button className="mt-6 w-full" disabled={saving || !text.trim()} onClick={save}>
          {saving ? "저장 중..." : "이 원칙으로 시작하기 →"}
        </Button>
      </Card>
    </main>
  );
}
