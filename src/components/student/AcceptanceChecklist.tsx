"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui";

// 수용 기준 문자열(한 줄에 하나)을 체크 가능한 항목으로 파싱.
function parseCriteria(raw: string): string[] {
  return raw
    .split("\n")
    .map((s) => s.replace(/^[\s\-·•*]+/, "").trim())
    .filter(Boolean);
}

// 수용 기준 체크리스트. 체크 상태는 로컬(일시적) — 제출 전 자가 점검(1차)·동료/강사 검토(2차)용 가이드.
export function AcceptanceChecklist({
  criteria,
  title = "✅ 수용 기준 체크",
  note,
}: {
  criteria: string | null | undefined;
  title?: string;
  note?: string;
}) {
  const items = useMemo(() => parseCriteria(criteria ?? ""), [criteria]);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  if (items.length === 0) return null;
  const done = items.filter((_, i) => checked[i]).length;

  return (
    <Card className="border-emerald-200 bg-emerald-50/50">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-black text-emerald-800">{title}</span>
        <span className="text-xs font-bold text-emerald-700">{done}/{items.length}</span>
      </div>
      {note && <p className="mb-2 text-xs text-slate-500">{note}</p>}
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i}>
            <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={!!checked[i]}
                onChange={(e) => setChecked((prev) => ({ ...prev, [i]: e.target.checked }))}
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span className={checked[i] ? "line-through text-slate-400" : ""}>{it}</span>
            </label>
          </li>
        ))}
      </ul>
    </Card>
  );
}
