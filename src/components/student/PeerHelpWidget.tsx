"use client";

import { useState } from "react";
import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { helpRequestPath, studentPath } from "@/lib/paths";
import { HELP_CATEGORY_LABELS } from "@/lib/constants";
import { STAGE_LABELS, type HelpRequestDoc } from "@/lib/types";
import { Button } from "@/components/ui";

// 교사 연수 전용: 참가자가 서로의 도움 요청을 보고 돕는다(동료 도와주기). 기존 helpRequests 재사용.
export function PeerHelpWidget({
  sessionCode,
  meStudentId,
  meName,
  helpRequests,
}: {
  sessionCode: string;
  meStudentId: string;
  meName: string;
  helpRequests: HelpRequestDoc[];
}) {
  const [open, setOpen] = useState(false);

  const others = helpRequests.filter((h) => h.requesterId !== meStudentId);
  const openReqs = others.filter((h) => h.status === "open");
  const myClaimed = others.filter((h) => h.status === "claimed" && h.helperId === meStudentId);

  async function claim(h: HelpRequestDoc) {
    await updateDoc(doc(db, helpRequestPath(sessionCode, h.id)), {
      status: "claimed",
      helperId: meStudentId,
      helperName: meName,
    });
  }

  async function resolve(h: HelpRequestDoc) {
    // eslint-disable-next-line react-hooks/purity -- onClick 핸들러에서만 실행
    const resolvedAt = Date.now();
    await updateDoc(doc(db, helpRequestPath(sessionCode, h.id)), {
      status: "resolved",
      resolvedAt,
      confirmedHelpful: true,
    });
    await updateDoc(doc(db, studentPath(sessionCode, meStudentId)), { badges: arrayUnion("helper") });
  }

  const badgeCount = openReqs.length + myClaimed.length;

  return (
    <div className="fixed bottom-4 left-4 z-30 flex flex-col items-start gap-2">
      {open && (
        <div className="w-80 max-w-[85vw] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <p className="mb-2 text-sm font-black text-slate-800">🤝 동료 도와주기</p>

          {myClaimed.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-xs font-bold text-amber-700">내가 돕는 중</p>
              <div className="space-y-1.5">
                {myClaimed.map((h) => (
                  <div key={h.id} className="rounded-lg bg-amber-50 p-2 text-xs">
                    <p className="font-bold text-slate-700">{h.requesterName} 님 · {STAGE_LABELS[h.stage]} · {HELP_CATEGORY_LABELS[h.category]}</p>
                    {h.memo && <p className="text-slate-600">{h.memo}</p>}
                    <Button className="mt-1 w-full !py-1 text-xs" onClick={() => resolve(h)}>
                      도움 완료 ✅
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="mb-1 text-xs font-bold text-slate-500">도움이 필요한 동료 ({openReqs.length})</p>
          {openReqs.length === 0 ? (
            <p className="text-xs text-slate-400">지금은 도움 요청이 없어요. 신호등이 🔴이 되면 여기에 떠요.</p>
          ) : (
            <div className="space-y-1.5">
              {openReqs.map((h) => (
                <div key={h.id} className="rounded-lg bg-slate-50 p-2 text-xs">
                  <p className="font-bold text-slate-700">{h.requesterName} 님 · {STAGE_LABELS[h.stage]} · {HELP_CATEGORY_LABELS[h.category]}</p>
                  {h.memo && <p className="text-slate-600">{h.memo}</p>}
                  <Button variant="secondary" className="mt-1 w-full !py-1 text-xs" onClick={() => claim(h)}>
                    🙋 내가 도와줄게요
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 shadow-lg hover:bg-emerald-50"
      >
        🤝 동료 도와주기{badgeCount > 0 && <span className="ml-1 rounded-full bg-emerald-600 px-1.5 text-white">{badgeCount}</span>}
      </button>
    </div>
  );
}
