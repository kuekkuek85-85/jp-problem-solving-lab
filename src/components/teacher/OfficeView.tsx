"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { StudentDoc, SubmissionSummaryDoc, TrafficLight } from "@/lib/types";
import { OFFICE_ONLINE_WINDOW_MS } from "@/lib/office-assets";

/* ──────────────────────────────────────────────────────────
   냥냥 오피스 — 픽셀 2D 사무실. 방 구역을 코드로 정의하고
   고양이 스프라이트(인라인 SVG)가 단계에 따라 방을 걸어 이동한다.
   ────────────────────────────────────────────────────────── */

type ZoneId = "lobby" | "analyze" | "prd" | "grillme" | "coding" | "submit" | "done";

interface Room {
  id: ZoneId;
  emoji: string;
  label: string;
  floor: string; // 바닥색
  floorAlt: string; // 바닥 체크무늬 보조색
  wall: string; // 벽색
  x: number;
  y: number;
  w: number;
  h: number;
  furniture: { type: FurnitureType; left: number; top: number }[];
}

type FurnitureType = "server" | "desk" | "table" | "sofa" | "plant" | "screens" | "board" | "robot" | "draft";

const ROOMS: Room[] = [
  {
    id: "analyze", emoji: "🔍", label: "의뢰 분석실", floor: "#2d3a4f", floorAlt: "#273344", wall: "#1c2636",
    x: 1, y: 3, w: 23.5, h: 44,
    furniture: [{ type: "board", left: 20, top: 16 }, { type: "desk", left: 55, top: 40 }, { type: "plant", left: 82, top: 20 }],
  },
  {
    id: "prd", emoji: "📐", label: "설계도 작업실", floor: "#4a3b2a", floorAlt: "#413322", wall: "#2c2217",
    x: 25.5, y: 3, w: 23.5, h: 44,
    furniture: [{ type: "draft", left: 28, top: 36 }, { type: "desk", left: 66, top: 22 }, { type: "plant", left: 86, top: 46 }],
  },
  {
    id: "grillme", emoji: "🔥", label: "AI 검토실", floor: "#45293a", floorAlt: "#3c2333", wall: "#2a1826",
    x: 50, y: 3, w: 23.5, h: 44,
    furniture: [{ type: "robot", left: 30, top: 24 }, { type: "screens", left: 66, top: 20 }],
  },
  {
    id: "coding", emoji: "⚡", label: "개발실", floor: "#24403a", floorAlt: "#1f3832", wall: "#162b27",
    x: 74.5, y: 3, w: 24.5, h: 44,
    furniture: [{ type: "desk", left: 24, top: 22 }, { type: "desk", left: 58, top: 22 }, { type: "desk", left: 40, top: 48 }],
  },
  {
    id: "lobby", emoji: "🚪", label: "입구 · 대기", floor: "#30343f", floorAlt: "#2a2e38", wall: "#1f2530",
    x: 1, y: 50, w: 23.5, h: 47,
    furniture: [{ type: "sofa", left: 30, top: 30 }, { type: "plant", left: 80, top: 24 }, { type: "sofa", left: 55, top: 62 }],
  },
  {
    id: "submit", emoji: "🚀", label: "미팅룸 · 발표", floor: "#3a2f4f", floorAlt: "#332945", wall: "#241d33",
    x: 25.5, y: 50, w: 40, h: 47,
    furniture: [{ type: "table", left: 42, top: 34 }, { type: "board", left: 10, top: 16 }, { type: "plant", left: 88, top: 20 }],
  },
  {
    id: "done", emoji: "🎉", label: "라운지", floor: "#4a4327", floorAlt: "#413b22", wall: "#2d2817",
    x: 66.5, y: 50, w: 32.5, h: 47,
    furniture: [{ type: "sofa", left: 28, top: 30 }, { type: "plant", left: 72, top: 24 }, { type: "table", left: 55, top: 58 }],
  },
];
const ROOM_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.id, r])) as Record<ZoneId, Room>;

