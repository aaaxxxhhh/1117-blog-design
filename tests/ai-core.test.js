// 단위 테스트: AI 발행 도우미 순수 함수 (실행: npm test)
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanBody, extractJson, normalizeSuggestion, introStatus, buildUtm, utmSet, yymmdd, captionText } from "../assets/ai-core.js";

test("cleanBody: 사진·링크·기호 제거, 길이 제한", () => {
  const s = cleanBody("## 소제목\n\n![설명](img:abc) **굵게** [링크](https://a.com)", 100);
  assert.equal(s.includes("img:"), false);
  assert.equal(s.includes("https://"), false);
  assert.match(s, /소제목/); assert.match(s, /굵게/); assert.match(s, /링크/);
  assert.equal(cleanBody("가".repeat(50), 10).length, 10);
});

test("extractJson: 코드 블록으로 감싼 응답도 읽음", () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('앞말 {"b":"x"} 뒷말'), { b: "x" });
  assert.throws(() => extractJson("결과 없음"));
});

test("normalizeSuggestion: 잘못된 분류 제거, 태그 5개·# 정리, 해시태그 # 붙이기", () => {
  const r = normalizeSuggestion({ intro: "  소개  문장 ", category: "Travel", tags: ["#기록", "기록", "11월", "a", "b", "c", "d"], caption: "캡션", hashtags: ["##slowdays", "일상 기록"] });
  assert.equal(r.intro, "소개 문장");
  assert.equal(r.category, "");
  assert.deepEqual(r.tags, ["기록", "11월", "a", "b", "c"]);
  assert.deepEqual(r.hashtags, ["#slowdays", "#일상기록"]);
  assert.equal(normalizeSuggestion({ intro: "x", category: "BOOKS" }).category, "books");
  assert.throws(() => normalizeSuggestion({}));
});

test("introStatus: 권장 80~120자 판정", () => {
  assert.equal(introStatus("가".repeat(79)).ok, false);
  assert.equal(introStatus("가".repeat(80)).ok, true);
  assert.equal(introStatus("가".repeat(121)).ok, false);
});

test("buildUtm: 기존 주소 조건 유지, 필수값 확인", () => {
  const u = new URL(buildUtm("https://ex.com/post/?id=a1", { source: "instagram", medium: "social", campaign: "profile" }));
  assert.equal(u.searchParams.get("id"), "a1");
  assert.equal(u.searchParams.get("utm_source"), "instagram");
  assert.equal(u.searchParams.get("utm_campaign"), "profile");
  assert.throws(() => buildUtm("https://ex.com/", { source: "x" }));
});

test("utmSet: 텍소노미 규칙대로 4개 링크 생성 (스토리는 한국 날짜 YYMMDD)", () => {
  const d = new Date("2026-11-24T16:00:00Z"); // 한국 시간 11월 25일 01시
  assert.equal(yymmdd(d), "261125");
  const set = utmSet("https://ex.com/post/?id=a1", d);
  assert.deepEqual(set.map((l) => l.key), ["ig_profile", "ig_story", "kakao", "copy_link"]);
  assert.match(set[1].url, /utm_campaign=story_261125/);
  assert.match(set[3].url, /utm_source=copy_link&utm_medium=share/);
  assert.equal(new URL(set[2].url).searchParams.has("utm_campaign"), false);
});

test("captionText: 캡션과 해시태그를 빈 줄로 연결", () => {
  assert.equal(captionText({ caption: "본문", hashtags: ["#a", "#b"] }), "본문\n\n#a #b");
  assert.equal(captionText({ caption: "본문", hashtags: [] }), "본문");
});
