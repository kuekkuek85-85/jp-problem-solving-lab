"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDocFromServer, onSnapshot, orderBy, query, where, type DocumentReference, type DocumentSnapshot } from "firebase/firestore";
import { db } from "./firebase/client";
import {
  helpRequestsPath,
  peerReviewPath,
  presentationPath,
  projectPath,
  projectsPath,
  reactionsPath,
  reflectionPath,
  reflectionsPath,
  requestsPath,
  sessionPath,
  studentPath,
  studentsPath,
  submissionsPath,
} from "./paths";
import type {
  HelpRequestDoc,
  PresentationState,
  ProjectDoc,
  ReactionDoc,
  ReflectionDoc,
  RequestDoc,
  SessionDoc,
  StudentDoc,
  SubmissionSummaryDoc,
} from "./types";

// 실시간 구독 + 안전망: 오래 열어둔 탭에서 realtime 연결이 끊기거나 백그라운드 스로틀로
// 변경(발표 시작·해결 보고회 전환 등)을 놓치는 경우를 대비해, 탭 포커스·온라인 복귀 시 서버에서 다시 읽고
// 탭이 보이는 동안 8초마다 가볍게 재확인한다. 내용이 실제로 바뀐 경우에만 반영한다.
function listenDocResilient(ref: DocumentReference, onData: (snap: DocumentSnapshot) => void): () => void {
  let last = "";
  const apply = (snap: DocumentSnapshot) => {
    const key = snap.exists() ? JSON.stringify(snap.data()) : "__none__";
    if (key === last) return;
    last = key;
    onData(snap);
  };
  const unsub = onSnapshot(ref, apply);
  const refetch = () => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    getDocFromServer(ref).then(apply).catch(() => {});
  };
  const onVisible = () => {
    if (document.visibilityState === "visible") refetch();
  };
  const timer = setInterval(refetch, 8000);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", refetch);
  window.addEventListener("focus", refetch);
  return () => {
    unsub();
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("online", refetch);
    window.removeEventListener("focus", refetch);
  };
}

export function useSession(sessionCode: string | null) {
  const [session, setSession] = useState<SessionDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionCode) return;
    return listenDocResilient(doc(db, sessionPath(sessionCode)), (snap) => {
      setSession(snap.exists() ? (snap.data() as SessionDoc) : null);
      setLoading(false);
    });
  }, [sessionCode]);

  return { session, loading: sessionCode ? loading : false };
}

export function useStudent(sessionCode: string | null, studentId: string | null) {
  const [student, setStudent] = useState<StudentDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionCode || !studentId) return;
    const unsub = onSnapshot(doc(db, studentPath(sessionCode, studentId)), (snap) => {
      setStudent(snap.exists() ? (snap.data() as StudentDoc) : null);
      setLoading(false);
    });
    return unsub;
  }, [sessionCode, studentId]);

  return { student, loading: sessionCode && studentId ? loading : false };
}

export function useStudents(sessionCode: string | null) {
  const [students, setStudents] = useState<StudentDoc[]>([]);

  useEffect(() => {
    if (!sessionCode) return;
    const unsub = onSnapshot(collection(db, studentsPath(sessionCode)), (snap) => {
      setStudents(snap.docs.map((d) => d.data() as StudentDoc));
    });
    return unsub;
  }, [sessionCode]);

  return students;
}

export function useRequests(sessionCode: string | null) {
  const [requests, setRequests] = useState<RequestDoc[]>([]);

  useEffect(() => {
    if (!sessionCode) return;
    const unsub = onSnapshot(collection(db, requestsPath(sessionCode)), (snap) => {
      setRequests(snap.docs.map((d) => d.data() as RequestDoc));
    });
    return unsub;
  }, [sessionCode]);

  return requests;
}

export function useProject(sessionCode: string | null, studentId: string | null, projectId: string | null) {
  const [project, setProject] = useState<ProjectDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionCode || !studentId || !projectId) return;
    const unsub = onSnapshot(doc(db, projectPath(sessionCode, studentId, projectId)), (snap) => {
      setProject(snap.exists() ? (snap.data() as ProjectDoc) : null);
      setLoading(false);
    });
    return unsub;
  }, [sessionCode, studentId, projectId]);

  return { project: sessionCode && studentId && projectId ? project : null, loading: sessionCode && studentId && projectId ? loading : false };
}

