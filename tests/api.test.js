// 단위 테스트: 서버 함수 (외부 호출은 가짜 응답으로 대체)
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateJson, modelList } from "../api/_lib/gemini.js";
import { buildPrompt } from "../api/ai-assist.js";

const res = (status, body) => ({ ok: status < 400, status, json: async () => body });
const okBody = (text) => ({ candidates: [{ content: { parts: [{ text }] } }] });

test("modelList: 환경 변수 모델을 맨 앞에, 중복 제거", () => {
  const l = modelList({ GEMINI_MODEL: "gemini-2.5-flash" });
  assert.equal(l[0], "gemini-2.5-flash");
  assert.equal(new Set(l).size, l.length);
});

test("generateJson: 키가 없으면 안내 오류(503)", async () => {
  await assert.rejects(generateJson("x", { env: {} }), (e) => e.status === 503 && e.code === "no_key");
});

test("generateJson: 첫 모델이 없으면(404) 다음 모델로 넘어감", async () => {
  const calls = [];
  const fetchImpl = async (url) => { calls.push(url); return calls.length === 1 ? res(404, { error: { message: "model not found" } }) : res(200, okBody('{"a":1}')); };
  const r = await generateJson("x", { env: { GEMINI_API_KEY: "k" }, fetchImpl });
  assert.equal(calls.length, 2);
  assert.equal(r.text, '{"a":1}');
});

test("generateJson: 키 오류(403)는 다른 모델을 시도하지 않고 실패", async () => {
  let n = 0;
  const fetchImpl = async () => { n++; return res(403, { error: { message: "API key invalid" } }); };
  await assert.rejects(generateJson("x", { env: { GEMINI_API_KEY: "k" }, fetchImpl }), (e) => e.status === 502);
  assert.equal(n, 1);
});

test("buildPrompt: 제목·본문과 4개 분류 지시 포함", () => {
  const p = buildPrompt({ titleKo: "제목", titleEn: "TITLE", body: "본문" });
  for (const k of ["제목", "TITLE", "본문", "essay | daily | space | books", "\"hashtags\""]) assert.ok(p.includes(k), k);
});
