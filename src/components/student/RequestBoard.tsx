"use client";

import { useMemo, useState } from "react";
import { arrayUnion, collection, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { projectsPath, requestPath, studentPath } from "@/lib/paths";
import { emptyProject } from "@/lib/factories";
import { STAGE_LABELS, type ProjectDoc, type RequestDoc, type StudentDoc, type SubmissionSummaryDoc } from "@/lib/types";
import { Button, Card, Input, LevelBadge, Textarea } from "@/components/ui";
import { HtmlArtifactButton } from "@/components/HtmlArtifact";

type SortMode = "recommended" | "difficulty" | "fewest";

export function RequestBoard({
  sessionCode,
  student,
  requests,
  solverNameLookup,
  myProjects,
  submissions,
}: {
  sessionCode: string;
  student: StudentDoc;
  requests: RequestDoc[];
  solverNameLookup: Record<string, string>;
  myProjects: ProjectDoc[];
  submissions: SubmissionSummaryDoc[];
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

  const submittersByRequest = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of submissions) {
      const list = m.get(s.requestId) ?? [];
      list.push(s.studentName);
      m.set(s.requestId, list);
    }
    return m;
  }, [submissions]);

  const inProgress = myProjects.filter((p) => p.currentStep !== "done");
  const completed = myProjects.filter((p) => p.currentStep === "done");

  // 의뢰 목록으로 나왔다가 다시 진행 중이던 의뢰를 이어서 하기.
  async function resume(project: ProjectDoc) {
    if (student.activeProjectId) return;
    await updateDoc(doc(db, studentPath(sessionCode, student.studentId)), {
      activeRequestId: project.requestId,
      activeProjectId: project.id,
      activeStep: project.currentStep,
    });
  }

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
        activeStep: "analyze",
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
            className={`rounded-full px-4 py-1.5 ${tab === "board" ? "bg-white text-brand-deep shadow" : "text-slate-500"}`}
          >
            의뢰 게시판
          </button>
          <button
            onClick={() => setTab("mine")}
            className={`rounded-full px-4 py-1.5 ${tab === "mine" ? "bg-white text-brand-deep shadow" : "text-slate-500"}`}
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
              submitterNames={submittersByRequest.get(r.id) ?? []}
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
                  <p className="mt-1 text-xs text-slate-400">진행 단계: {STAGE_LABELS[p.currentStep === "done" ? "submit" : p.currentStep]}</p>
                  <Button
                    className="mt-3 w-full"
                    disabled={!!student.activeProjectId}
                    onClick={() => resume(p)}
                  >
                    이어서 하기
                  </Button>
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
                  {p.submission.html ? (
                    <div className="mt-1">
                      <HtmlArtifactButton
                        html={p.submission.html}
                        title={p.submission.htmlFileName || p.requestTitle}
                        label="산출물 보러가기"
                      />
                    </div>
                  ) : (
                    p.submission.url && (
                      <a href={p.submission.url} target="_blank" className="mt-1 block text-xs text-brand underline">
                        산출물 보러가기
                      </a>
                    )
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
  submitterNames,
  onClaim,
  claiming,
  disabled,
}: {
  request: RequestDoc;
  student: StudentDoc;
  solverNameLookup: Record<string, string>;
  submitterNames: string[];
  onClaim: () => void;
  claiming: boolean;
  disabled: boolean;
}) {
  const recommended = request.difficulty === student.level;
  const [showWho, setShowWho] = useState(false);
  const solverNames = request.activeSolverIds.map((id) => solverNameLookup[id] ?? "연구원");

  return (
    <Card className={recommended ? "ring-2 ring-brand-soft/40" : ""}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-slate-900">{request.title}</h3>
            {recommended && <span className="text-xs font-bold text-brand">나에게 딱!</span>}
          </div>
          <p className="mt-1 text-sm text-slate-500">{request.summary}</p>
        </div>
        <LevelBadge level={request.difficulty} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-sky-100 px-2 py-0.5 font-bold text-sky-700">
          {request.source === "official" ? "공식 의뢰" : "승인된 제보"}
        </span>
        <button
          onClick={() => setShowWho(true)}
          className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-600 hover:bg-slate-200"
        >
          🔬 연구 중 {request.activeSolverIds.length}명
        </button>
        <button
          onClick={() => setShowWho(true)}
          className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700 hover:bg-emerald-200"
        >
          🏁 제출 {request.submissionCount}건
        </button>
      </div>

      <Button className="mt-3 w-full" disabled={disabled || claiming} onClick={onClaim}>
        {claiming ? "맡는 중..." : "이 의뢰 맡기"}
      </Button>

      {showWho && (
        <WhoModal
          title={request.title}
          solverNames={solverNames}
          submitterNames={submitterNames}
          onClose={() => setShowWho(false)}
        />
      )}
    </Card>
  );
}

// 학생용: 어떤 연구원이 도전 중/완료했는지 "이름"만 보여준다(내용·산출물은 비공개, 경쟁심 유발).
function WhoModal({
  title,
  solverNames,
  submitterNames,
  onClose,
}: {
  title: string;
  solverNames: string[];
  submitterNames: string[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <Card className="w-full max-w-sm" >
        <div onClick={(e) => e.stopPropagation()}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-black text-slate-900">{title}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>

          <div className="mb-4">
            <p className="mb-1.5 text-sm font-bold text-slate-700">🔥 지금 도전 중 ({solverNames.length}명)</p>
            {solverNames.length === 0 ? (
              <p className="text-sm text-slate-400">아직 아무도 안 맡았어요. 1등으로 도전해볼까요?</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {solverNames.map((n, i) => (
                  <span key={i} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                    {n}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-sm font-bold text-emerald-700">🏆 벌써 해결한 연구원 ({submitterNames.length}명)</p>
            {submitterNames.length === 0 ? (
              <p className="text-sm text-slate-400">아직 해결한 사람이 없어요!</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {submitterNames.map((n, i) => (
                  <span key={i} className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    {n} ✅
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
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