export function useMyProjects(sessionCode: string | null, studentId: string | null) {
  const [projects, setProjects] = useState<ProjectDoc[]>([]);

  useEffect(() => {
    if (!sessionCode || !studentId) return;
    const q = query(collection(db, projectsPath(sessionCode, studentId)), orderBy("startedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setProjects(snap.docs.map((d) => d.data() as ProjectDoc));
    });
    return unsub;
  }, [sessionCode, studentId]);

  return projects;
}

export function useSubmissions(sessionCode: string | null) {
  const [submissions, setSubmissions] = useState<SubmissionSummaryDoc[]>([]);

  useEffect(() => {
    if (!sessionCode) return;
    const unsub = onSnapshot(collection(db, submissionsPath(sessionCode)), (snap) => {
      setSubmissions(snap.docs.map((d) => d.data() as SubmissionSummaryDoc));
    });
    return unsub;
  }, [sessionCode]);

  return submissions;
}

export function useReflection(sessionCode: string | null, studentId: string | null) {
  const [reflection, setReflection] = useState<ReflectionDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionCode || !studentId) return;
    const unsub = onSnapshot(doc(db, reflectionPath(sessionCode, studentId)), (snap) => {
      setReflection(snap.exists() ? (snap.data() as ReflectionDoc) : null);
      setLoading(false);
    });
    return unsub;
  }, [sessionCode, studentId]);

  return { reflection, loading: sessionCode && studentId ? loading : false };
}

export function useReflections(sessionCode: string | null) {
  const [reflections, setReflections] = useState<ReflectionDoc[]>([]);

  useEffect(() => {
    if (!sessionCode) return;
    const unsub = onSnapshot(collection(db, reflectionsPath(sessionCode)), (snap) => {
      setReflections(snap.docs.map((d) => d.data() as ReflectionDoc));
    });
    return unsub;
  }, [sessionCode]);

  return reflections;
}

export function usePresentation(sessionCode: string | null) {
  const [state, setState] = useState<PresentationState | null>(null);

  useEffect(() => {
    if (!sessionCode) return;
    return listenDocResilient(doc(db, presentationPath(sessionCode)), (snap) => {
      setState(snap.exists() ? (snap.data() as PresentationState) : null);
    });
  }, [sessionCode]);

  return state;
}

export interface PeerReviewState {
  assignments: Record<string, string>; // reviewerStudentId -> 검토 대상 projectId
  createdAt: number;
}

export function usePeerReview(sessionCode: string | null) {
  const [state, setState] = useState<PeerReviewState | null>(null);

  useEffect(() => {
    if (!sessionCode) return;
    const unsub = onSnapshot(doc(db, peerReviewPath(sessionCode)), (snap) => {
      setState(snap.exists() ? (snap.data() as PeerReviewState) : null);
    });
    return unsub;
  }, [sessionCode]);

  return state;
}

export function useReactions(sessionCode: string | null, targetProjectId: string | null) {
  const [reactions, setReactions] = useState<ReactionDoc[]>([]);

  useEffect(() => {
    if (!sessionCode || !targetProjectId) return;
    const q = query(collection(db, reactionsPath(sessionCode)), where("targetProjectId", "==", targetProjectId));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => d.data() as ReactionDoc);
      list.sort((a, b) => a.createdAt - b.createdAt);
      setReactions(list);
    });
    return unsub;
  }, [sessionCode, targetProjectId]);

  return sessionCode && targetProjectId ? reactions : [];
}

export function useHelpRequests(sessionCode: string | null) {
  const [helpRequests, setHelpRequests] = useState<HelpRequestDoc[]>([]);

  useEffect(() => {
    if (!sessionCode) return;
    const unsub = onSnapshot(collection(db, helpRequestsPath(sessionCode)), (snap) => {
      setHelpRequests(snap.docs.map((d) => d.data() as HelpRequestDoc));
    });
    return unsub;
  }, [sessionCode]);

  return helpRequests;
}