const ZONE_SHORT: Record<ZoneId, string> = {
  lobby: "대기", analyze: "의뢰 분석", prd: "설계도", grillme: "AI 검토", coding: "코딩", submit: "제출·발표", done: "완료",
};

function zoneFor(s: StudentDoc, hasSubmission: boolean): ZoneId {
  if (s.activeStep) return s.activeStep as ZoneId;
  if (hasSubmission) return "done";
  return "lobby";
}

function hashNum(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = (h ^ id.charCodeAt(i)) * 16777619;
  return Math.abs(h >>> 0);
}

function slotIn(room: Room, i: number, n: number): { left: number; top: number } {
  const cols = Math.min(Math.max(n, 1), 4);
  const col = i % cols;
  const row = Math.floor(i / cols);
  const rows = Math.ceil(n / cols);
  const usableW = room.w * 0.82;
  const colStep = usableW / cols;
  const left = room.x + room.w * 0.09 + colStep * (col + 0.5);
  const areaTop = room.y + room.h * 0.52;
  const areaH = room.h * 0.4;
  const rowStep = rows > 1 ? areaH / rows : 0;
  const top = areaTop + (rows > 1 ? rowStep * (row + 0.4) : areaH * 0.3);
  return { left, top };
}

/* ── 고양이 팔레트(8종) — s: 줄무늬색(태비). 없으면 몸색과 동일(단색) ── */
interface Palette { b: string; d: string; e: string; l: string; p: string; i: string; s: string }
const CATS: Palette[] = [
  { b: "#f2a44c", d: "#9a4f1f", e: "#2a2a2a", l: "#ffe3c0", p: "#e06a86", i: "#f4b9c6", s: "#c9742e" }, // 치즈 태비
  { b: "#a7b0ba", d: "#525c66", e: "#2a2a2a", l: "#e6ebf0", p: "#e06a86", i: "#f4b9c6", s: "#717c88" }, // 회색 태비
  { b: "#3c414b", d: "#202329", e: "#9be36a", l: "#5a5f69", p: "#e06a86", i: "#7a4a55", s: "#3c414b" }, // 검정(단색)
  { b: "#f3f1ec", d: "#b7b3aa", e: "#2a2a2a", l: "#ffffff", p: "#e06a86", i: "#f4b9c6", s: "#f3f1ec" }, // 흰색(단색)
  { b: "#b2794b", d: "#5f3d22", e: "#2a2a2a", l: "#e8c9a6", p: "#e06a86", i: "#d79a86", s: "#7d4f2c" }, // 갈색 태비
  { b: "#ead7b0", d: "#9a7b4f", e: "#2a2a2a", l: "#fff3d8", p: "#e06a86", i: "#f0c7a0", s: "#cbb386" }, // 크림 태비
  { b: "#8fb6cf", d: "#4a6b84", e: "#2a2a2a", l: "#dcecf5", p: "#e06a86", i: "#f4b9c6", s: "#6e96b0" }, // 블루 태비
  { b: "#33373f", d: "#1c2026", e: "#9be36a", l: "#f3f1ec", p: "#e06a86", i: "#7a4a55", s: "#33373f" }, // 턱시도(단색)
];

