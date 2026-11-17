# 1117-blog-design

라이프스타일·에세이 블로그 **slow days** 메인(홈) 디자인 초안

## 구성

| 구분 | 파일 | 설명 |
|---|---|---|
| 웹페이지 버전 | `index.html` | 브라우저에서 바로 열리는 반응형 페이지 (데스크톱·태블릿·모바일) |
| 디자인 원본 · 데스크톱 | `design/Main.dc.html` | Claude 디자인 캔버스용 원본 (1440px) |
| 디자인 원본 · 모바일 | `design/Mobile.dc.html` | Claude 디자인 캔버스용 원본 (390px) |
| 디자인 원본 · 배치 정보 | `design/canvas.json` | 캔버스의 아트보드 위치·크기 |

## 화면 구조

1. 첫 화면 : 작은 아이콘 바 + 큰 소문자 로고 + 높이가 엇갈린 가로 사진 띠
2. 스크롤 아래 : 왼쪽 고정 메뉴 + 3열 글 목록 → 인용구 → 3열 글 목록 → 단독 글 → 추천·협업 3칸 → 소개 문단·뉴스레터 → 롱리드 → 하단 링크 4묶음

## 참고 링크

1. [디자인 초안 (Claude 디자인 캔버스)](https://claude.ai/artifact/SfmKdjgKswKK9e6xSv9nGL)
2. [UI 참고 1 : Walter Schupfer Management](https://wschupfer.com/new-york/?ref=siteinspire) — 첫 화면
3. [UI 참고 2 : PW-Magazine](https://www.pw-magazine.com/?ref=siteinspire) — 스크롤 아래 영역

## 참고 사항

1. `[사진]`, `[작성자]`, `[발행일]` 표시는 실제 내용으로 바꿔야 하는 자리입니다.
2. 참고 사이트의 사진·로고·글은 사용하지 않았고, 화면 구성만 참고했습니다.
3. 글꼴 : Inter Tight, Noto Sans KR, Noto Serif KR (Google Fonts)
