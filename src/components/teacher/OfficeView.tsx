"use client";

import { useEffect, useState } from "react";
import type { StudentDoc, SubmissionSummaryDoc, TrafficLight } from "@/lib/types";
import { OFFICE_ONLINE_WINDOW_MS, avatarForId } from "@/lib/office-assets";

// ── 사무실 플로어: 실제 방 구역을 % 좌표로 직접 정의한다(배경 이미지가 아니라 코드가 방을 소유) ──
type ZoneId = "lobby" | "analyze" | "prd" | "grillme" | "coding" | "submit" | "done";

interface Room {
  id: ZoneId;
  emoji: string;
  label: string;
  decor: string; // 방을 채우는 큰 가구 이모지(분위기)
  color: string; // 바닥 색(배경)
  wall: string; // 벽(테두리) 색
  x: number; // 좌(%)
  y: number; // 상(%)
  w: number; // 너비(%)
  h: number; // 높이(%)
}

const ROOMS: Room[] = [
  { id: "analyze", emoji: "🔍", label: "의뢰 분석실", decor: "📋", color: "#eef6ff", wall: "#bcdcff", x: 2, y: 4, w: 23, h: 42 },
  { id: "prd", emoji: "📐", label: "설계도 작업실", decor: "📝", color: "#fff3e9", wall: "#ffd6b0", x: 26.5, y: 4, w: 23, h: 42 },
  { id: "grillme", emoji: "🔥", label: "AI 검토실", decor: "🤖", color: "#fdeef4", wall: "#f7c6dc", x: 51, y: 4, w: 23, h: 42 },
  { id: "coding", emoji: "⚡", label: "바이브 코딩 베이", decor: "💻", color: "#eefcf3", wall: "#b7ebcb", x: 75, y: 4, w: 23, h: 42 },
  { id: "lobby", emoji: "🚪", label: "입구 · 의뢰 고르는 중", decor: "🪑", color: "#f3f4f6", wall: "#d6dae0", x: 2, y: 52, w: 23, h: 44 },
  { id: "submit", emoji: "🚀", label: "제출 · 발표 무대", decor: "🖥️", color: "#f1edff", wall: "#cfc2f5", x: 30, y: 52, w: 40, h: 44 },
  { id: "done", emoji: "🎉", label: "완료 라운지", decor: "🛋️", color: "#fffbe8", wall: "#f3e2a6", x: 73, y: 52, w: 25, h: 44 },
];
const ROOM_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.id, r])) as Record<ZoneId, Room>;

function zoneFor(s: StudentDoc, hasSubmission: boolean): ZoneId {
  if (s.activeStep) return s.activeStep as ZoneId; // analyze|prd|grillme|coding|submit
  if (hasSubmission) return "done";
  return "lobby";
}

// 방 안에서 i번째(총 n명) 캐릭터가 설 자리(중심 x%, 이름표 top%)
function slotIn(room: Room, i: number, n: number): { left: number; top: number } {
  const cols = Math.min(Math.max(n, 1), 4);
  const col = i % cols;
  const row = Math.floor(i / cols);
  const rows = Math.ceil(n / cols);
  const usableW = room.w * 0.84;
  const colStep = usableW / cols;
  const left = room.x + room.w * 0.08 + colStep * (col + 0.5);
  const areaTop = room.y + room.h * 0.4;
  const areaH = room.h * 0.52;
  const rowStep = rows > 1 ? areaH / rows : 0;
  const top = areaTop + (rows > 1 ? rowStep * (row + 0.35) : areaH * 0.25);
  return { left, top };
}

