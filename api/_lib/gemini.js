// Gemini API 호출 (REST generateContent). 키는 Vercel 환경 변수 GEMINI_API_KEY에만 저장
const DEFAULT_MODELS = ["gemini-3.1-flash-lite", "gemini-3-flash-preview", "gemini-2.5-flash"];

export function modelList(env = process.env) {
  return [...new Set([env.GEMINI_MODEL, ...DEFAULT_MODELS].filter(Boolean))];
}

export async function generateJson(prompt, { timeoutMs = 20000, env = process.env, fetchImpl = fetch } = {}) {
  const key = env.GEMINI_API_KEY;
  if (!key) throw Object.assign(new Error("AI 키가 아직 설정되지 않았어요. (Vercel 환경 변수 GEMINI_API_KEY)"), { status: 503, code: "no_key" });
  let last;
  for (const model of modelList(env)) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        last = Object.assign(new Error(data?.error?.message || `AI 응답 오류 (${r.status})`), { httpStatus: r.status });
        if ([400, 401, 403].includes(r.status) && !/model|not found|not supported/i.test(last.message)) break; // 키 문제는 다른 모델로 넘어가지 않음
        continue; // 모델 없음(404)·사용량 초과(429)·서버 오류(5xx)는 다음 모델 시도
      }
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
      if (!text) { last = new Error("AI가 빈 응답을 보냈어요."); continue; }
      return { text, model };
    } catch (e) {
      last = e.name === "AbortError" ? new Error("AI 응답이 너무 오래 걸려요.") : e;
    } finally { clearTimeout(timer); }
  }
  throw Object.assign(new Error(`AI 결과를 받지 못했어요. 잠시 후 다시 시도해 주세요. (${last?.message || "알 수 없는 오류"})`), { status: 502, code: "ai_failed" });
}
