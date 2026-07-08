"use client";

import { useState } from "react";
import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { helpRequestsPath, studentPath } from "@/lib/paths";
import { HELP_CATEGORY_LABELS } from "@/lib/constants";
import type { HelpCategory, Stage, TrafficLight } from "@/lib/types";
import { Button, TrafficDot } from "@/components/ui";

const LIGHTS: TrafficLight[] = ["green", "yellow", "red"];
const LIGHT_LABEL: Record<string, string> = { green: "순조로워요", yellow: "조금 막혔어요", red: "도움이 필요해요" };

export function HelpWidget({
  sessionCode,
  studentId,
  studentName,
  stage,
  trafficLight,
  existingOpenHelpId,
}: {
  sessionCode: string;
  studentId: string;
  studentName: string;
  stage: Stage;
  trafficLight: TrafficLight;
  existingOpenHelpId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<HelpCategory>("prd");
  const [memo, setMemo] = useState("");
  const [sending, setSending] = useState(false);

  async function setLight(light: TrafficLight) {
    await updateDoc(doc(db, studentPath(sessionCode, studentId)), { trafficLight: light });
  }

  async function sendHelp() {
    setSending(true);
    try {
      await addDoc(collection(db, helpRequestsPath(sessionCode)), {
        requesterId: studentId,
        requesterName: studentName,
        stage,
        category,
        memo,
        status: "open",
        helperId: null,
        helperName: null,
        createdAt: Date.now(),
        resolvedAt: null,
        confirmedHelpful: null,
      });
      await setLight("red");
      setOpen(false);
      setMemo("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-2">
      {open && (
        <div className="w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <p className="mb-2 text-sm font-bold text-slate-800">어디에서 막혔나요?</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {Object.entries(HELP_CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setCategory(key as HelpCategory)}
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  category === key ? "bg-brand text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="한 줄로 알려주세요 (선택)"
            className="mb-3 w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-brand-soft"
            rows={2}
          />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button className="flex-1" onClick={sendHelp} disabled={sending}>
              {sending ? "요청 중..." : "도움 요청"}
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-lg">
        {LIGHTS.map((light) => (
          <button
            key={light}
            title={LIGHT_LABEL[light as string]}
            onClick={() => setLight(light)}
            className={`rounded-full p-1 transition ${trafficLight === light ? "ring-2 ring-offset-1 ring-slate-400" : "opacity-50"}`}
          >
            <TrafficDot light={light} />
          </button>
        ))}
        <div className="mx-1 h-5 w-px bg-slate-200" />
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-200"
        >
          {existingOpenHelpId ? "🙋 요청 중..." : "🙋 Help Me"}
        </button>
      </div>
    </div>
  );
}