// studentId → 안정적인 숫자 해시(로밍 애니메이션 variation용)
function hashNum(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = (h ^ id.charCodeAt(i)) * 16777619;
  return Math.abs(h >>> 0);
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

const DOT: Record<string, string> = { green: "bg-emerald-500", yellow: "bg-amber-400", red: "bg-red-500" };

function Character({ student, zone, online, left, top }: { student: StudentDoc; zone: ZoneId; online: boolean; left: number; top: number }) {
  const light = student.trafficLight;
  const hv = hashNum(student.studentId);
  const roamDur = 5.5 + (hv % 40) / 10; // 5.5~9.4s
  const roamDelay = -(hv % 70) / 10; // 0~-7s (제각각 시작)

  return (
    <div
      className="absolute flex -translate-x-1/2 flex-col items-center"
      style={{ left: `${left}%`, top: `${top}%`, zIndex: Math.round(top) + 10, transition: "left 1.6s cubic-bezier(.4,0,.2,1), top 1.6s cubic-bezier(.4,0,.2,1)" }}
      title={`${student.name}${online ? "" : " · 자리 비움"}`}
    >
      {/* 방 안 서성임(roam) — 참가자마다 속도/시작이 달라 자연스럽게 움직인다 */}
      <div className={online ? "jp-office-roam" : ""} style={online ? { animationDuration: `${roamDur}s`, animationDelay: `${roamDelay}s` } : undefined}>
        <div className="flex flex-col items-center">
          {/* 이름 + 신호등 */}
          <div className="mb-0.5 flex max-w-[84px] items-center gap-1 rounded-full bg-white/95 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 shadow ring-1 ring-black/5">
            {light && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[light] ?? "bg-slate-300"}`} />}
            <span className="truncate">{student.name}</span>
          </div>
          {/* 캐릭터 + 그림자 + 표정 */}
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarForId(student.studentId)}
              alt=""
              className={`h-[52px] w-auto select-none ${animClass(light, zone, online)} ${online ? "" : "opacity-45 grayscale"}`}
              draggable={false}
            />
            <span className="absolute -right-1.5 -top-1 text-base leading-none drop-shadow">{faceFor(light, zone, online)}</span>
            {student.helperModeOn && online && (
              <span className="absolute -left-2 top-4 rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-white shadow">🤝</span>
            )}
            {light === "red" && online && <span className="absolute -left-1.5 -top-1 animate-bounce text-sm leading-none">🙋</span>}
          </div>
          {/* 바닥 그림자 */}
          <div className="h-1.5 w-7 -translate-y-1 rounded-[50%] bg-black/15 blur-[1px]" />
        </div>
      </div>
    </div>
  );
}

function RoomBox({ room, count }: { room: Room; count: number }) {
  return (
    <div
      className="absolute rounded-2xl"
      style={{
        left: `${room.x}%`,
        top: `${room.y}%`,
        width: `${room.w}%`,
        height: `${room.h}%`,
        background: room.color,
        border: `2px solid ${room.wall}`,
        boxShadow: "inset 0 2px 0 rgba(255,255,255,.7), inset 0 -10px 20px rgba(0,0,0,.04), 0 2px 6px rgba(0,0,0,.05)",
      }}
    >
      {/* 방 가구(분위기용, 흐리게) */}
      <span className="pointer-events-none absolute bottom-1 right-2 select-none text-4xl opacity-20">{room.decor}</span>
      {/* 방 이름표 */}
      <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-lg bg-white/85 px-2 py-0.5 text-[11px] font-black text-slate-700 shadow-sm">
        <span>{room.emoji}</span>
        <span className="whitespace-nowrap">{room.label}</span>
        <span className="ml-0.5 rounded-full bg-slate-900/5 px-1.5 text-[10px] text-slate-500">{count}</span>
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

  // 구역별 그룹화(온라인 먼저, 그다음 이름순) → 방 안에서 겹치지 않게 자리 배정
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
          🏢 실시간 사무실 · 접속 중 <span className="text-brand">{onlineCount}</span>/{students.length}명
        </span>
        <span className="flex flex-wrap items-center gap-3 text-slate-400">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />순조</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />고민</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />도움 필요 🙋</span>
          <span className="flex items-center gap-1">💤 자리 비움</span>
        </span>
      </div>

      {/* 플로어(가로 스크롤 가능) */}
      <div className="overflow-x-auto">
        <div
          className="relative h-[560px] min-w-[720px] overflow-hidden rounded-3xl border border-slate-200 shadow-inner sm:h-[620px] lg:h-[680px]"
          style={{
            // 바닥 타일(마루) 느낌
            background:
              "repeating-linear-gradient(0deg, #f6ede0 0 38px, #f1e6d6 38px 76px), repeating-linear-gradient(90deg, rgba(0,0,0,.025) 0 1px, transparent 1px 76px)",
          }}
        >
          {/* 방 바닥·벽 먼저 깔고 */}
          {ROOMS.map((r) => (
            <RoomBox key={r.id} room={r} count={byZone[r.id].length} />
          ))}

          {/* 그 위에 캐릭터를 올린다(방이 바뀌면 left/top 전환으로 '걸어서' 이동) */}
          {students.map((s) => {
            const zone = zoneFor(s, submittedIds.has(s.studentId));
            const room = ROOM_BY_ID[zone];
            const list = byZone[zone];
            const idx = list.findIndex((x) => x.studentId === s.studentId);
            const { left, top } = slotIn(room, idx < 0 ? 0 : idx, list.length);
            return <Character key={s.studentId} student={s} zone={zone} online={onlineSet.has(s.studentId)} left={left} top={top} />;
          })}
        </div>
      </div>

      {students.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-400">아직 접속한 참가자가 없어요. 참가자가 이름으로 입장하면 사무실에 나타나요.</p>
      )}
    </div>
  );
}