// 12행(0~9 몸통) 픽셀 고양이 맵. s=줄무늬. 다리(10행)는 2프레임으로 별도 렌더.
const CAT_MAP = [
  ".dd......dd.",
  ".did....did.",
  ".dbbdddddbbd",
  ".dbbsbsbsbbd", // 이마 줄무늬
  ".dbebbbbebbd",
  ".dbbbppbbbd.",
  "..dbbllbbd..",
  "...dbbbbd...",
  "..dbsbsbbd.d", // 몸통 줄무늬
  ".dbbsbsbsbdd", // 몸통 줄무늬 + 꼬리
];
const CELL = 4;
function PixelCat({ pal, online = true }: { pal: Palette; online?: boolean }) {
  const color: Record<string, string> = { d: pal.d, b: pal.b, e: pal.e, l: pal.l, p: pal.p, i: pal.i, s: pal.s };
  const rects: ReactNode[] = [];
  CAT_MAP.forEach((rowStr, y) => {
    for (let x = 0; x < rowStr.length; x++) {
      const c = rowStr[x];
      if (c === ".") continue;
      const fill = color[c] ?? pal.b;
      rects.push(<rect key={`${x}-${y}`} x={x * CELL} y={y * CELL} width={CELL} height={CELL} fill={fill} />);
    }
  });
  const w = 12 * CELL;
  const h = 11 * CELL;
  const fy = 10 * CELL; // 다리 y
  // 프레임A: 다리 벌림 / 프레임B: 다리 모음 → 교대하면 걷는 것처럼 보인다
  const feetA = (
    <g className={online ? "jp-cat-legA" : ""}>
      <rect x={2 * CELL} y={fy} width={2 * CELL} height={CELL} fill={pal.d} />
      <rect x={8 * CELL} y={fy} width={2 * CELL} height={CELL} fill={pal.d} />
    </g>
  );
  const feetB = online ? (
    <g className="jp-cat-legB">
      <rect x={3 * CELL} y={fy} width={2 * CELL} height={CELL} fill={pal.d} />
      <rect x={7 * CELL} y={fy} width={2 * CELL} height={CELL} fill={pal.d} />
    </g>
  ) : null;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" className="jp-pixel block">
      {rects}
      {feetA}
      {feetB}
    </svg>
  );
}

