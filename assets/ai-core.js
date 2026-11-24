// AI 발행 도우미 — 순수 함수 모음 (브라우저·서버 함수·단위 테스트에서 함께 사용)
// 외부 모듈을 불러오지 않습니다.

export const CATEGORIES = ["essay", "daily", "space", "books"];
export const INTRO_MIN = 80;
export const INTRO_MAX = 120;

// 본문 표기(사진·링크·굵게·소제목 기호)를 걷어 내고 AI에 보낼 글자만 남김
export function cleanBody(text, max = 6000) {
  const s = String(text ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return s.length > max ? s.slice(0, max) : s;
}

// AI 응답 글자에서 JSON 부분만 꺼내기 (```json ... ``` 감싸기 대응)
export function extractJson(text) {
  const s = String(text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("AI 응답에서 결과를 찾지 못했어요.");
  return JSON.parse(s.slice(a, b + 1));
}

const cutText = (s, n) => (s.length > n ? s.slice(0, n).trim() : s);
const uniq = (arr) => [...new Set(arr)];

// AI 결과를 화면에 쓰기 좋은 모양으로 정리하고 잘못된 값은 걸러냄
export function normalizeSuggestion(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const intro = cutText(String(o.intro ?? "").replace(/\s+/g, " ").trim(), 200);
  const category = CATEGORIES.includes(String(o.category ?? "").toLowerCase()) ? String(o.category).toLowerCase() : "";
  const tags = uniq((Array.isArray(o.tags) ? o.tags : String(o.tags ?? "").split(","))
    .map((t) => String(t).replace(/^#/, "").trim()).filter((t) => t && t.length <= 20)).slice(0, 5);
  const caption = cutText(String(o.caption ?? "").trim(), 500);
  const threads = cutText(String(o.threads ?? "").trim(), 500);
  const hashtags = uniq((Array.isArray(o.hashtags) ? o.hashtags : String(o.hashtags ?? "").split(/[\s,]+/))
    .map((t) => String(t).replace(/^#+/, "").replace(/\s+/g, "").trim()).filter(Boolean)).slice(0, 5).map((t) => "#" + t);
  if (!intro && !category && !tags.length && !caption) throw new Error("AI가 빈 결과를 보냈어요.");
  return { intro, category, tags, caption, hashtags, threads };
}

// 도입 문단 길이 판정 (권장 80~120자)
export function introStatus(text) {
  const n = String(text ?? "").trim().length;
  return { length: n, ok: n >= INTRO_MIN && n <= INTRO_MAX };
}

// 주소에 UTM 붙이기 (기존 검색 조건은 유지, 같은 이름은 덮어씀). content = 글 구분값
export function buildUtm(url, { source, medium, campaign, content } = {}) {
  if (!source || !medium) throw new Error("utm_source와 utm_medium은 꼭 필요해요.");
  const u = new URL(url);
  u.searchParams.set("utm_source", source);
  u.searchParams.set("utm_medium", medium);
  if (campaign) u.searchParams.set("utm_campaign", campaign); else u.searchParams.delete("utm_campaign");
  if (content) u.searchParams.set("utm_content", content); else u.searchParams.delete("utm_content");
  return u.toString();
}

// YYMMDD (한국 시간 기준)
export function yymmdd(date = new Date()) {
  const k = new Date(date.getTime() + 9 * 3600 * 1000);
  return String(k.getUTCFullYear()).slice(2) + String(k.getUTCMonth() + 1).padStart(2, "0") + String(k.getUTCDate()).padStart(2, "0");
}

// 발행 글 공유용 UTM 링크 묶음 (유입 증대 이벤트 텍소노미 v1.0 규칙 + 글 구분값 utm_content, 의사결정 로그 D-012)
export function utmSet(postUrl, date = new Date(), postId = "") {
  const content = postId ? String(postId) : "";
  return [
    { key: "ig_story", label: "인스타그램 스토리 링크 스티커", url: buildUtm(postUrl, { source: "instagram", medium: "social", campaign: "story_" + yymmdd(date), content }) },
    { key: "threads", label: "스레드 게시물", url: buildUtm(postUrl, { source: "threads", medium: "social", content }) },
    { key: "kakao", label: "카카오톡 공유", url: buildUtm(postUrl, { source: "kakao", medium: "messenger", content }) },
    { key: "copy_link", label: "링크 복사 (그 외)", url: buildUtm(postUrl, { source: "copy_link", medium: "share", content }) },
  ];
}

// 인스타그램 프로필에 한 번 걸어 두는 고정 링크 (글 목록으로 연결 — 새 글마다 바꿀 필요 없음)
export function profileLink(listUrl) {
  return buildUtm(listUrl, { source: "instagram", medium: "social", campaign: "profile" });
}

// 인스타그램 캡션 + 해시태그 합치기
export function captionText(s) {
  return [s.caption, (s.hashtags || []).join(" ")].filter(Boolean).join("\n\n");
}
