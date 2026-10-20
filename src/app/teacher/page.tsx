"use client";

import { useEffect, useState } from "react";
import { loadTeacherPin, saveTeacherPin } from "@/lib/local-auth";
import { LAB_ID, TRAINING_LAB_ID } from "@/lib/constants";
import { useHelpRequests, usePresentation, useRequests, useSession, useStudents, useSubmissions, useReflections } from "@/lib/hooks";
import { Button, Card, Input, Spinner } from "@/components/ui";
import { StageControlBar } from "@/components/teacher/StageControlBar";
import { RosterGrid } from "@/components/teacher/RosterGrid";
import { RequestManager } from "@/components/teacher/RequestManager";
import { HelpQueue } from "@/components/teacher/HelpQueue";
import { SlidesPanel } from "@/components/teacher/SlidesPanel";
import { ReflectionsPanel } from "@/components/teacher/ReflectionsPanel";
import { PresentationControl } from "@/components/teacher/PresentationControl";
import { PromptGuide } from "@/components/teacher/PromptGuide";

type Tab = "roster" | "requests" | "help" | "slides" | "present" | "reflections" | "prompt";

export default function TeacherPage() {
  const [pin, setPin] = useState<string | null>(() => loadTeacherPin());
  const [mode, setMode] = useState<"student" | "training">("student");

  if (!pin) {
    return <PinGate onAuthed={setPin} />;
  }

  const sessionCode = mode === "training" ? TRAINING_LAB_ID : LAB_ID;
  return <Dashboard key={sessionCode} sessionCode={sessionCode} pin={pin} mode={mode} setMode={setMode} />;
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

function Dashboard({
  sessionCode,
  pin,
  mode,
  setMode,
}: {
  sessionCode: string;
  pin: string;
  mode: "student" | "training";
  setMode: (m: "student" | "training") => void;
}) {
  const [tab, setTab] = useState<Tab>("roster");
  // 선택한 모드의 연구소(main/training)가 없으면 개소(해당 모드 시드 포함). 멱등.
  useEffect(() => {
    fetch("/api/teacher/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, sessionCode }),
    }).catch(() => {});
  }, [pin, sessionCode]);
  const { session, loading } = useSession(sessionCode);
  const students = useStudents(sessionCode);
  const requests = useRequests(sessionCode);
  const helpRequests = useHelpRequests(sessionCode);
  const reflections = useReflections(sessionCode);
  const presentation = usePresentation(sessionCode);
  const submissions = useSubmissions(sessionCode);

  async function closeLab() {
    if (!confirm("연구소를 마감할까요? 모든 학생 화면이 수료증 화면으로 전환돼요.")) return;
    await fetch("/api/teacher/close-lab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionCode, pin }),
    });
  }

  const modeLabel = mode === "training" ? "교사 연수용" : "학생용";
  async function resetData() {
    if (!confirm(`[${modeLabel}] 참가자 데이터(참가자·설계도·제출물·발표·성찰·도움요청)를 모두 삭제할까요?\n\n공식 의뢰와 브리핑 슬라이드는 그대로 유지돼요. ${mode === "training" ? "학생용" : "교사 연수용"} 데이터는 영향받지 않아요.`)) return;
    if (!confirm("정말 초기화할까요? 마지막 확인이에요.")) return;
    const res = await fetch("/api/teacher/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionCode, pin }),
    });
    const data = await res.json();
    alert(data.ok ? `[${modeLabel}] 초기화 완료! 깨끗한 상태로 시작할 수 있어요.` : `초기화 실패: ${data.error ?? "알 수 없는 오류"}`);
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
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 pt-3">
        <span className="text-xs font-bold text-slate-400">모드</span>
        <div className="inline-flex rounded-full bg-slate-200 p-1 text-xs font-bold">
          <button
            onClick={() => setMode("student")}
            className={`rounded-full px-4 py-1.5 ${mode === "student" ? "bg-white text-brand-deep shadow" : "text-slate-500"}`}
          >
            🎒 학생용
          </button>
          <button
            onClick={() => setMode("training")}
            className={`rounded-full px-4 py-1.5 ${mode === "training" ? "bg-white text-amber-700 shadow" : "text-slate-500"}`}
          >
            🧑‍🏫 교사 연수용
          </button>
        </div>
        <span className="text-xs text-slate-400">
          {mode === "training" ? "교사 연수 데이터(이름 입장)" : "학생 데이터(학번 입장)"} — 서로 분리돼요
        </span>
      </div>

      <StageControlBar sessionCode={sessionCode} pin={pin} session={session} onCloseLab={closeLab} onReset={resetData} />

      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-slate-500">{mode === "training" ? "참가자" : "연구원"} {students.length}명</div>
          <a href={mode === "training" ? "/gallery?lab=training" : "/gallery"} target="_blank" className="text-xs font-bold text-brand underline">
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
            발표회 {presentation?.activeSubmissionId && <span className="ml-1 text-brand">🎤</span>}
          </TabButton>
          <TabButton active={tab === "reflections"} onClick={() => setTab("reflections")}>
            성찰 후기 ({reflections.length})
          </TabButton>
          {mode === "training" && (
            <TabButton active={tab === "prompt"} onClick={() => setTab("prompt")}>
              🧭 프롬프트 가이드
            </TabButton>
          )}
        </div>

        {tab === "roster" && <RosterGrid sessionCode={sessionCode} pin={pin} students={students} helpRequests={helpRequests} />}
        {tab === "requests" && <RequestManager sessionCode={sessionCode} pin={pin} requests={requests} students={students} submissions={submissions} />}
        {tab === "help" && <HelpQueue sessionCode={sessionCode} helpRequests={helpRequests} />}
        {tab === "slides" && <SlidesPanel sessionCode={sessionCode} pin={pin} session={session} />}
        {tab === "present" && <PresentationControl sessionCode={sessionCode} presentation={presentation} />}
        {tab === "reflections" && <ReflectionsPanel reflections={reflections} students={students} />}
        {tab === "prompt" && <PromptGuide />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 transition ${active ? "bg-brand text-white" : "bg-white text-slate-600 border border-slate-200"}`}
    >
      {children}
    </button>
  );
}