/* ── 픽셀 가구 ─────────────────────────── */
function Furniture({ type }: { type: FurnitureType }) {
  const ce = { shapeRendering: "crispEdges" as const, className: "jp-pixel block" };
  switch (type) {
    case "server":
      return (
        <svg width={28} height={48} viewBox="0 0 14 24" {...ce}>
          <rect x="1" y="1" width="12" height="22" fill="#20242c" stroke="#10131a" />
          {[3, 7, 11, 15, 19].map((y) => (
            <g key={y}>
              <rect x="2" y={y} width="10" height="3" fill="#2c313b" />
              <rect x="3" y={y + 1} width="1" height="1" fill={y % 2 ? "#5be38a" : "#f2b84c"} />
              <rect x="5" y={y + 1} width="1" height="1" fill="#5be38a" />
            </g>
          ))}
        </svg>
      );
    case "desk":
      return (
        <svg width={46} height={34} viewBox="0 0 23 17" {...ce}>
          <rect x="6" y="2" width="11" height="7" fill="#15181f" stroke="#0a0c10" />
          <rect x="7" y="3" width="9" height="5" fill="#3aa0c9" />
          <rect x="10" y="9" width="3" height="2" fill="#2a2e36" />
          <rect x="1" y="11" width="21" height="3" fill="#7a5433" />
          <rect x="2" y="14" width="2" height="3" fill="#5f3d22" />
          <rect x="19" y="14" width="2" height="3" fill="#5f3d22" />
        </svg>
      );
    case "table":
      return (
        <svg width={72} height={34} viewBox="0 0 36 17" {...ce}>
          <rect x="2" y="4" width="32" height="9" rx="2" fill="#6e4a2c" stroke="#4a3017" />
          <rect x="4" y="5" width="28" height="4" fill="#875c38" />
          <rect x="14" y="6" width="4" height="2" fill="#f3f1ec" />
          <rect x="20" y="6" width="3" height="2" fill="#e6c34a" />
          <rect x="5" y="13" width="2" height="3" fill="#4a3017" />
          <rect x="29" y="13" width="2" height="3" fill="#4a3017" />
        </svg>
      );
    case "sofa":
      return (
        <svg width={48} height={30} viewBox="0 0 24 15" {...ce}>
          <rect x="1" y="4" width="22" height="9" rx="2" fill="#d2695f" stroke="#99433c" />
          <rect x="2" y="2" width="4" height="9" rx="1" fill="#c25a50" />
          <rect x="18" y="2" width="4" height="9" rx="1" fill="#c25a50" />
          <rect x="7" y="6" width="4" height="4" fill="#e08a82" />
          <rect x="13" y="6" width="4" height="4" fill="#e08a82" />
        </svg>
      );
    case "plant":
      return (
        <svg width={22} height={32} viewBox="0 0 11 16" {...ce}>
          <rect x="2" y="1" width="7" height="3" fill="#4fae5a" />
          <rect x="1" y="3" width="9" height="4" fill="#5bc267" />
          <rect x="3" y="6" width="5" height="3" fill="#3f9e4c" />
          <rect x="3" y="9" width="5" height="5" fill="#9a6a3a" stroke="#6e4a26" />
        </svg>
      );
    case "screens":
      return (
        <svg width={52} height={26} viewBox="0 0 26 13" {...ce}>
          {[1, 10, 19].map((x) => (
            <g key={x}>
              <rect x={x} y="1" width="6" height="5" fill="#13161c" stroke="#0a0c10" />
              <rect x={x + 1} y="2" width="4" height="3" fill="#c15a86" />
            </g>
          ))}
          <rect x="1" y="7" width="24" height="1" fill="#3a2f45" />
        </svg>
      );
    case "board":
      return (
        <svg width={40} height={30} viewBox="0 0 20 15" {...ce}>
          <rect x="1" y="1" width="18" height="11" fill="#f1efe8" stroke="#8a867c" />
          <rect x="3" y="3" width="9" height="1" fill="#3aa0c9" />
          <rect x="3" y="5" width="12" height="1" fill="#e06a86" />
          <rect x="3" y="7" width="7" height="1" fill="#4fae5a" />
          <rect x="3" y="9" width="10" height="1" fill="#e6c34a" />
          <rect x="9" y="12" width="2" height="2" fill="#8a867c" />
        </svg>
      );
    case "robot":
      return (
        <svg width={28} height={36} viewBox="0 0 14 18" {...ce}>
          <rect x="6" y="0" width="1" height="3" fill="#8a929c" />
          <rect x="5" y="-0" width="3" height="1" fill="#f24c4c" />
          <rect x="2" y="3" width="10" height="8" rx="1" fill="#8a929c" stroke="#4a515b" />
          <rect x="4" y="5" width="6" height="3" fill="#13161c" />
          <rect x="5" y="6" width="1" height="1" fill="#ff8a3c" />
          <rect x="8" y="6" width="1" height="1" fill="#ff8a3c" />
          <rect x="3" y="11" width="8" height="5" fill="#6e767f" stroke="#4a515b" />
        </svg>
      );
    case "draft":
      return (
        <svg width={44} height={32} viewBox="0 0 22 16" {...ce}>
          <rect x="2" y="2" width="14" height="9" fill="#e7e2d4" stroke="#8a867c" transform="skewX(-8)" />
          <rect x="5" y="4" width="8" height="1" fill="#4a6b84" />
          <rect x="5" y="6" width="6" height="1" fill="#4a6b84" />
          <rect x="1" y="11" width="20" height="3" fill="#7a5433" />
          <rect x="2" y="14" width="2" height="2" fill="#5f3d22" />
          <rect x="18" y="14" width="2" height="2" fill="#5f3d22" />
        </svg>
      );
  }
}

/* ── 상태 → 표정/말풍선 ─────────────────────────── */
function catSpeak(zone: ZoneId, light: TrafficLight, online: boolean): string {
  if (!online) return "쿨쿨... 💤";
  if (light === "red") return "막혔다냥... 도와줘🙋";
  if (zone === "done") return "다 했다냥! 야옹~🎉";
  if (light === "yellow") return "흠... 고민되냥🤔";
  switch (zone) {
    case "lobby": return "무슨 의뢰 할까냥?";
    case "analyze": return "의뢰 뜯어보는 중이다냥";
    case "prd": return "설계도 그리는 중이다냥";
    case "grillme": return "AI한테 혼나는 중이다냥🔥";
    case "coding": return "바이브 코딩 중이다냥⚡";
    case "submit": return "제출하러 간다냥🚀";
    default: return "일하는 중이다냥";
  }
}

