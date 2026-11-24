// 서버 함수 공통: 허용 주소(CORS), 관리자 확인, 오류 응답
const FIREBASE_WEB_KEY = "AIzaSyBQIgZUvgVvr-aDZ_lo9RqoKpFyBlvGg8k"; // 공개용 웹 키 (assets/fb.js와 동일)
const ORIGINS = ["https://aaaxxxhhh.github.io"];

export function allowOrigin(req, res) {
  const o = req.headers.origin || "";
  if (ORIGINS.includes(o) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(o) || /^http:\/\/localhost(:\d+)?$/.test(o)) {
    res.setHeader("Access-Control-Allow-Origin", o);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

export function fail(res, status, message, code = "error") {
  return res.status(status).json({ ok: false, code, message });
}

// Firebase 로그인 토큰을 Google 인증 서버에 확인 → 관리자 이메일이면 통과
export async function requireAdmin(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) throw Object.assign(new Error("로그인이 필요해요."), { status: 401 });
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: token }),
  });
  const user = r.ok ? (await r.json()).users?.[0] : null;
  if (!user?.email) throw Object.assign(new Error("로그인이 만료됐어요. 다시 로그인해 주세요."), { status: 401 });
  const allow = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (allow.length && !allow.includes(user.email.toLowerCase())) throw Object.assign(new Error("관리자 계정이 아니에요."), { status: 403 });
  return user.email;
}

// 공통 처리 틀: OPTIONS 응답, 메서드 확인, 관리자 확인, 오류를 안내 문구로 변환
export function adminHandler(method, fn) {
  return async (req, res) => {
    allowOrigin(req, res);
    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== method) return fail(res, 405, "허용되지 않은 요청이에요.", "method");
    try {
      const email = await requireAdmin(req);
      return await fn(req, res, email);
    } catch (e) {
      console.error(e);
      return fail(res, e.status || 500, e.status ? e.message : "서버에서 문제가 생겼어요. 잠시 후 다시 시도해 주세요.", e.code || "error");
    }
  };
}
