# AGENTS.md — slow days 에이전트 작업 지침

이 저장소에서 코드를 작성·수정하는 AI 에이전트가 따르는 규칙.

## 1. 프로젝트 요약

1. 서비스: slow days 라이프스타일·에세이 블로그 + 관리자용 AI 발행 도우미
2. 기획 문서: [docs/PRD.md](docs/PRD.md) · 의사결정: [docs/decision-log.md](docs/decision-log.md) · 작업 기록: [docs/work-log.md](docs/work-log.md)
3. 배포: Vercel(정적 파일 + `api/` 서버 함수), 기존 GitHub Pages(Actions 자동 생성)는 병행 유지

## 2. 폴더 구조

| 위치 | 역할 |
|---|---|
| `index.html`, `list/`, `post/`, `404.html` | 독자 화면 (GA4 측정 대상) |
| `admin/`, `write/`, `admin/stats/` | 관리자 화면 (GA4 측정 제외) |
| `assets/fb.js` | Firebase 로그인·Firestore 공통 함수 |
| `assets/ga.js` | GA4 측정 ID·이벤트 전송 (측정 ID는 이 파일 한 곳에서만 관리) |
| `assets/ai.js` | 관리자 화면 → 서버 함수 호출, UTM 링크 생성 |
| `api/` | Vercel 서버 함수 (`_lib/`는 공통 모듈) |
| `scripts/build-pages.mjs` | 글별 정적 페이지·썸네일·sitemap 생성 |
| `tests/` | 단위 테스트 (`npm test`) |
| `docs/` | PRD·의사결정 로그·작업 로그·테스트 보고서 |

## 3. 반드시 지킬 원칙

1. 비밀 값(Gemini API 키, GA 서비스 계정 키)은 코드·저장소에 넣지 않는다. Vercel 환경 변수에만 저장한다.
2. 모든 `api/` 함수는 Firebase 로그인 토큰을 확인하고, 허용된 관리자 이메일만 응답한다.
3. AI·GA 호출이 실패해도 글쓰기·발행 기능은 정상 동작해야 한다. 실패 시 안내 문구와 [다시 시도]를 보여주고 입력값은 지우지 않는다.
4. AI 결과는 자동 저장하지 않는다. 관리자가 항목별 [적용]을 눌러야 입력란에 들어간다.
5. 관리자 화면에는 GA 측정 코드를 넣지 않는다. 관리자 행동 기록은 Firestore 글 문서의 `aiAssist` 필드에 남긴다.
6. 기존 GA 이벤트 이름은 바꾸지 않는다. UTM 규칙: instagram/social/profile·story_YYMMDD, copy_link/share.
7. 코드는 단순하게 유지한다. 외부 라이브러리 추가는 의사결정 로그에 이유를 남긴 뒤에만 한다.

## 4. 환경 변수 (Vercel)

| 이름 | 내용 |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio에서 발급한 Gemini API 키 |
| `GEMINI_MODEL` | (선택) 사용할 모델 ID. 비우면 코드 기본값 |
| `GA_PROPERTY_ID` | GA4 속성 ID (숫자) |
| `GA_SERVICE_ACCOUNT` | GA 읽기 권한 서비스 계정 키 JSON 전체 |
| `ADMIN_EMAILS` | 관리자 이메일 (쉼표로 여러 개) |

## 5. 작업 순서와 커밋 규칙

1. 작업 시작 전 PRD의 기능 ID(F1~F5)를 확인한다.
2. 기능 하나 = 커밋 하나 이상. 커밋 제목 형식: `유형: 무엇을 했는지 — 왜/결과`
   - 유형: `feat`(기능) · `fix`(오류 수정) · `docs`(문서) · `test`(테스트) · `chore`(설정)
   - 본문에는 바뀐 파일과 확인한 내용을 `-` 목록으로 적는다.
3. 작업이 끝나면 `docs/work-log.md`에 성공·실패와 원인·해결을 기록한다.
4. 방향을 바꾸는 결정은 `docs/decision-log.md`에 D-번호로 추가한다.
5. 수정 후에는 영향을 받는 화면(글쓰기·관리자·독자 화면)을 모두 다시 확인한다.

---
<sub>2.prov.ii · hi.prov.ii@gmail.com</sub>
