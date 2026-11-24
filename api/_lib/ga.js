// GA4 Data API 호출 — 서비스 계정 키(환경 변수 GA_SERVICE_ACCOUNT)로 읽기 전용 접근 토큰 발급
import crypto from "node:crypto";

const b64url = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");

export function readConfig(env = process.env) {
  const id = String(env.GA_PROPERTY_ID || "").replace(/\D/g, "");
  let sa = null;
  try { sa = env.GA_SERVICE_ACCOUNT ? JSON.parse(env.GA_SERVICE_ACCOUNT) : null; } catch { sa = null; }
  if (!id || !sa?.client_email || !sa?.private_key) {
    throw Object.assign(new Error("방문 통계 연결 설정이 아직 없어요. (Vercel 환경 변수 GA_PROPERTY_ID, GA_SERVICE_ACCOUNT)"), { status: 503, code: "no_ga" });
  }
  return { id, sa };
}

// 서명된 JWT → Google 접근 토큰 (1시간 유효, 함수 인스턴스 안에서 재사용)
let cached = { token: "", exp: 0 };
export function signJwt(sa, now = Math.floor(Date.now() / 1000)) {
  const head = b64url({ alg: "RS256", typ: "JWT" });
  const body = b64url({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/analytics.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
  const sig = crypto.createSign("RSA-SHA256").update(`${head}.${body}`).sign(sa.private_key).toString("base64url");
  return `${head}.${body}.${sig}`;
}
async function accessToken(sa) {
  if (cached.token && cached.exp > Date.now() + 60000) return cached.token;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: signJwt(sa) }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error("GA 접근 토큰을 받지 못했어요. 서비스 계정 키를 확인해 주세요."), { status: 502, code: "ga_auth" });
  cached = { token: d.access_token, exp: Date.now() + (d.expires_in || 3600) * 1000 };
  return cached.token;
}

export async function gaPost(path, body, env = process.env) {
  const { id, sa } = readConfig(env);
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${id}:${path}`, {
    method: "POST", headers: { Authorization: `Bearer ${await accessToken(sa)}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const who = `(속성 ID ${id} · 계정 ${sa.client_email})`;
    const msg = r.status === 403 ? `서비스 계정에 이 GA 속성의 뷰어 권한이 없어요. 속성 ID가 맞는지, GA 관리 > 속성 액세스 관리에 아래 계정이 있는지 확인해 주세요. ${who}` : `GA 응답 오류 (${r.status}) ${who}`;
    throw Object.assign(new Error(msg), { status: 502, code: "ga_error", detail: d?.error?.message });
  }
  return d;
}

// GA 보고서 행 → [{차원..., 측정값...}] 형태로 변환
export function rowsOf(report) {
  const dims = (report?.dimensionHeaders || []).map((h) => h.name);
  const mets = (report?.metricHeaders || []).map((h) => h.name);
  return (report?.rows || []).map((r) => Object.fromEntries([
    ...dims.map((n, i) => [n, r.dimensionValues?.[i]?.value ?? ""]),
    ...mets.map((n, i) => [n, Number(r.metricValues?.[i]?.value ?? 0)]),
  ]));
}
