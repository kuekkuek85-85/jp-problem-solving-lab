"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "./firebase/client";
import {
  helpRequestsPath,
  projectPath,
  projectsPath,
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
  ProjectDoc,
  ReflectionDoc,
  RequestDoc,
  SessionDoc,
  StudentDoc,
  SubmissionSummaryDoc,
} from "./types";

export function useSession(sessionCode: string | null) {
  const [session, setSession] = useState<SessionDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionCode) return;
    const unsub = onSnapshot(doc(db, sessionPath(sessionCode)), (snap) => {
      setSession(snap.exists() ? (snap.data() as SessionDoc) : null);
      setLoading(false);
    });
    return unsub;
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
