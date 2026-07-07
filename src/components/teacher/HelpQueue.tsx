"use client";

import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { helpRequestPath } from "@/lib/paths";
import { HELP_CATEGORY_LABELS } from "@/lib/constants";
import type { HelpRequestDoc } from "@/lib/types";
import { Button, Card } from "@/components/ui";

export function HelpQueue({ sessionCode, helpRequests }: { sessionCode: string; helpRequests: HelpRequestDoc[] }) {
  const open = helpRequests.filter((h) => h.status === "open").sort((a, b) => a.createdAt - b.createdAt);
  const claimed = helpRequests.filter((h) => h.status === "claimed");

  async function claim(id: string) {
    await updateDoc(doc(db, helpRequestPath(sessionCode, id)), {
      status: "claimed",
      helperId: "teacher",
      helperName: "연구소장",
    });
  }

  async function resolve(id: string) {
    await updateDoc(doc(db, helpRequestPath(sessionCode, id)), {
      status: "resolved",
      resolvedAt: Date.now(),
    });
  }

  if (open.length === 0 && claimed.length === 0) {
    return <p className="text-sm text-slate-400">현재 대기 중인 도움 요청이 없어요.</p>;
  }

  return (
    <div className="space-y-2">
      {[...open, ...claimed].map((h) => (
        <Card key={h.id} className={h.status === "open" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold">{h.requesterName}</p>
              <p className="text-xs text-slate-500">
                {HELP_CATEGORY_LABELS[h.category] ?? h.category} · {h.memo || "(메모 없음)"}
              </p>
              {h.status === "claimed" && <p className="text-xs text-amber-700">{h.helperName}님이 처리 중</p>}
            </div>
            <div className="flex shrink-0 gap-1.5">
              {h.status === "open" && (
                <Button className="!px-2 !py-1 text-xs" onClick={() => claim(h.id)}>
                  처리하기
                </Button>
              )}
              <Button variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => resolve(h.id)}>
                완료
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
