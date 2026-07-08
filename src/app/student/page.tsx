"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { loadStudentAuth } from "@/lib/local-auth";
import { LAB_ID } from "@/lib/constants";
import { useHelpRequests, useMyProjects, usePresentation, useProject, useRequests, useSession, useStudent, useStudents } from "@/lib/hooks";
import type { Stage } from "@/lib/types";
import { Spinner } from "@/components/ui";
import { StageHeader } from "@/components/student/StageHeader";
import { HelpWidget } from "@/components/student/HelpWidget";
import { Onboarding } from "@/components/student/Onboarding";
import { LectureOverlay } from "@/components/student/LectureOverlay";
import { PresentationOverlay } from "@/components/PresentationOverlay";
import { RequestBoard } from "@/components/student/RequestBoard";
import { AnalyzeStage } from "@/components/student/AnalyzeStage";
import { PrdStage } from "@/components/student/PrdStage";
import { GrillmeStage } from "@/components/student/GrillmeStage";
import { CodingStage } from "@/components/student/CodingStage";
import { SubmitStage } from "@/components/student/SubmitStage";
import { ClosingStage } from "@/components/student/ClosingStage";
import { SubmissionGallery } from "@/components/gallery/SubmissionGallery";

const LOOP_STAGES: Stage[] = ["analyze", "prd", "grillme", "coding", "submit"];

export default function StudentPage() {
  const sessionCode = LAB_ID;
  const router = useRouter();
  const auth = useMemo(() => loadStudentAuth(), []);

  useEffect(() => {
    if (!auth) {
      router.replace("/");
    }
  }, [auth, router]);

  const studentId = auth?.studentId ?? null;

  const { session, loading: sessionLoading } = useSession(sessionCode);
  const { student, loading: studentLoading } = useStudent(sessionCode, studentId);
  const students = useStudents(sessionCode);
  const requests = useRequests(sessionCode);
  const myProjects = useMyProjects(sessionCode, studentId);
  const { project } = useProject(sessionCode, studentId, student?.activeProjectId ?? null);
  const helpRequests = useHelpRequests(sessionCode);
  const presentation = usePresentation(sessionCode);

  if (!studentId) return null;
  if (sessionLoading || studentLoading || !session || !student) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <Spinner />
      </main>
    );
  }

  const solverNameLookup = Object.fromEntries(students.map((s) => [s.studentId, s.name]));
  const myOpenHelp = helpRequests.find((h) => h.requesterId === studentId && h.status !== "resolved");

  // 1) 윤리 서약 전에는 항상 온보딩(서약을 마치면 바로 활동에 들어간다)
  if (!student.ethicsPledge.checkedAll) {
    return <Onboarding sessionCode={sessionCode} student={student} />;
  }

  // 2) 교사가 브리핑을 켜면 전원 강제 오버레이(교사가 끄면 학생도 활동으로 복귀)
  if (session.lectureMode) {
    return <LectureOverlay session={session} />;
  }

  // 3) 누군가 발표를 시작하면 전원 발표 화면으로 동기화(발표자/교사가 종료하면 복귀)
  if (presentation?.activeSubmissionId) {
    return (
      <PresentationOverlay
        sessionCode={sessionCode}
        presentation={presentation}
        meStudentId={studentId}
        meName={student.name}
        canControl={false}
      />
    );
  }

  // 4) 교사가 해결 보고회/마감을 선언하면 개인 진행과 무관하게 강제 전환
  if (session.currentStage === "gallery") {
    return (
      <div>
        <StageHeader student={student} stage="gallery" />
        <SubmissionGallery sessionCode={sessionCode} canReact fromName={student.name} meStudentId={studentId} />
      </div>
    );
  }
  if (session.currentStage === "closing") {
    return <ClosingStage sessionCode={sessionCode} student={student} />;
  }

  // 5) 그 외(board~submit)는 학생 개인 루프
  if (!student.activeProjectId || !project) {
    return (
      <div>
        <StageHeader student={student} stage="board" />
        <RequestBoard
          sessionCode={sessionCode}
          student={student}
          requests={requests}
          solverNameLookup={solverNameLookup}
          myProjects={myProjects}
        />
      </div>
    );
  }

  // 제출 완료(done) 직후에도 activeProjectId가 정리되기 전까지는 제출 화면(완료 상태)을 유지한다.
  const stage = (project.currentStep === "done" ? "submit" : project.currentStep) as Stage;

  return (
    <div>
      <StageHeader student={student} stage={stage} requestTitle={project.requestTitle} />

      {stage === "analyze" && <AnalyzeStage sessionCode={sessionCode} student={student} project={project} />}
      {stage === "prd" && <PrdStage sessionCode={sessionCode} student={student} project={project} />}
      {stage === "grillme" && <GrillmeStage sessionCode={sessionCode} student={student} project={project} />}
      {stage === "coding" && <CodingStage sessionCode={sessionCode} student={student} project={project} />}
      {stage === "submit" && <SubmitStage sessionCode={sessionCode} student={student} project={project} />}

      {LOOP_STAGES.includes(stage) && (
        <HelpWidget
          sessionCode={sessionCode}
          studentId={studentId}
          studentName={student.name}
          stage={stage}
          trafficLight={student.trafficLight}
          existingOpenHelpId={myOpenHelp?.id ?? null}
        />
      )}
    </div>
  );
}
