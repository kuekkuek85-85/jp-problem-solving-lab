"use client";

import { useState } from "react";
import { loadTeacherPin, saveTeacherPin } from "@/lib/local-auth";
import { LAB_ID } from "@/lib/constants";
import { useHelpRequests, usePresentation, useRequests, useSession, useStudents, useReflections } from "@/lib/hooks";
import { Button, Card, Input, Spinner } from "@/components/ui";
import { StageControlBar } from "@/components/teacher/StageControlBar";
import { RosterGrid } from "@/components/teacher/RosterGrid";
import { RequestManager } from "@/components/teacher/RequestManager";
import { HelpQueue } from "@/components/teacher/HelpQueue";
import { SlidesPanel } from "@/components/teacher/SlidesPanel";
import { ReflectionsPanel } from "@/components/teacher/ReflectionsPanel";
import { PresentationControl } from "@/components/teacher/PresentationControl";

type Tab = "roster" | "requests" | "help" | "slides" | "present" | "reflections";

export default function TeacherPage() {
  const [pin, setPin] = useState<string | null>(() => loadTeacherPin());

  if (!pin) {
    return <PinGate onAuthed={setPin} />;
  }

  return <Dashboard sessionCode={LAB_ID} pin={pin} />;
}

function PinGate({ onAuthed }: { onAuthed: (pin: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // 연구소가 없으면 개소, 있으면 그대로 입장(멱등). PIN 검증도 이 라우트에서 수행.
      const res = await fetch("/api/teacher/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: value }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "PIN이 올바르지 않아요.");
        return;
      }
      saveTeacherPin(value);
      onAuthed(value);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <h2 className="mb-3 text-lg font-black">연구소장 인증</h2>
        <form onSubmit={submit} className="space-y-3">
          <Input type="password" value={value} onChange={(e) => setValue(e.target.value)} placeholder="PIN" autoFocus />
          {error && <p className="text-sm font-bold text-red-600">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "확인 중..." : "입장"}
          </Button>
        </form>
      </Card>
    </main>
  );
}

function Dashboard({ sessionCode, pin }: { sessionCode: string; pin: string }) {
  const [tab, setTab] = useState<Tab>("roster");
  const { session, loading } = useSession(sessionCode);
  const students = useStudents(sessionCode);
  const requests = useRequests(sessionCode);
  const helpRequests = useHelpRequests(sessionCode);
  const reflections = useReflections(sessionCode);
  const presentation = usePresentation(sessionCode);

  async function closeLab() {
    if (!confirm("연구소를 마감할까요? 모든 학생 화면이 수료증 화면으로 전환돼요.")) return;
    await fetch("/api/teacher/close-lab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionCode, pin }),
    });
  }

  if (loading || !session) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <Spinner />
      </main>
    );
  }

  const openHelpCount = helpRequests.filter((h) => h.status !== "resolved").length;
  const redCount = students.filter((s) => s.trafficLight === "red").length;

  return (
    <div>
      <StageControlBar sessionCode={sessionCode} pin={pin} session={session} onCloseLab={closeLab} />

      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-slate-500">연구원 {students.length}명</div>
          <a href="/gallery" target="_blank" className="text-xs font-bold text-rose-500 underline">
            참관자용 해결 보고회 링크 →
          </a>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 text-sm font-bold">
          <TabButton active={tab === "roster"} onClick={() => setTab("roster")}>
            연구원 현황 {redCount > 0 && <span className="ml-1 text-red-500">🔴{redCount}</span>}
          </TabButton>
          <TabButton active={tab === "requests"} onClick={() => setTab("requests")}>
            의뢰 관리
          </TabButton>
          <TabButton active={tab === "help"} onClick={() => setTab("help")}>
            Help Me 큐 {openHelpCount > 0 && <span className="ml-1 text-amber-600">{openHelpCount}</span>}
          </TabButton>
          <TabButton active={tab === "slides"} onClick={() => setTab("slides")}>
            브리핑 슬라이드
          </TabButton>
          <TabButton active={tab === "present"} onClick={() => setTab("present")}>
            발표회 {presentation?.activeSubmissionId && <span className="ml-1 text-rose-500">🎤</span>}
          </TabButton>
          <TabButton active={tab === "reflections"} onClick={() => setTab("reflections")}>
            성찰 후기 ({reflections.length})
          </TabButton>
        </div>

        {tab === "roster" && <RosterGrid sessionCode={sessionCode} students={students} helpRequests={helpRequests} />}
        {tab === "requests" && <RequestManager sessionCode={sessionCode} pin={pin} requests={requests} />}
        {tab === "help" && <HelpQueue sessionCode={sessionCode} helpRequests={helpRequests} />}
        {tab === "slides" && <SlidesPanel sessionCode={sessionCode} pin={pin} session={session} />}
        {tab === "present" && <PresentationControl sessionCode={sessionCode} presentation={presentation} />}
        {tab === "reflections" && <ReflectionsPanel reflections={reflections} students={students} />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 transition ${active ? "bg-rose-500 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
    >
      {children}
    </button>
  );
}
