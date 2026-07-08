"use client";

import { useEffect, useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { projectPath } from "@/lib/paths";
import { SEEDLING_ANALYZE_TEMPLATE } from "@/lib/constants";
import { advanceProject } from "@/lib/actions";
import type { AnalyzeData, ProjectDoc, StudentDoc } from "@/lib/types";
import { Button, Card, Field, Input } from "@/components/ui";
import { StampCelebration } from "./StampCelebration";

export function AnalyzeStage({
  sessionCode,
  student,
  project,
}: {
  sessionCode: string;
  student: StudentDoc;
  project: ProjectDoc;
}) {
  const [data, setData] = useState<AnalyzeData>(() =>
    project.analyze.who || project.analyze.what
      ? project.analyze
      : student.level === "seedling"
      ? SEEDLING_ANALYZE_TEMPLATE
      : project.analyze
  );
  const [celebrate, setCelebrate] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateDoc(doc(db, projectPath(sessionCode, student.studentId, project.id)), { analyze: data }).catch(() => {});
    }, 1500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const preview = `${data.who || "(누가)"}는(은) ${data.when || "(언제)"} ${data.what || "(무엇 때문에)"} 불편해요. 해결되면 ${
    data.benefit || "(무엇이 좋아지나요)"
  }.`;

  const complete = data.who.trim() && data.when.trim() && data.what.trim() && data.benefit.trim();

  async function submit() {
    if (!complete) return;
    await advanceProject({
      sessionCode,
      studentId: student.studentId,
      projectId: project.id,
      stamp: 1,
      nextStep: "prd",
      projectFields: { analyze: data, "prd.problem": preview },
    });
    setCelebrate(true);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Card>
        <div className="mb-4 rounded-lg bg-brand/5 px-3 py-2 text-sm font-bold text-brand-deep">
          맡은 의뢰: {project.requestTitle}
        </div>
        <h2 className="mb-1 text-lg font-black">의뢰 분석 — 문제 정의</h2>
        <p className="mb-5 text-sm text-slate-500">이 의뢰를 자기 말로 다시 정의해보세요.</p>

        {student.level === "seedling" && (
          <p className="mb-4 rounded-lg bg-lime-50 px-3 py-2 text-xs font-bold text-lime-700">
            🌱 예시가 채워져 있어요. 자유롭게 수정해서 완성해보세요!
          </p>
        )}

        <div className="space-y-4">
          <Field label="누가 불편한가요?">
            <Input value={data.who} onChange={(e) => setData({ ...data, who: e.target.value })} placeholder="예: 급식실을 이용하는 학생들" />
          </Field>
          <Field label="언제 불편한가요?">
            <Input value={data.when} onChange={(e) => setData({ ...data, when: e.target.value })} placeholder="예: 점심시간마다" />
          </Field>
          <Field label="무엇 때문에 불편한가요?">
            <Input value={data.what} onChange={(e) => setData({ ...data, what: e.target.value })} placeholder="예: 오늘 메뉴를 미리 알 수 없어서" />
          </Field>
          <Field label="해결되면 무엇이 좋아지나요?">
            <Input value={data.benefit} onChange={(e) => setData({ ...data, benefit: e.target.value })} placeholder="예: 급식을 미리 확인하고 잔반도 줄어요" />
          </Field>
        </div>

        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
          <span className="mb-1 block text-xs font-bold text-slate-400">한 문장 미리보기</span>
          {preview}
        </div>

        <Button className="mt-6 w-full" disabled={!complete} onClick={submit}>
          분석 완료하고 다음 단계로
        </Button>
      </Card>

      {celebrate && <StampCelebration stamp={1} onDone={() => setCelebrate(false)} />}
    </main>
  );
}
