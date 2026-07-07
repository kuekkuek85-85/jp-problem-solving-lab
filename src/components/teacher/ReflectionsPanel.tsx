import { REFLECTION_QUESTIONS } from "@/lib/constants";
import type { ReflectionDoc, StudentDoc } from "@/lib/types";
import { Card } from "@/components/ui";

export function ReflectionsPanel({ reflections, students }: { reflections: ReflectionDoc[]; students: StudentDoc[] }) {
  const nameLookup = Object.fromEntries(students.map((s) => [s.studentId, s.name]));

  if (reflections.length === 0) {
    return <p className="text-sm text-slate-400">아직 제출된 성찰 후기가 없어요.</p>;
  }

  return (
    <div className="space-y-3">
      {reflections.map((r) => (
        <Card key={r.studentId}>
          <p className="mb-2 font-bold">{nameLookup[r.studentId] ?? r.studentId}</p>
          <div className="space-y-1 text-sm text-slate-600">
            {REFLECTION_QUESTIONS.map((q) => (
              <p key={q.id}>
                <span className="font-bold text-slate-400">{q.label}</span> {r[q.id as keyof ReflectionDoc] as string}
              </p>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
