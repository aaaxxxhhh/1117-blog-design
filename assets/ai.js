// 관리자 화면 → Vercel 서버 함수 호출 (로그인 토큰 첨부, 시간 제한, 오류 문구 정리)
import { auth } from "./fb.js?v=5";
export * from "./ai-core.js?v=2";

// Vercel에서 열면 같은 주소의 /api, GitHub Pages에서 열면 Vercel 주소의 /api 사용
export const VERCEL_URL = "https://slow-days-blog.vercel.app";
// 공유 링크는 어느 주소에서 발행해도 대표 주소(Vercel) 기준으로 만듦 (의사결정 로그 D-010)
export const SITE_URL = VERCEL_URL;
export const API_BASE = location.hostname.endsWith("github.io") ? VERCEL_URL : "";

export async function callApi(path, { method = "POST", body, timeoutMs = 30000 } = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("로그인이 필요해요.");
  const token = await user.getIdToken();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(API_BASE + path, {
      method, signal: ctrl.signal,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => null);
    if (!r.ok || !data?.ok) throw new Error(data?.message || `요청에 실패했어요. (${r.status})`);
    return data;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("응답이 너무 오래 걸려요. 잠시 후 다시 시도해 주세요.");
    if (e instanceof TypeError) throw new Error("서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.");
    throw e;
  } finally { clearTimeout(timer); }
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select();
    const ok = document.execCommand("copy"); t.remove(); return ok;
  }
}
