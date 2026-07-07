"use client";

// 학생 재접속 복구용 로컬 저장 정보 (Firestore가 진짜 데이터, 이건 편의용 캐시일 뿐)
export interface StudentAuthInfo {
  studentId: string;
  name: string;
}

const STUDENT_KEY = "jp-lab-student";
const TEACHER_KEY = "jp-lab-teacher-pin";

export function saveStudentAuth(info: StudentAuthInfo) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STUDENT_KEY, JSON.stringify(info));
}

export function loadStudentAuth(): StudentAuthInfo | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STUDENT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StudentAuthInfo;
  } catch {
    return null;
  }
}

export function clearStudentAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STUDENT_KEY);
}

export function saveTeacherPin(pin: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TEACHER_KEY, pin);
}

export function loadTeacherPin(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TEACHER_KEY);
}
