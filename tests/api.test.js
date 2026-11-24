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
  for (const k of ["제목", "TITLE", "본문", "essay | daily | space | books", "\"hashtags\"", "\"threads\""]) assert.ok(p.includes(k), k);
});

import crypto from "node:crypto";
import { readConfig, signJwt, rowsOf } from "../api/_lib/ga.js";
import { statsRequests } from "../api/stats.js";

test("readConfig: GA 설정이 없거나 깨졌으면 안내 오류(503)", () => {
  assert.throws(() => readConfig({}), (e) => e.status === 503 && e.code === "no_ga");
  assert.throws(() => readConfig({ GA_PROPERTY_ID: "123", GA_SERVICE_ACCOUNT: "{깨진" }), (e) => e.code === "no_ga");
});

test("signJwt: 서비스 계정 키로 서명한 JWT가 공개키로 검증됨", () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const sa = { client_email: "bot@x.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) };
  const [h, b, s] = signJwt(sa, 1000).split(".");
  const body = JSON.parse(Buffer.from(b, "base64url"));
  assert.equal(body.iss, sa.client_email);
  assert.equal(body.exp - body.iat, 3600);
  assert.match(body.scope, /analytics\.readonly/);
  assert.ok(crypto.createVerify("RSA-SHA256").update(`${h}.${b}`).verify(publicKey, Buffer.from(s, "base64url")));
});

test("rowsOf: GA 보고서 행을 이름 있는 값으로 변환", () => {
  const r = rowsOf({ dimensionHeaders: [{ name: "date" }], metricHeaders: [{ name: "activeUsers" }], rows: [{ dimensionValues: [{ value: "20261124" }], metricValues: [{ value: "12" }] }] });
  assert.deepEqual(r, [{ date: "20261124", activeUsers: 12 }]);
  assert.deepEqual(rowsOf({}), []);
});

test("statsRequests: 기간(일) 반영, 보고서 5개(일괄 요청 최대치)", () => {
  const q = statsRequests(28);
  assert.equal(q.length, 5);
  assert.equal(q[0].dateRanges[0].startDate, "27daysAgo");
  assert.equal(q[2].limit, 5);
});
