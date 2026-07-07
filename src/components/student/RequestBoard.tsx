"use client";

import { useMemo, useState } from "react";
import { arrayUnion, collection, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { projectsPath, requestPath, studentPath } from "@/lib/paths";
import { emptyProject } from "@/lib/factories";
import type { ProjectDoc, RequestDoc, StudentDoc } from "@/lib/types";
import { Button, Card, Input, LevelBadge, Textarea } from "@/components/ui";

type SortMode = "recommended" | "difficulty" | "fewest";

export function RequestBoard({
  sessionCode,
  student,
  requests,
  solverNameLookup,
  myProjects,
}: {
  sessionCode: string;
  student: StudentDoc;
  requests: RequestDoc[];
  solverNameLookup: Record<string, string>;
  myProjects: ProjectDoc[];
}) {
  const [tab, setTab] = useState<"board" | "mine">("board");
  const [sort, setSort] = useState<SortMode>("recommended");
  const [proposing, setProposing] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);

  const visibleRequests = useMemo(() => {
    const approved = requests.filter((r) => r.approvalStatus === "approved");
    const sorted = [...approved];
    if (sort === "difficulty") {
      const order = { seedling: 0, growing: 1, sharing: 2 };
      sorted.sort((a, b) => order[a.difficulty] - order[b.difficulty]);
    } else if (sort === "fewest") {
      sorted.sort((a, b) => a.activeSolverIds.length - b.activeSolverIds.length);
    } else {
      sorted.sort((a, b) => (a.difficulty === student.level ? -1 : 0) - (b.difficulty === student.level ? -1 : 0));
    }
    return sorted;
  }, [requests, sort, student.level]);

  const inProgress = myProjects.filter((p) => p.currentStep !== "done");
  const completed = myProjects.filter((p) => p.currentStep === "done");

  async function claim(request: RequestDoc) {
    if (student.activeProjectId) return;
    setClaiming(request.id);
    try {
      const now = Date.now();
      const projectRef = doc(collection(db, projectsPath(sessionCode, student.studentId)));
      const project = emptyProject({
        id: projectRef.id,
        requestId: request.id,
        requestTitle: request.title,
        now,
        level: student.level,
      });
      await setDoc(projectRef, project);
      await updateDoc(doc(db, studentPath(sessionCode, student.studentId)), {
        activeRequestId: request.id,
        activeProjectId: projectRef.id,
      });
      await updateDoc(doc(db, requestPath(sessionCode, request.id)), {
        activeSolverIds: arrayUnion(student.studentId),
      });
    } finally {
      setClaiming(null);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex rounded-full bg-slate-200 p-1 text-xs font-bold">
          <button
            onClick={() => setTab("board")}
            className={`rounded-full px-4 py-1.5 ${tab === "board" ? "bg-white text-rose-600 shadow" : "text-slate-500"}`}
          >
            의뢰 게시판
          </button>
          <button
            onClick={() => setTab("mine")}
            className={`rounded-full px-4 py-1.5 ${tab === "mine" ? "bg-white text-rose-600 shadow" : "text-slate-500"}`}
          >
            내 해결안 ({myProjects.length})
          </button>
        </div>
        {tab === "board" && (
          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold"
            >
              <option value="recommended">내 코스 추천순</option>
              <option value="difficulty">난이도순</option>
              <option value="fewest">인원 적은 순</option>
            </select>
            <Button variant="secondary" onClick={() => setProposing(true)} className="!px-3 !py-1.5 text-xs">
              + 의뢰 등록 요청
            </Button>
          </div>
        )}
      </div>

      {student.activeProjectId && (
        <Card className="mb-4 bg-amber-50 border-amber-200">
          <p className="text-sm font-bold text-amber-800">이미 진행 중인 의뢰가 있어요. 먼저 그 의뢰를 완료해주세요!</p>
        </Card>
      )}

      {tab === "board" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visibleRequests.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              student={student}
              solverNameLookup={solverNameLookup}
              onClaim={() => claim(r)}
              claiming={claiming === r.id}
              disabled={!!student.activeProjectId}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-black text-slate-700">진행 중 의뢰</h3>
            {inProgress.length === 0 && <p className="text-sm text-slate-400">진행 중인 의뢰가 없어요.</p>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {inProgress.map((p) => (
                <Card key={p.id}>
                  <p className="font-bold">{p.requestTitle}</p>
                  <p className="mt-1 text-xs text-slate-400">진행 단계: {p.currentStep}</p>
                </Card>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-black text-slate-700">완료한 해결안</h3>
            {completed.length === 0 && <p className="text-sm text-slate-400">아직 완료한 해결안이 없어요.</p>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {completed.map((p) => (
                <Card key={p.id}>
                  <p className="font-bold">{p.requestTitle}</p>
                  <p className="mt-1 text-xs text-slate-500">{p.submission.oneLiner}</p>
                  {p.submission.url && (
                    <a href={p.submission.url} target="_blank" className="mt-1 block text-xs text-rose-500 underline">
                      산출물 보러가기
                    </a>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {proposing && (
        <ProposeModal
          sessionCode={sessionCode}
          student={student}
          onClose={() => setProposing(false)}
        />
      )}
    </main>
  );
}

function RequestCard({
  request,
  student,
  solverNameLookup,
  onClaim,
  claiming,
  disabled,
}: {
  request: RequestDoc;
  student: StudentDoc;
  solverNameLookup: Record<string, string>;
  onClaim: () => void;
  claiming: boolean;
  disabled: boolean;
}) {
  const recommended = request.difficulty === student.level;
  return (
    <Card className={recommended ? "ring-2 ring-rose-200" : ""}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-slate-900">{request.title}</h3>
            {recommended && <span className="text-xs font-bold text-rose-500">나에게 딱!</span>}
          </div>
          <p className="mt-1 text-sm text-slate-500">{request.summary}</p>
        </div>
        <LevelBadge level={request.difficulty} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-sky-100 px-2 py-0.5 font-bold text-sky-700">
          {request.source === "official" ? "공식 의뢰" : "승인된 제보"}
        </span>
        <span>연구 중 {request.activeSolverIds.length}명</span>
        <span>제출 {request.submissionCount}건</span>
      </div>

      {request.activeSolverIds.length > 0 && (
        <p className="mt-1.5 truncate text-xs text-slate-400">
          {request.activeSolverIds.map((id) => solverNameLookup[id] ?? "연구원").join(", ")}
        </p>
      )}

      <Button className="mt-3 w-full" disabled={disabled || claiming} onClick={onClaim}>
        {claiming ? "맡는 중..." : "이 의뢰 맡기"}
      </Button>
    </Card>
  );
}

function ProposeModal({
  sessionCode,
  student,
  onClose,
}: {
  sessionCode: string;
  student: StudentDoc;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!title.trim() || !summary.trim()) return;
    setSending(true);
    try {
      await fetch("/api/student/propose-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionCode,
          studentId: student.studentId,
          studentName: student.name,
          title,
          summary,
        }),
      });
      setDone(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <Card className="w-full max-w-md">
        {done ? (
          <div className="text-center">
            <div className="text-4xl">📨</div>
            <p className="mt-2 font-bold">의뢰 등록 요청을 보냈어요!</p>
            <p className="mt-1 text-sm text-slate-500">선생님이 승인하면 게시판에 올라와요.</p>
            <Button className="mt-4 w-full" onClick={onClose}>
              닫기
            </Button>
          </div>
        ) : (
          <>
            <h3 className="mb-3 font-black">의뢰 등록 요청</h3>
            <div className="space-y-3">
              <Input placeholder="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea
                placeholder="누가, 언제, 왜 불편한지 적어주세요"
                rows={4}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                취소
              </Button>
              <Button className="flex-1" disabled={sending} onClick={submit}>
                {sending ? "보내는 중..." : "요청 보내기"}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
