# slow days — AI 발행 도우미

라이프스타일·에세이 블로그 **slow days**에 관리자용 AI 기능을 붙여, 글 발행 후속 작업(소개문·분류·태그·인스타 캡션·UTM 링크)과 성과 확인(방문 통계)을 자동화한 AIPM 부트캠프 미니 프로젝트.

## 1. 링크

| 구분 | 주소 |
|---|---|
| 배포 블로그 (Vercel) | https://slow-days-blog.vercel.app |
| 관리자 · 글쓰기 · 방문 통계 | [/admin/](https://slow-days-blog.vercel.app/admin/) · [/write/](https://slow-days-blog.vercel.app/write/) · [/admin/stats/](https://slow-days-blog.vercel.app/admin/stats/) (로그인 필요) |
| 기존 배포 (GitHub Pages) | https://aaaxxxhhh.github.io/1117-blog-design/ |

## 2. 제출 문서

| 문서 | 내용 |
|---|---|
| [docs/PRD.md](docs/PRD.md) | 기획서 — 문제 정의, 기능 범위(F1~F5), 목표 지표 |
| [docs/test-report.md](docs/test-report.md) | 테스트 보고서 — 유저플로우 화면, 기능별 단위 테스트 |
| [docs/decision-log.md](docs/decision-log.md) | 의사결정 로그 (D-001~) |
| [docs/work-log.md](docs/work-log.md) | 작업 로그 — 성공·실패와 원인·해결 |
| [AGENTS.md](AGENTS.md) | 에이전트용 작업 지침 |

## 3. 기능

| ID · 기능 | 위치 | 설명 |
|---|---|---|
| F1 AI 발행 준비 | 글쓰기 | 본문 → 소개문(80~120자)·분류·태그 제안, 항목별 [적용] |
| F2 UTM 링크 | 발행 완료 화면 | 인스타 프로필·스토리, 카카오톡, 링크 복사용 UTM 링크 자동 생성 |
| F3 방문 통계 | /admin/stats/ | GA4 사용자·조회·세션, 일별 추이, 유입 경로·UTM 캠페인·인기 페이지, 실시간, AI 채택률 |
| F4 인스타 캡션 | 글쓰기·발행 완료 | 캡션 + 해시태그 5개 생성, [복사] |
| F5 실패 처리 | 전체 | AI·GA 실패 시 원인 안내, 입력값 유지, 다시 시도 |

## 4. 구조

| 위치 | 역할 |
|---|---|
| `index.html`, `list/`, `post/`, `404.html` | 독자 화면 |
| `admin/`, `admin/stats/`, `write/` | 관리자 화면 |
| `api/ai-assist.js`, `api/stats.js` | Vercel 서버 함수 (관리자 로그인 확인 후 응답) |
| `api/_lib/` | 공통 모듈 — 관리자 확인, Gemini 호출, GA4 Data API |
| `assets/ai-core.js`, `assets/ai.js` | AI 결과 검증·UTM 생성 / 서버 함수 호출 |
| `scripts/build-pages.mjs` | 글별 정적 페이지·썸네일·sitemap 생성 |
| `tests/` | 단위 테스트 16개 (`npm test`) |

## 5. 기술 스택

1. 화면: HTML·CSS·JavaScript (프레임워크 없음)
2. 데이터·로그인: Firebase Authentication, Cloud Firestore
3. 서버 함수·배포: Vercel (GitHub 커밋 시 자동 배포)
4. AI: Gemini API (`gemini-3.1-flash-lite`, 환경 변수로 교체 가능)
5. 측정: GA4 (측정 `assets/ga.js`, 조회 GA4 Data API)

## 6. 환경 변수 (Vercel)

`GEMINI_API_KEY`, `GEMINI_MODEL`(선택), `GA_PROPERTY_ID`, `GA_SERVICE_ACCOUNT`, `ADMIN_EMAIL` — 값은 저장소에 넣지 않음. 상세는 [AGENTS.md](AGENTS.md) 4장.

## 7. 실행

```
npm install
npm test           # 단위 테스트
npm run build      # public/ 폴더에 배포 파일 생성
```

---
<sub>2.prov.ii · hi.prov.ii@gmail.com · Instagram @2.prov.ii</sub>
