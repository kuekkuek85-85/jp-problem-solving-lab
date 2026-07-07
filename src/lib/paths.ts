// Firestore 경로 헬퍼 — 클라이언트/서버(Admin) 양쪽에서 동일한 경로 규칙 사용

export const sessionPath = (sessionCode: string) => `sessions/${sessionCode}`;

export const requestsPath = (sessionCode: string) => `sessions/${sessionCode}/requests`;
export const requestPath = (sessionCode: string, requestId: string) =>
  `sessions/${sessionCode}/requests/${requestId}`;

export const studentsPath = (sessionCode: string) => `sessions/${sessionCode}/students`;
export const studentPath = (sessionCode: string, studentId: string) =>
  `sessions/${sessionCode}/students/${studentId}`;

export const projectsPath = (sessionCode: string, studentId: string) =>
  `sessions/${sessionCode}/students/${studentId}/projects`;
export const projectPath = (sessionCode: string, studentId: string, projectId: string) =>
  `sessions/${sessionCode}/students/${studentId}/projects/${projectId}`;

export const helpRequestsPath = (sessionCode: string) => `sessions/${sessionCode}/helpRequests`;
export const helpRequestPath = (sessionCode: string, helpId: string) =>
  `sessions/${sessionCode}/helpRequests/${helpId}`;

export const submissionsPath = (sessionCode: string) => `sessions/${sessionCode}/submissions`;
export const submissionPath = (sessionCode: string, projectId: string) =>
  `sessions/${sessionCode}/submissions/${projectId}`;

export const reactionsPath = (sessionCode: string) => `sessions/${sessionCode}/reactions`;

export const reflectionsPath = (sessionCode: string) => `sessions/${sessionCode}/reflections`;
export const reflectionPath = (sessionCode: string, studentId: string) =>
  `sessions/${sessionCode}/reflections/${studentId}`;
