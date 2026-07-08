"use client";

import { useState } from "react";
import type { Level, ProjectStep, RequestDoc, StudentDoc, SubmissionSummaryDoc } from "@/lib/types";
import { Button, Card, Input, LevelBadge, Textarea } from "@/components/ui";

const STEP_LABEL: Record<ProjectStep, string> = {
  analyze: "의뢰 분석 중",
  prd: "설계도 작성 중",
  grillme: "Grill Me 검토 중",
  coding: "바이브 코딩 중",
  submit: "해결안 제출 중",
  done: "완료",
};

export function RequestManager({
  sessionCode,
  pin,
  requests,
  students,
  submissions,
}: {
  sessionCode: string;
  pin: string;
  requests: RequestDoc[];
  students: StudentDoc[];
  submissions: SubmissionSummaryDoc[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [detailReq, setDetailReq] = useState<RequestDoc | null>(null);
  const pending = requests.filter((r) => r.approvalStatus === "pending");
  const approved = requests.filter((r) => r.approvalStatus === "approved");

  async function call(body: Record<string, unknown>) {
    await fetch("/api/teacher/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionCode, pin, ...body }),
    });
  }

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-black text-amber-700">승인 대기 중인 학생 제보 ({pending.length})</h3>
          <div className="space-y-2">
            {pending.map((r) => (
              <Card key={r.id} className="border-amber-200 bg-amber-50">
                <p className="font-bold">{r.title}</p>
                <p className="text-sm text-slate-600">{r.summary}</p>
                <p className="mt-1 text-xs text-slate-400">제보: {r.proposedByStudentName}</p>
                <div className="mt-2 flex gap-2">
                  <Button className="!px-3 !py-1.5 text-xs" onClick={() => call({ action: "approve", requestId: r.id })}>
                    승인
                  </Button>
                  <Button
                    variant="danger"
                    className="!px-3 !py-1.5 text-xs"
                    onClick={() => call({ action: "reject", requestId: r.id, rejectReason: "선생님이 반려했어요" })}
                  >
                    반려
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-700">등록된 의뢰 ({approved.length})</h3>
          <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "닫기" : "+ 의뢰 등록"}
          </Button>
        </div>

        {showForm && <NewRequestForm onSubmit={(payload) => call({ action: "create", ...payload })} onDone={() => setShowForm(false)} />}

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {approved.map((r) => (
            <RequestRow
              key={r.id}
              request={r}
              onUpdate={(payload) => call({ action: "update", requestId: r.id, ...payload })}
              onDelete={() => call({ action: "delete", requestId: r.id })}
              onShowDetail={() => setDetailReq(r)}
            />
          ))}
        </div>
      </div>

      {detailReq && (
        <RequestDetailModal
          request={detailReq}
          students={students}
          submissions={submissions}
          onClose={() => setDetailReq(null)}
        />
      )}
    </div>
  );
}

function RequestDetailModal({
  request,
  students,
  submissions,
  onClose,
}: {
  request: RequestDoc;
  students: StudentDoc[];
  submissions: SubmissionSummaryDoc[];
  onClose: () => void;
}) {
  const solvers = students
    .filter((s) => s.activeRequestId === request.id)
    .sort((a, b) => a.studentNo.localeCompare(b.studentNo));
  const subs = submissions
    .filter((s) => s.requestId === request.id)
    .sort((a, b) => b.submittedAt - a.submittedAt);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-black">{request.title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <p className="mb-4 text-sm text-slate-500">{request.summary}</p>

        <div className="mb-4">
          <p className="mb-2 text-sm font-black text-sky-700">🔬 지금 연구 중 ({solvers.length}명)</p>
          {solvers.length === 0 ? (
            <p className="text-sm text-slate-400">현재 이 의뢰를 연구 중인 연구원이 없어요.</p>
          ) : (
            <div className="space-y-1">
              {solvers.map((s) => (
                <div key={s.studentId} className="flex items-center justify-between gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sm">
                  <span className="font-bold text-slate-700">{s.studentNo} {s.name}</span>
                  <span className="shrink-0 text-xs font-bold text-sky-600">
                    {s.activeStep ? STEP_LABEL[s.activeStep] : "진행 중"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-black text-emerald-700">✅ 제출한 해결안 ({subs.length}건)</p>
          {subs.length === 0 ? (
            <p className="text-sm text-slate-400">아직 제출된 해결안이 없어요.</p>
          ) : (
            <div className="space-y-2">
              {subs.map((s) => (
                <div key={s.projectId} className="rounded-lg bg-emerald-50 px-3 py-2 text-sm">
                  <p className="font-bold text-slate-700">{s.studentName}</p>
                  <p className="text-xs text-slate-600">{s.oneLiner}</p>
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-brand underline">
                      산출물 열어보기 →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NewRequestForm({
  onSubmit,
  onDone,
}: {
  onSubmit: (payload: { title: string; summary: string; difficulty: Level }) => void;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [difficulty, setDifficulty] = useState<Level>("growing");

  return (
    <Card className="mb-3">
      <div className="space-y-2">
        <Input placeholder="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="한 줄 설명" rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
        <div className="flex gap-2">
          {(["seedling", "growing", "sharing"] as Level[]).map((lv) => (
            <button
              key={lv}
              onClick={() => setDifficulty(lv)}
              className={`rounded-full border px-2 py-1 text-xs ${difficulty === lv ? "border-brand-soft" : "border-slate-200"}`}
            >
              <LevelBadge level={lv} />
            </button>
          ))}
        </div>
        <Button
          className="w-full"
          onClick={() => {
            if (!title.trim() || !summary.trim()) return;
            onSubmit({ title, summary, difficulty });
            setTitle("");
            setSummary("");
            onDone();
          }}
        >
          등록하기
        </Button>
      </div>
    </Card>
  );
}

function RequestRow({
  request,
  onUpdate,
  onDelete,
  onShowDetail,
}: {
  request: RequestDoc;
  onUpdate: (payload: Record<string, unknown>) => void;
  onDelete: () => void;
  onShowDetail: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(request.title);
  const [summary, setSummary] = useState(request.summary);

  return (
    <Card>
      {editing ? (
        <div className="space-y-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
          <div className="flex gap-2">
            <Button
              className="flex-1 !py-1.5 text-xs"
              onClick={() => {
                onUpdate({ title, summary });
                setEditing(false);
              }}
            >
              저장
            </Button>
            <Button variant="secondary" className="flex-1 !py-1.5 text-xs" onClick={() => setEditing(false)}>
              취소
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold">{request.title}</p>
              <p className="text-xs text-slate-500">{request.summary}</p>
            </div>
            <LevelBadge level={request.difficulty} />
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <button onClick={onShowDetail} className="rounded-full bg-sky-100 px-2 py-0.5 font-bold text-sky-700 hover:bg-sky-200">
              연구 중 {request.activeSolverIds.length}명
            </button>
            <button onClick={onShowDetail} className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700 hover:bg-emerald-200">
              제출 {request.submissionCount}건
            </button>
            <span className="ml-auto flex gap-2 text-slate-400">
              <button onClick={() => setEditing(true)} className="font-bold text-slate-500 hover:underline">
                수정
              </button>
              <button onClick={onDelete} className="font-bold text-red-500 hover:underline">
                삭제
              </button>
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
