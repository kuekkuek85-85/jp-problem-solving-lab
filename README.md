# 장평 문제해결연구소 (Jangpyeong Problem-Solving Lab)

장평중학교 하트이로봇 동아리 바이브 코딩 수업용 실시간 웹 플랫폼입니다. Next.js(App Router) + Tailwind + Firebase(Firestore) + Gemini API로 구성되어 있습니다.

## 스택

- **프론트엔드**: Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- **DB/실시간**: Firebase Firestore (`onSnapshot`), Firebase Storage
- **AI**: Gemini API — `/api/*` 서버 라우트에서만 호출(키 보호)
- **배포**: Vercel

## 시작하기

### 1. 환경 변수 설정

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_FIREBASE_*`: Firebase 콘솔 > 프로젝트 설정 > 일반 > 내 앱(웹)에서 발급
- `FIREBASE_ADMIN_*`: Firebase 콘솔 > 프로젝트 설정 > 서비스 계정 > 새 비공개 키 생성
  - `FIREBASE_ADMIN_PRIVATE_KEY`는 줄바꿈을 `\n`으로 이스케이프해서 한 줄로 넣어주세요.
- `GEMINI_API_KEY`: [Google AI Studio](https://aistudio.google.com/)에서 발급
- `TEACHER_PIN`: 교사(연구소장) 대시보드 접근 PIN (원하는 숫자로 설정)

### 2. Firestore 보안 규칙 배포

```bash
npm install -g firebase-tools   # 최초 1회
firebase login
firebase deploy --only firestore:rules,storage
```

### 3. 의존성 설치 및 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속.

세션 코드 없이 단일 고정 연구소(`sessions/main`)로 운영합니다.

- 교사: 랜딩 페이지 "연구소장" 탭 → PIN 입력 → 최초 입장 시 연구소가 자동 개소되고 공식 의뢰 15건이 등록됩니다(재입장 시 기존 데이터 그대로 이어감).
- 학생: "연구원(학생)" 탭 → 이름 + 5자리 학번만 입력하면 입장(연구소가 열려 있어야 함).

## 프로젝트 구조

```
src/
  app/
    page.tsx                     # 랜딩(학생: 이름+학번 / 교사: PIN)
    student/                     # 연구원(학생) 메인 — 단계 상태 머신
    teacher/                     # 연구소장(교사) 대시보드
    gallery/                     # 참관자용 읽기 전용 해결 보고회
    api/
      teacher/*                  # 교사 전용 쓰기(Firebase Admin) — session/stage/lecture/requests/close-lab/auth
      student/propose-request    # 학생 의뢰 등록 요청
      grillme, prd-hint,
      deep-dive, slides-gen      # Gemini API 서버 라우트
  components/
    student/                     # 단계별 학생 화면 컴포넌트
    teacher/                     # 대시보드 패널 컴포넌트
    gallery/                     # 해결 보고회 공용 컴포넌트
    ui.tsx                       # 공용 UI 프리미티브
  lib/
    types.ts                     # Firestore 데이터 모델 타입
    firebase/{client,admin}.ts   # Firebase 클라이언트/Admin 초기화
    hooks.ts                     # onSnapshot 기반 실시간 훅
    constants.ts                 # 진단 문항, 윤리 서약, PRD 항목, 시드 의뢰 등
firestore.rules                  # 세션 범위 접근 제어
storage.rules
```

## 데이터 모델 요약

고정 연구소 문서 `sessions/main`(상수 `LAB_ID`) 아래에 `requests`(의뢰), `students`(연구원, 하위에 `projects`), `helpRequests`(Help Me 큐), `submissions`(해결 보고회용 평면 요약), `reactions`, `reflections` 서브컬렉션이 있습니다. 자세한 필드는 `src/lib/types.ts` 참고.

## 권한 모델

- 세션/의뢰 생성·삭제, 단계 전환, 브리핑 슬라이드 갱신, 동료 랜덤 매칭, 연구소 마감은 `TEACHER_PIN`을 검증하는 `/api/teacher/*` 서버 라우트(Firebase Admin)를 통해서만 수행됩니다.
- 학생은 자신의 `students/{studentId}` 문서와 그 하위 `projects`만 클라이언트에서 직접 씁니다(Firestore 규칙 참고).
- Gemini API 키는 서버 환경변수로만 보관되며, AI 요청 본문에 학생 실명·학번을 포함하지 않습니다.

## 구현 범위

PRD의 **P0(필수)** 범위를 모두 구현했고, **P1** 중 다음 항목도 포함했습니다: 학생 의뢰 등록 요청·교사 승인, 브리핑 슬라이드 동기화·편집, 타이머, 발표 슬라이드 자동 생성(`/api/slides-gen`), 심화 도전(`/api/deep-dive`), 의뢰별 그룹핑 보기, 참관자 읽기 전용 링크.

다음 P1/P2 항목은 이번 범위에 포함하지 않았습니다: 또래 도우미 "도우미 모드"(동료 현황판 + 도움 확인 뱃지) 수락 플로우, 발표 모드(특정 해결안 프로젝터 강조), 손그림 사진 업로드, 알림음, CSV 내보내기, 커스텀 도메인, 의뢰 상태 3단계(미해결/연구중/해결완료) + 교사 채택 전환.

## 배포(Vercel)

1. GitHub 저장소를 Vercel에 연결
2. 위 환경 변수를 Vercel 프로젝트 설정에 등록
3. `firebase deploy --only firestore:rules,storage`로 규칙 배포
4. Vercel이 자동으로 `next build` 실행 후 배포
