"use client";

import { useMemo, useRef, useState } from "react";
import type { ReflectionDoc, StudentDoc, SubmissionSummaryDoc } from "@/lib/types";
import { Button, Card } from "@/components/ui";

/* 교사 연수 시상 도우미 — 라이브 데이터로 자격자를 집계하고 추첨/선정을 돕는다.
   - 🌱 성장상: 사전 "바이브 코딩 경험 없음" → 완주(산출물 제출)
   - 🛠️ 장인정신상: 완주자 중 설계도를 공들인 사람(강사가 보고 선택 또는 추첨)
   - 🏆 다작상: 산출물 2개 이상 완주
   추첨은 각 상별 자격자 중 1명, 또는 응모권(가중) 방식으로 3명.  */

type AwardKey = "growth" | "craft" | "multi";

interface Stat {
  student: StudentDoc;
  count: number; // 제출(완주) 개수
  completed: boolean;
  noExp: boolean; // 사전 경험 없음
  hasReflection: boolean;
  tickets: number; // 응모권
}

export function AwardsPanel({
  students,
  submissions,
  reflections,
}: {
  students: StudentDoc[];
  submissions: SubmissionSummaryDoc[];
  reflections: ReflectionDoc[];
}) {
  const [dedupe, setDedupe] = useState(true);
  const [winners, setWinners] = useState<Record<AwardKey, string | null>>({ growth: null, craft: null, multi: null });
  const [lotto, setLotto] = useState<string[]>([]);
  const [rolling, setRolling] = useState<AwardKey | "lotto" | null>(null);
  const rollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stats = useMemo<Stat[]>(() => {
    const reflSet = new Set(reflections.map((r) => r.studentId));
    const countBy = new Map<string, number>();
    for (const s of submissions) countBy.set(s.studentId, (countBy.get(s.studentId) ?? 0) + 1);
    return students.map((student) => {
      const count = countBy.get(student.studentId) ?? 0;
      const completed = count >= 1;
      const noExp = student.trainingSurvey?.vibeExperience === "no";
      const hasReflection = reflSet.has(student.studentId);
      // 응모권: 완주 1 + 성찰 1 + (경험없음→완주) 1 + 추가 완주(2건째부터) 각 1
      const tickets = (completed ? 1 : 0) + (hasReflection ? 1 : 0) + (noExp && completed ? 1 : 0) + Math.max(0, count - 1);
      return { student, count, completed, noExp, hasReflection, tickets };
    });
  }, [students, submissions, reflections]);

  const byId = useMemo(() => Object.fromEntries(stats.map((s) => [s.student.studentId, s])), [stats]);

  const growthPool = stats.filter((s) => s.noExp && s.completed);
  const craftPool = stats.filter((s) => s.completed); // 질적 판단 → 완주자 전체가 후보
  const multiPool = stats.filter((s) => s.count >= 2);

  function otherWinnerIds(except: AwardKey): Set<string> {
    const ids = new Set<string>();
    (Object.keys(winners) as AwardKey[]).forEach((k) => {
      if (k !== except && winners[k]) ids.add(winners[k] as string);
    });
    return ids;
  }

  function eligible(pool: Stat[], award: AwardKey): Stat[] {
    if (!dedupe) return pool;
    const blocked = otherWinnerIds(award);
    return pool.filter((s) => !blocked.has(s.student.studentId));
  }

  function stopRoll() {
    if (rollRef.current) {
      clearInterval(rollRef.current);
      rollRef.current = null;
    }
  }

  function drawAward(award: AwardKey, pool: Stat[]) {
    const cands = eligible(pool, award);
    if (cands.length === 0) return;
    stopRoll();
    setRolling(award);
    let ticks = 0;
    rollRef.current = setInterval(() => {
      ticks++;
      const pick = cands[Math.floor(Math.random() * cands.length)].student.studentId;
      setWinners((w) => ({ ...w, [award]: pick }));
      if (ticks >= 14) {
        stopRoll();
        setRolling(null);
      }
    }, 70);
  }

  function pickManual(award: AwardKey, id: string) {
    stopRoll();
    setRolling(null);
    setWinners((w) => ({ ...w, [award]: w[award] === id ? null : id }));
  }

  // 응모권 가중 추첨 3명(비복원)
  function drawLotto() {
    stopRoll();
    const base = stats.filter((s) => s.tickets > 0);
    if (base.length === 0) return;
    setRolling("lotto");
    let ticks = 0;
    rollRef.current = setInterval(() => {
      ticks++;
      const pool = [...base];
      const chosen: string[] = [];
      const n = Math.min(3, pool.length);
      for (let k = 0; k < n; k++) {
        const total = pool.reduce((a, s) => a + s.tickets, 0);
        let r = Math.random() * total;
        let idx = 0;
        for (let i = 0; i < pool.length; i++) {
          r -= pool[i].tickets;
          if (r <= 0) { idx = i; break; }
        }
        chosen.push(pool[idx].student.studentId);
        pool.splice(idx, 1);
      }
      setLotto(chosen);
      if (ticks >= 16) {
        stopRoll();
        setRolling(null);
      }
    }, 70);
  }

  function resetAll() {
    stopRoll();
    setRolling(null);
    setWinners({ growth: null, craft: null, multi: null });
    setLotto([]);
  }

  const nameOf = (id: string) => byId[id]?.student.name ?? id;

  const AWARDS: { key: AwardKey; emoji: string; title: string; desc: string; pool: Stat[]; empty: string }[] = [
    { key: "growth", emoji: "🌱", title: "가장 성장상", desc: "사전 \"경험 없음\" → 오늘 산출물 완주", pool: growthPool, empty: "자격자가 아직 없어요(경험 없음 + 완주)." },
    { key: "craft", emoji: "🛠️", title: "장인정신상", desc: "설계도를 공들인 사람 — 완주자 중 선택/추첨", pool: craftPool, empty: "완주자가 아직 없어요." },
    { key: "multi", emoji: "🏆", title: "다작상", desc: "산출물 2개 이상 완주", pool: multiPool, empty: "2개 이상 완주자가 아직 없어요." },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          라이브 집계 · 완주 <b>{stats.filter((s) => s.completed).length}</b>명 · 성찰 <b>{stats.filter((s) => s.hasReflection).length}</b>명 · 2건↑ <b>{multiPool.length}</b>명
        </p>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-slate-600">
            <input type="checkbox" checked={dedupe} onChange={(e) => setDedupe(e.target.checked)} />
            한 명 1상(중복 제외)
          </label>
          <Button variant="ghost" onClick={resetAll}>초기화</Button>
        </div>
      </div>

      {/* 상 3개 */}
      <div className="grid gap-3 md:grid-cols-3">
        {AWARDS.map((a) => {
          const cands = eligible(a.pool, a.key);
          const winnerId = winners[a.key];
          return (
            <Card key={a.key} className="flex flex-col">
              <div className="mb-1 flex items-center gap-1.5 text-base font-black">
                <span>{a.emoji}</span>
                <span>{a.title}</span>
              </div>
              <p className="mb-3 text-xs text-slate-500">{a.desc}</p>

              {/* 당첨자 */}
              <div className={`mb-3 flex min-h-[52px] items-center justify-center rounded-xl border-2 border-dashed ${winnerId ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
                {winnerId ? (
                  <span className={`text-lg font-black text-amber-700 ${rolling === a.key ? "" : "jp-pop-in"}`}>🎉 {nameOf(winnerId)}</span>
                ) : (
                  <span className="text-xs text-slate-400">미정</span>
                )}
              </div>

              <Button
                onClick={() => drawAward(a.key, a.pool)}
                disabled={cands.length === 0 || rolling !== null}
                className="mb-2 w-full"
              >
                🎲 추첨 ({cands.length}명 중)
              </Button>

              {/* 자격자(수동 선택 가능) */}
              {a.pool.length === 0 ? (
                <p className="text-[11px] text-slate-400">{a.empty}</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {a.pool.map((s) => {
                    const blocked = dedupe && otherWinnerIds(a.key).has(s.student.studentId);
                    const isWin = winnerId === s.student.studentId;
                    return (
                      <button
                        key={s.student.studentId}
                        onClick={() => !blocked && pickManual(a.key, s.student.studentId)}
                        disabled={blocked}
                        title={blocked ? "다른 상 당첨자" : "클릭해 직접 선정/해제"}
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold transition ${
                          isWin ? "bg-amber-400 text-white" : blocked ? "cursor-not-allowed bg-slate-100 text-slate-300 line-through" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {s.student.name}{a.key === "multi" ? ` ·${s.count}` : ""}
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* 응모권 가중 추첨 */}
      <Card>
        <div className="mb-1 flex items-center gap-1.5 text-base font-black">🎟️ 응모권 추첨 (대안)</div>
        <p className="mb-3 text-xs text-slate-500">
          완주 1장 · 성찰 1장 · (경험없음→완주) 보너스 1장 · 추가 완주 각 1장. 열심히·성장한 분일수록 당첨 확률이 올라가요. 비복원으로 3명을 뽑아요.
        </p>

        {lotto.length > 0 && (
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            {lotto.map((id, i) => (
              <span key={id} className={`rounded-xl bg-amber-50 px-4 py-2 text-lg font-black text-amber-700 ${rolling === "lotto" ? "" : "jp-pop-in"}`}>
                🏆 {i + 1}. {nameOf(id)}
              </span>
            ))}
          </div>
        )}

        <Button onClick={drawLotto} disabled={rolling !== null || stats.every((s) => s.tickets === 0)} className="mb-3 w-full">
          🎲 응모권으로 3명 추첨
        </Button>

        {/* 응모권 현황 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="py-1 pr-3">이름</th>
                <th className="py-1 pr-3">완주</th>
                <th className="py-1 pr-3">성찰</th>
                <th className="py-1 pr-3">경험없음</th>
                <th className="py-1 pr-3 text-right">응모권</th>
              </tr>
            </thead>
            <tbody>
              {[...stats].sort((a, b) => b.tickets - a.tickets).map((s) => (
                <tr key={s.student.studentId} className="border-t border-slate-100">
                  <td className="py-1 pr-3 font-bold text-slate-700">{s.student.name}</td>
                  <td className="py-1 pr-3">{s.count > 0 ? `${s.count}건` : "—"}</td>
                  <td className="py-1 pr-3">{s.hasReflection ? "✅" : "—"}</td>
                  <td className="py-1 pr-3">{s.noExp ? "✅" : "—"}</td>
                  <td className="py-1 pr-3 text-right font-black text-brand">{s.tickets}</td>
                </tr>
              ))}
              {stats.length === 0 && (
                <tr><td colSpan={5} className="py-3 text-center text-slate-400">아직 참가자가 없어요.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-[11px] text-slate-400">
        * 2시간 안에 2건 이상(다작)이 없으면 다작상 자리는 비워두고, 완주자 중 추첨하거나 응모권 추첨 1명으로 대체하세요.
      </p>
    </div>
  );
}
