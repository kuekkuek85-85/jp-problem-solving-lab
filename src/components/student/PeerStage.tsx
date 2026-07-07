"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { projectPath } from "@/lib/paths";
import { useProject } from "@/lib/hooks";
import { advanceProject } from "@/lib/actions";
import type { PeerFeedback, ProjectDoc, StudentDoc } from "@/lib/types";
import { Button, Card, Input } from "@/components/ui";
import { StampCelebration } from "./StampCelebration";

export function PeerStage({
  sessionCode,
  student,
  project,
}: {
  sessionCode: string;
  student: StudentDoc;
  project: ProjectDoc;
}) {
  const targetStudentId = project.peerMatch.targetStudentId;
  const targetProjectId = project.peerMatch.targetProjectId;
  const { project: targetProject, loading } = useProject(sessionCode, targetStudentId, targetProjectId);

  const [praise, setPraise] = useState(project.peerMatch.feedbackGiven?.praise ?? "");
  const [question, setQuestion] = useState(project.peerMatch.feedbackGiven?.question ?? "");
  const [suggestion, setSuggestion] = useState(project.peerMatch.feedbackGiven?.suggestion ?? "");
  const [celebrate, setCelebrate] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!targetProjectId || !targetStudentId) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Card className="text-center">
          <div className="text-4xl">🤝</div>
          <p className="mt-3 font-bold text-slate-700">동료 검토 짝을 기다리는 중이에요</p>
          <p className="mt-1 text-sm text-slate-500">선생님이 랜덤 매칭을 진행하면 자동으로 시작돼요.</p>
        </Card>
      </main>
    );
  }

  const complete = praise.trim() && question.trim() && suggestion.trim();

  async function submit() {
    if (!complete || !targetProjectId || !targetStudentId) return;
    setSaving(true);
    try {
      const feedback: PeerFeedback = { praise, question, suggestion };
      await updateDoc(doc(db, projectPath(sessionCode, student.studentId, project.id)), {
        "peerMatch.feedbackGiven": feedback,
      });
      await updateDoc(doc(db, projectPath(sessionCode, targetStudentId, targetProjectId)), {
        "peerMatch.feedbackReceived": feedback,
      });
      await advanceProject({
        sessionCode,
        studentId: student.studentId,
        projectId: project.id,
        stamp: 4,
        nextStep: "coding",
      });
      setCelebrate(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Card>
        <h2 className="mb-1 text-lg font-black">동료 검토</h2>
        <p className="mb-5 text-sm text-slate-500">
          <span className="font-bold text-rose-600">{project.peerMatch.targetName}</span> 연구원의 설계도를 검토해주세요.
        </p>

        {loading && <p className="text-sm text-slate-400">설계도를 불러오는 중...</p>}

        {targetProject && (
          <div className="mb-5 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p><span className="font-bold">의뢰:</span> {targetProject.requestTitle}</p>
            <p><span className="font-bold">한 줄 소개:</span> {targetProject.prd.oneLiner}</p>
            <p><span className="font-bold">핵심 기능:</span> {targetProject.prd.coreFeatures.filter(Boolean).join(", ")}</p>
            <p><span className="font-bold">사용자:</span> {targetProject.prd.usersNote}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-800">👍 칭찬 1가지</label>
            <Input value={praise} onChange={(e) => setPraise(e.target.value)} placeholder="좋았던 점을 알려주세요" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-800">❓ 질문 1가지</label>
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="궁금한 점을 물어보세요" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-800">💡 제안 1가지</label>
            <Input value={suggestion} onChange={(e) => setSuggestion(e.target.value)} placeholder="더 좋아질 아이디어를 제안해주세요" />
          </div>
        </div>

        <Button className="mt-6 w-full" disabled={!complete || saving} onClick={submit}>
          {saving ? "제출 중..." : "동료 검토 완료하고 다음 단계로"}
        </Button>
      </Card>

      {celebrate && <StampCelebration stamp={4} onDone={() => setCelebrate(false)} />}
    </main>
  );
}
