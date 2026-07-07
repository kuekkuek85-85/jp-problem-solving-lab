"use client";

import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase/client";
import { projectPath, studentPath } from "./paths";
import type { Badge, ProjectStep } from "./types";

// 스탬프 획득 + 프로젝트 다음 단계로 전환(공통 로직)
export async function advanceProject(params: {
  sessionCode: string;
  studentId: string;
  projectId: string;
  stamp: number;
  nextStep: ProjectStep;
  projectFields?: Record<string, unknown>;
}) {
  const { sessionCode, studentId, projectId, stamp, nextStep, projectFields } = params;

  await updateDoc(doc(db, projectPath(sessionCode, studentId, projectId)), {
    currentStep: nextStep,
    ...(projectFields ?? {}),
    ...(nextStep === "done" ? { completedAt: Date.now() } : {}),
  });

  await updateDoc(doc(db, studentPath(sessionCode, studentId)), {
    stamps: arrayUnion(stamp),
    lastActiveAt: Date.now(),
  });
}

export async function awardBadge(sessionCode: string, studentId: string, badge: Badge) {
  await updateDoc(doc(db, studentPath(sessionCode, studentId)), {
    badges: arrayUnion(badge),
  });
}
