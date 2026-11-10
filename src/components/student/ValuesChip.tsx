"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { studentPath } from "@/lib/paths";
import { DEFAULT_HARNESS } from "@/lib/constants";
import type { StudentDoc } from "@/lib/types";

// 작업 화면 상단에서 '나의 가치관(개발 원칙)'을 언제든 펼쳐 보고 수정한다. (저장 필드: student.harness)
export function ValuesChip({ sessionCode, student }: { sessionCode: string; student: StudentDoc }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(student.harness?.trim() ? student.harness : DEFAULT_HARNESS);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, studentPath(sessionCode, student.studentId)), { harness: text.trim() });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-1">
      <button onClick={() => setOpen((v) => !v)} className="text-xs font-bold text-amber-700">
        🧭 나의 가치관 {open ? "▲" : "▾"}
      </button>
      {open && (
        <div className="mt-1 rounded-lg bg-amber-50 p-2">
          {editing ? (
            <>
              <textarea
                rows={6}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full rounded-md border border-amber-200 p-2 text-[12px] leading-relaxed outline-none focus:border-amber-400"
              />
              <div className="mt-1.5 flex gap-2">
                <button
                  onClick={save}
                  disabled={saving || !text.trim()}
                  className="rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold text-white disabled:opacity-40"
                >
                  {saving ? "저장 중..." : "저장"}
                </button>
                <button onClick={() => { setEditing(false); setText(student.harness?.trim() ? student.harness : DEFAULT_HARNESS); }} className="text-[11px] text-slate-400">
                  취소
                </button>
              </div>
            </>
          ) : (
            <>
              <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700">
                {student.harness?.trim() || "아직 가치관을 적지 않았어요."}
              </pre>
              <button onClick={() => setEditing(true)} className="mt-1 text-[11px] font-bold text-amber-700 underline">
                ✏️ 수정
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