const DOT: Record<string, string> = { green: "bg-emerald-400", yellow: "bg-amber-400", red: "bg-red-500" };

function Cat({
  student, zone, online, left, top, selected, onSelect,
}: {
  student: StudentDoc; zone: ZoneId; online: boolean; left: number; top: number; selected: boolean; onSelect: () => void;
}) {
  const pal = CATS[hashNum(student.studentId) % CATS.length];
  const light = student.trafficLight;
  const hv = hashNum(student.studentId);
  const roamDur = 5.5 + (hv % 40) / 10;
  const roamDelay = -(hv % 70) / 10;
  const showBubble = online && (selected || light === "red" || zone === "done");

  return (
    <button
      type="button"
      onClick={onSelect}
      className="absolute flex -translate-x-1/2 cursor-pointer flex-col items-center border-0 bg-transparent p-0"
      style={{ left: `${left}%`, top: `${top}%`, zIndex: Math.round(top) + 10, transition: "left 1.7s cubic-bezier(.45,0,.2,1), top 1.7s cubic-bezier(.45,0,.2,1)" }}
      title={student.name}
    >
      <div className={online ? "jp-office-roam" : ""} style={online ? { animationDuration: `${roamDur}s`, animationDelay: `${roamDelay}s` } : undefined}>
        <div className="flex flex-col items-center">
          {showBubble && (
            <div className="mb-1 max-w-[150px] whitespace-nowrap rounded-md border border-slate-600 bg-slate-900/95 px-2 py-0.5 text-[10px] font-bold text-slate-100 shadow-lg">
              {catSpeak(zone, light, online)}
            </div>
          )}
          <div className={`relative ${online ? "jp-office-idle" : ""} ${light === "red" && online ? "jp-cat-alert" : ""} ${selected ? "ring-2 ring-amber-300 rounded-full" : ""}`}>
            <div className={online ? "" : "opacity-50 grayscale"}>
              <PixelCat pal={pal} online={online} />
            </div>
            {student.helperModeOn && online && (
              <span className="absolute -left-2 top-3 rounded-full bg-emerald-500 px-1 text-[8px] font-bold text-white shadow">🤝</span>
            )}
            {!online && <span className="absolute -right-1 -top-1 text-[11px]">💤</span>}
          </div>
          {/* 바닥 그림자 */}
          <div className="h-1 w-6 -translate-y-0.5 rounded-[50%] bg-black/40 blur-[1px]" />
          {/* 이름표 */}
          <div className="mt-0.5 flex max-w-[84px] items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-slate-100 shadow">
            {light && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[light] ?? "bg-slate-400"}`} />}
            <span className="truncate">{student.name}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function RoomBox({ room, count }: { room: Room; count: number }) {
  return (
    <div
      className="absolute overflow-hidden rounded-md"
      style={{ left: `${room.x}%`, top: `${room.y}%`, width: `${room.w}%`, height: `${room.h}%` }}
    >
      {/* 바닥(체크 타일) */}
      <div
        className="absolute inset-0"
        style={{
          background: `repeating-conic-gradient(${room.floor} 0% 25%, ${room.floorAlt} 0% 50%) 0 0 / 22px 22px`,
          border: `3px solid ${room.wall}`,
          borderRadius: 6,
        }}
      />
      {/* 상단 벽 + 액자(창) */}
      <div className="absolute inset-x-0 top-0 flex h-[22%] items-center justify-center gap-2" style={{ background: room.wall }}>
        {[0, 1].map((i) => (
          <div key={i} className="h-3 w-5 rounded-[2px] border border-black/40" style={{ background: "#3b4a5e" }} />
        ))}
      </div>
      {/* 가구 */}
      {room.furniture.map((f, i) => (
        <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${f.left}%`, top: `${f.top}%` }}>
          <Furniture type={f.type} />
        </div>
      ))}
      {/* 방 이름표 */}
      <div className="absolute left-1 top-1 flex items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-black text-amber-200 shadow">
        <span>{room.emoji}</span>
        <span className="whitespace-nowrap">{room.label}</span>
        <span className="ml-0.5 rounded bg-white/10 px-1 text-[9px] text-slate-200">{count}</span>
      </div>
    </div>
  );
}

