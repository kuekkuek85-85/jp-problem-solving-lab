"use client";

import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 font-bold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    primary: "bg-rose-500 text-white hover:bg-rose-600 shadow-sm shadow-rose-200",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-slate-600 hover:bg-slate-100",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white border border-slate-200 shadow-sm p-5 ${className}`}>{children}</div>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none ${props.className ?? ""}`}
    />
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <div className="font-bold text-sm text-slate-800">{label}</div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
      {children}
    </label>
  );
}

export function LevelBadge({ level }: { level: "seedling" | "growing" | "sharing" }) {
  const map = {
    seedling: { emoji: "🌱", name: "새싹", cls: "bg-lime-100 text-lime-800" },
    growing: { emoji: "🌿", name: "성장", cls: "bg-emerald-100 text-emerald-800" },
    sharing: { emoji: "🌳", name: "나눔", cls: "bg-teal-100 text-teal-800" },
  }[level];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${map.cls}`}>
      {map.emoji} {map.name}
    </span>
  );
}

export function TrafficDot({ light }: { light: "red" | "yellow" | "green" | null }) {
  const cls =
    light === "red"
      ? "bg-red-500"
      : light === "yellow"
      ? "bg-yellow-400"
      : light === "green"
      ? "bg-emerald-500"
      : "bg-slate-300";
  return <span className={`inline-block h-3 w-3 rounded-full ${cls}`} />;
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-200 border-t-rose-500" />
    </div>
  );
}
