// F1·F4 AI 발행 준비: 글 제목·본문 → 소개문·분류·태그·인스타 캡션·해시태그
import { adminHandler, fail } from "./_lib/http.js";
import { generateJson } from "./_lib/gemini.js";
import { cleanBody, extractJson, normalizeSuggestion } from "../assets/ai-core.js";

export function buildPrompt({ titleKo = "", titleEn = "", body = "" }) {
  return `너는 라이프스타일·에세이 블로그 "slow days"(부제: 느리게 보는 생활 기록)의 편집자다.
아래 글을 읽고 발행에 필요한 항목을 JSON 하나로만 답한다. 다른 설명은 쓰지 않는다.

{
  "intro": "글 상세 맨 위와 검색·공유 미리보기에 쓰는 소개문. 한국어 80~120자, 2~3문장, 차분한 문체, 과장·느낌표 금지",
  "category": "essay | daily | space | books 중 하나 (에세이=생각·감정, 일상=하루 기록, 공간=장소·인테리어, 책=책 이야기)",
  "tags": ["한국어 태그 3~5개, 각 2~8자, # 없이"],
  "caption": "인스타그램 게시물 캡션. 한국어 3~5줄, 첫 줄에 호기심을 주는 문장, 마지막 줄은 '프로필 링크에서 전문 읽기'",
  "hashtags": ["해시태그 5개, # 없이"],
  "threads": "스레드 게시물. 한국어 2~4문장, 본문에서 가장 여운이 남는 문장을 살려 짧게, 해시태그 없이, 마지막 줄은 '전문은 링크에서'"
}

[제목] ${titleKo} / ${titleEn}
[본문]
${body}`;
}

export default adminHandler("POST", async (req, res) => {
  const { titleKo = "", titleEn = "", body = "" } = req.body || {};
  const text = cleanBody(body);
  if (text.length < 50) return fail(res, 400, "본문을 50자 이상 쓴 뒤에 눌러 주세요.", "short_body");
  const started = Date.now();
  const { text: out, model } = await generateJson(buildPrompt({ titleKo: String(titleKo).slice(0, 100), titleEn: String(titleEn).slice(0, 100), body: text }));
  let result;
  try { result = normalizeSuggestion(extractJson(out)); }
  catch (e) { return fail(res, 502, "AI 결과 형식이 맞지 않아요. 다시 시도해 주세요.", "bad_format"); }
  return res.status(200).json({ ok: true, result, model, ms: Date.now() - started });
});
