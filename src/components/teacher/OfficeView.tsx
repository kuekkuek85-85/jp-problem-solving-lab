"use client";

import { useEffect, useState } from "react";
import type { StudentDoc, SubmissionSummaryDoc, TrafficLight } from "@/lib/types";
import { OFFICE_BG_URL, OFFICE_ONLINE_WINDOW_MS, avatarForId } from "@/lib/office-assets";

// 사무실 "구역" 정의 — 단계 진행 순서대로 배치(왼→오, 위→아래 = 진행 흐름)
type ZoneId = "lobby" | "analyze" | "prd" | "grillme" | "coding" | "submit" | "done";

const ZONES: { id: ZoneId; emoji: string; label: string; hint: string }[] = [
  { id: "analyze", emoji: "🔍", label: "의뢰 분석실", hint: "누가·언제·무엇을·효과" },
  { id: "prd", emoji: "📐", label: "설계도 작업실", hint: "작업지시서(PRD) 작성" },
  { id: "grillme", emoji: "🔥", label: "AI 검토실", hint: "Grill Me 되묻기" },
  { id: "coding", emoji: "⚡", label: "바이브 코딩 베이", hint: "AI와 함께 제작" },
  { id: "submit", emoji: "🚀", label: "제출·발표 무대", hint: "산출물 제출" },
  { id: "done", emoji: "🎉", label: "완료 라운지", hint: "제출 완료 · 쉬는 중" },
];

function zoneFor(s: StudentDoc, hasSubmission: boolean): ZoneId {
  if (s.activeStep) return s.activeStep as ZoneId; // analyze|prd|grillme|coding|submit
  if (hasSubmission) return "done";
  return "lobby";
}

function animClass(light: TrafficLight, zone: ZoneId, online: boolean): string {
  if (!online) return "";
  if (zone === "done") return "jp-office-cheer";
  if (light === "green") return "jp-office-green";
  if (light === "yellow") return "jp-office-yellow";
  if (light === "red") return "jp-office-red";
  return "jp-office-idle";
}

function faceFor(light: TrafficLight, zone: ZoneId, online: boolean): string {
  if (!online) return "💤";
  if (zone === "done") return "🎉";
  if (light === "green") return "😊";
  if (light === "yellow") return "🤔";
  if (light === "red") return "😣";
  return "🙂";
}

const DOT: Record<string, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-red-500",
};

function OfficeAvatar({ student, zone, online }: { student: StudentDoc; zone: ZoneId; online: boolean }) {
  const light = student.trafficLight;
  return (
    <div className="flex w-[76px] shrink-0 flex-col items-center" title={`${student.name}${online ? "" : " (자리 비움)"}`}>
      {/* 이름 + 신호등 점 */}
      <div className="mb-0.5 flex max-w-full items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-slate-700 shadow-sm ring-1 ring-black/5">
        {light && <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[light] ?? "bg-slate-300"}`} />}
        <span className="truncate">{student.name}</span>
      </div>

      {/* 캐릭터 + 상태 표정 */}
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarForId(student.studentId)}
          alt=""
          className={`h-20 w-auto select-none drop-shadow-sm ${animClass(light, zone, online)} ${online ? "" : "opacity-40 grayscale"}`}
          draggable={false}
        />
        <span className="absolute -right-1 -top-1 text-lg leading-none drop-shadow">{faceFor(light, zone, online)}</span>
        {student.helperModeOn && online && (
          <span className="absolute -left-1 top-6 rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white shadow">🤝</span>
        )}
        {light === "red" && online && (
          <span className="absolute -left-1 -top-1 animate-bounce text-base leading-none">🙋</span>
        )}
      </div>
    </div>
  );
}

function Zone({
  zone,
  students,
  onlineSet,
}: {
  zone: (typeof ZONES)[number];
  students: StudentDoc[];
  onlineSet: Set<string>;
}) {
  return (
    <div className="flex min-h-[150px] flex-col rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-black text-slate-800">
          <span>{zone.emoji}</span>
          <span>{zone.label}</span>
        </div>
        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">{students.length}</span>
      </div>
      <p className="mb-2 text-[11px] text-slate-400">{zone.hint}</p>
      <div className="flex flex-1 flex-wrap content-start gap-x-1 gap-y-3">
        {students.length === 0 ? (
          <p className="m-auto text-xs text-slate-300">비어 있음</p>
        ) : (
          students.map((s) => (
            <OfficeAvatar key={s.studentId} student={s} zone={zone.id} online={onlineSet.has(s.studentId)} />
          ))
        )}
      </div>
    </div>
  );
}

export function OfficeView({ students, submissions }: { students: StudentDoc[]; submissions: SubmissionSummaryDoc[] }) {
  // 온라인 판정을 위해 1초마다 "지금 시각"을 갱신(하트비트 lastActiveAt와 비교).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const submittedIds = new Set(submissions.map((x) => x.studentId));
  const onlineSet = new Set(students.filter((s) => now - (s.lastActiveAt ?? 0) < OFFICE_ONLINE_WINDOW_MS).map((s) => s.studentId));

  // 구역별 그룹화(온라인 먼저, 그다음 이름순)
  const byZone: Record<ZoneId, StudentDoc[]> = { lobby: [], analyze: [], prd: [], grillme: [], coding: [], submit: [], done: [] };
  for (const s of students) byZone[zoneFor(s, submittedIds.has(s.studentId))].push(s);
  for (const key of Object.keys(byZone) as ZoneId[]) {
    byZone[key].sort((a, b) => {
      const ao = onlineSet.has(a.studentId) ? 0 : 1;
      const bo = onlineSet.has(b.studentId) ? 0 : 1;
      return ao - bo || a.name.localeCompare(b.name, "ko");
    });
  }

  const onlineCount = onlineSet.size;

  return (
    <div className="space-y-3">
      {/* 상단 바: 안내 + 신호등 범례 */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold shadow-sm">
        <span className="text-slate-500">
          🟢 실시간 사무실 · 접속 중 <span className="text-brand">{onlineCount}</span>/{students.length}명
        </span>
        <span className="flex items-center gap-3 text-slate-400">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />순조</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />고민</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />도움 필요</span>
          <span className="flex items-center gap-1">💤 자리 비움</span>
        </span>
      </div>

      {/* 사무실 배경 위에 구역 패널을 얹는다 */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 shadow-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={OFFICE_BG_URL} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        <div className="absolute inset-0 bg-gradient-to-b from-white/55 via-white/60 to-white/70" />

        <div className="relative p-3 sm:p-4">
          {/* 입구(의뢰 고르는 중) */}
          <div className="mb-3 flex flex-wrap items-center gap-x-1 gap-y-3 rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm backdrop-blur-sm">
            <div className="mr-2 flex items-center gap-1.5 text-sm font-black text-slate-800">
              <span>🚪</span>
              <span>입구 · 의뢰 고르는 중</span>
              <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-500">{byZone.lobby.length}</span>
            </div>
            {byZone.lobby.map((s) => (
              <OfficeAvatar key={s.studentId} student={s} zone="lobby" online={onlineSet.has(s.studentId)} />
            ))}
          </div>

          {/* 작업 구역 2×3 (진행 흐름 순서) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ZONES.map((z) => (
              <Zone key={z.id} zone={z} students={byZone[z.id]} onlineSet={onlineSet} />
            ))}
          </div>
        </div>
      </div>

      {students.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-400">아직 접속한 참가자가 없어요. 참가자가 이름으로 입장하면 이곳에 나타나요.</p>
      )}
    </div>
  );
}