/* ── 업무 일지 이벤트 ─────────────────────────── */
interface LogEvent { id: string; t: number; dot: string; name: string; text: string }

export function OfficeView({ students, submissions }: { students: StudentDoc[]; submissions: SubmissionSummaryDoc[] }) {
  const [now, setNow] = useState(() => Date.now());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [log, setLog] = useState<LogEvent[]>([]);
  const prevZone = useRef<Record<string, ZoneId>>({});
  const prevLight = useRef<Record<string, TrafficLight>>({});
  const prevSubs = useRef<Set<string>>(new Set());
  const seeded = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const submittedIds = new Set(submissions.map((x) => x.studentId));
  const onlineSet = new Set(students.filter((s) => now - (s.lastActiveAt ?? 0) < OFFICE_ONLINE_WINDOW_MS).map((s) => s.studentId));

  // 업무 일지: 방 이동 / 도움 필요 / 제출 완료 감지(스냅샷 변화 기준)
  useEffect(() => {
    const events: LogEvent[] = [];
    const nowT = Date.now();
    for (const s of students) {
      const zone = zoneFor(s, submittedIds.has(s.studentId));
      const pz = prevZone.current[s.studentId];
      if (seeded.current && pz && pz !== zone) {
        events.push({ id: `${s.studentId}-z-${nowT}-${zone}`, t: nowT, dot: "bg-sky-400", name: s.name, text: `${ROOM_BY_ID[zone].label}(으)로 이동` });
      }
      const pl = prevLight.current[s.studentId];
      if (seeded.current && pl !== "red" && s.trafficLight === "red") {
        events.push({ id: `${s.studentId}-r-${nowT}`, t: nowT, dot: "bg-red-500", name: s.name, text: "도움이 필요해요 🙋" });
      }
      prevZone.current[s.studentId] = zone;
      prevLight.current[s.studentId] = s.trafficLight;
    }
    for (const sub of submissions) {
      if (seeded.current && !prevSubs.current.has(sub.studentId)) {
        events.push({ id: `${sub.studentId}-s-${nowT}`, t: nowT, dot: "bg-amber-400", name: sub.studentName, text: "산출물 제출 완료 🎉" });
      }
    }
    prevSubs.current = new Set(submissions.map((x) => x.studentId));
    seeded.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 스냅샷 변화를 업무 일지에 누적(외부 상태 동기화)
    if (events.length) setLog((prev) => [...events.reverse(), ...prev].slice(0, 50));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, submissions]);

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
  const doneCount = byZone.done.length;
  const redCount = students.filter((s) => s.trafficLight === "red" && onlineSet.has(s.studentId)).length;
  const selected = students.find((s) => s.studentId === selectedId) ?? null;

  function fmtTime(t: number) {
    const d = new Date(t);
    return `${d.getHours()}시 ${String(d.getMinutes()).padStart(2, "0")}분 ${String(d.getSeconds()).padStart(2, "0")}초`;
  }

  return (
    <div className="rounded-2xl bg-[#11131a] p-2 text-slate-100 shadow-xl">
      {/* 상단 상태바 */}
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-[#171a24] px-4 py-2 text-xs font-bold">
        <span className="flex items-center gap-1.5 text-sm font-black text-amber-300">😺 냥냥 오피스</span>
        <span className="text-emerald-400">🟢 실시간</span>
        <span className="text-slate-300">🐾 접속 <span className="text-white">{onlineCount}</span>/{students.length}</span>
        <span className="text-slate-300">✅ 완료 <span className="text-amber-300">{doneCount}</span></span>
        <span className="text-slate-300">🙋 도움 <span className={redCount ? "text-red-400" : "text-white"}>{redCount}</span></span>
        <span className="ml-auto flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" />순조</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />고민</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />도움</span>
        </span>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row">
        {/* 플로어 */}
        <div className="overflow-x-auto lg:flex-1">
          <div className="relative h-[520px] min-w-[640px] overflow-hidden rounded-xl sm:h-[580px] lg:h-[620px]" style={{ background: "#0c0e14" }}>
            {ROOMS.map((r) => (
              <RoomBox key={r.id} room={r} count={byZone[r.id].length} />
            ))}
            {students.map((s) => {
              const zone = zoneFor(s, submittedIds.has(s.studentId));
              const room = ROOM_BY_ID[zone];
              const list = byZone[zone];
              const idx = list.findIndex((x) => x.studentId === s.studentId);
              const { left, top } = slotIn(room, idx < 0 ? 0 : idx, list.length);
              return (
                <Cat
                  key={s.studentId}
                  student={s}
                  zone={zone}
                  online={onlineSet.has(s.studentId)}
                  left={left}
                  top={top}
                  selected={selectedId === s.studentId}
                  onSelect={() => setSelectedId((cur) => (cur === s.studentId ? null : s.studentId))}
                />
              );
            })}
            {students.length === 0 && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">아직 출근한 고양이가 없어요. 참가자가 이름으로 입장하면 나타나요 🐾</p>
            )}
          </div>
        </div>

        {/* 우측 패널 */}
        <aside className="flex w-full shrink-0 flex-col gap-2 lg:w-72">
          {/* 선택한 고양이 */}
          <div className="rounded-xl bg-[#171a24] p-3">
            <h3 className="mb-2 text-xs font-black text-amber-300">🔎 선택한 고양이</h3>
            {!selected ? (
              <p className="text-xs text-slate-500">고양이를 클릭해 보세요.</p>
            ) : (
              (() => {
                const zone = zoneFor(selected, submittedIds.has(selected.studentId));
                const online = onlineSet.has(selected.studentId);
                const pal = CATS[hashNum(selected.studentId) % CATS.length];
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="rounded bg-black/30 p-1"><PixelCat pal={pal} /></div>
                      <div>
                        <p className="text-sm font-black">{selected.name}</p>
                        <p className="text-[11px] text-slate-400">{online ? "근무 중" : "자리 비움 💤"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      <div className="rounded bg-black/20 px-2 py-1"><span className="text-slate-500">현재 방</span><br /><span className="font-bold">{ROOM_BY_ID[zone].label}</span></div>
                      <div className="rounded bg-black/20 px-2 py-1"><span className="text-slate-500">단계</span><br /><span className="font-bold">{ZONE_SHORT[zone]}</span></div>
                      <div className="rounded bg-black/20 px-2 py-1"><span className="text-slate-500">신호등</span><br /><span className="font-bold">{selected.trafficLight === "red" ? "🔴 도움 필요" : selected.trafficLight === "yellow" ? "🟡 고민 중" : selected.trafficLight === "green" ? "🟢 순조" : "—"}</span></div>
                      <div className="rounded bg-black/20 px-2 py-1"><span className="text-slate-500">스탬프</span><br /><span className="font-bold">{selected.stamps?.length ?? 0}개</span></div>
                    </div>
                    <p className="rounded bg-black/20 px-2 py-1 text-[11px] italic text-slate-300">“{catSpeak(zone, selected.trafficLight, online)}”</p>
                  </div>
                );
              })()
            )}
          </div>

          {/* 업무 일지 */}
          <div className="flex-1 rounded-xl bg-[#171a24] p-3">
            <h3 className="mb-2 text-xs font-black text-amber-300">📋 업무 일지</h3>
            {log.length === 0 ? (
              <p className="text-xs text-slate-500">활동이 생기면 여기에 기록돼요.</p>
            ) : (
              <ul className="max-h-[320px] space-y-1 overflow-y-auto pr-1 text-[11px] lg:max-h-[380px]">
                {log.map((e) => (
                  <li key={e.id} className="flex items-start gap-1.5">
                    <span className="shrink-0 text-slate-500">{fmtTime(e.t)}</span>
                    <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${e.dot}`} />
                    <span className="text-slate-200"><span className="font-bold">{e.name}</span> {e.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
