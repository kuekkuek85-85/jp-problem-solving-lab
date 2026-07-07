import { Card, LevelBadge } from "@/components/ui";
import { LEVEL_LABELS, type StudentDoc } from "@/lib/types";

export function WaitingScreen({ student, message }: { student: StudentDoc; message: string }) {
  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-10 text-center">
      <Card className="w-full">
        <div className="text-5xl">🎖️</div>
        <h2 className="mt-3 text-lg font-black">{student.name} 연구원</h2>
        <div className="mt-2 flex justify-center">
          <LevelBadge level={student.level} />
        </div>
        <p className="mt-1 text-xs text-slate-400">{LEVEL_LABELS[student.level].tagline}</p>
        <p className="mt-5 animate-pulse text-sm font-bold text-slate-500">{message}</p>
      </Card>
    </main>
  );
}
