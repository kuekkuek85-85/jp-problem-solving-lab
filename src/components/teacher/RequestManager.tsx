"use client";

import { useState } from "react";
import type { Level, RequestDoc } from "@/lib/types";
import { Button, Card, Input, LevelBadge, Textarea } from "@/components/ui";

export function RequestManager({ sessionCode, pin, requests }: { sessionCode: string; pin: string; requests: RequestDoc[] }) {
  const [showForm, setShowForm] = useState(false);
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
            <RequestRow key={r.id} request={r} onUpdate={(payload) => call({ action: "update", requestId: r.id, ...payload })} onDelete={() => call({ action: "delete", requestId: r.id })} />
          ))}
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
              className={`rounded-full border px-2 py-1 text-xs ${difficulty === lv ? "border-rose-400" : "border-slate-200"}`}
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
}: {
  request: RequestDoc;
  onUpdate: (payload: Record<string, unknown>) => void;
  onDelete: () => void;
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
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <span>연구 중 {request.activeSolverIds.length}명</span>
            <span>제출 {request.submissionCount}건</span>
            <span className="ml-auto flex gap-2">
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
