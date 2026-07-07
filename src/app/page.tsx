"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { sessionPath, studentPath } from "@/lib/paths";
import { emptyStudent } from "@/lib/factories";
import { LAB_ID } from "@/lib/constants";
import { saveStudentAuth, saveTeacherPin } from "@/lib/local-auth";
import { Button, Card, Input } from "@/components/ui";

export default function LandingPage() {
  const [tab, setTab] = useState<"student" | "teacher">("student");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <div className="text-4xl mb-2">🔬🤖</div>
        <h1 className="text-2xl font-black text-slate-900">장평 문제해결연구소</h1>
        <p className="mt-1 text-sm text-slate-500">하트이로봇 동아리 바이브 코딩 수업 플랫폼</p>
      </div>

      <div className="mb-4 inline-flex rounded-full bg-slate-200 p-1 text-sm font-bold">
        <button
          onClick={() => setTab("student")}
          className={`rounded-full px-5 py-2 transition ${tab === "student" ? "bg-white text-rose-600 shadow" : "text-slate-500"}`}
        >
          연구원(학생)
        </button>
        <button
          onClick={() => setTab("teacher")}
          className={`rounded-full px-5 py-2 transition ${tab === "teacher" ? "bg-white text-rose-600 shadow" : "text-slate-500"}`}
        >
          연구소장(교사)
        </button>
      </div>

      <Card className="w-full max-w-sm">{tab === "student" ? <StudentLogin /> : <TeacherLogin />}</Card>
    </main>
  );
}

function StudentLogin() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [studentNo, setStudentNo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const no = studentNo.trim();

    if (!trimmedName) {
      setError("이름을 입력해주세요.");
      return;
    }
    if (no.length !== 5 || !/^\d{5}$/.test(no)) {
      setError("학번 5자리(예: 20301)를 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const sessionSnap = await getDoc(doc(db, sessionPath(LAB_ID)));
      if (!sessionSnap.exists()) {
        setError("아직 연구소가 열리지 않았어요. 선생님께 확인해주세요.");
        setLoading(false);
        return;
      }

      const studentRef = doc(db, studentPath(LAB_ID, no));
      const studentSnap = await getDoc(studentRef);
      const now = Date.now();
      if (studentSnap.exists()) {
        await updateDoc(studentRef, { lastActiveAt: now, name: trimmedName });
      } else {
        await setDoc(studentRef, emptyStudent({ studentId: no, name: trimmedName, studentNo: no, now }));
      }

      saveStudentAuth({ studentId: no, name: trimmedName });
      router.push("/student");
    } catch (err) {
      console.error(err);
      setError("입장 중 문제가 발생했어요. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-bold text-slate-800">학번 (5자리)</label>
        <Input
          value={studentNo}
          onChange={(e) => setStudentNo(e.target.value.replace(/\D/g, "").slice(0, 5))}
          placeholder="예: 20301 (2학년 3반 1번)"
          inputMode="numeric"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-bold text-slate-800">이름</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
      </div>
      {error && <p className="text-sm font-bold text-red-600">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "입장하는 중..." : "연구소 입장하기"}
      </Button>
    </form>
  );
}

function TeacherLogin() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!pin) {
      setError("PIN을 입력해주세요.");
      return;
    }
    setLoading(true);
    try {
      // 연구소가 없으면 개소, 있으면 그대로 입장(멱등). PIN 검증도 이 라우트에서 수행.
      const res = await fetch("/api/teacher/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "입장에 실패했어요.");
        setLoading(false);
        return;
      }
      saveTeacherPin(pin);
      router.push("/teacher");
    } catch (err) {
      console.error(err);
      setError("입장 중 문제가 발생했어요.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-500">
        처음 입장하면 연구소가 자동으로 열리고 공식 의뢰가 등록돼요. 다시 입장하면 이어서 진행돼요.
      </p>
      <div>
        <label className="mb-1 block text-sm font-bold text-slate-800">PIN</label>
        <Input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="교사 PIN" autoFocus />
      </div>
      {error && <p className="text-sm font-bold text-red-600">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "입장 중..." : "연구소장으로 입장"}
      </Button>
    </form>
  );
}
