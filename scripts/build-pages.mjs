// 검색·공유용 정적 페이지 생성기
// 1) 사이트 파일을 출력 폴더로 복사
// 2) 발행된 글마다 p/<글번호>/index.html 생성 (제목·설명·썸네일·대표 주소·구조화 데이터 포함)
// 3) 공유 썸네일 og/<글번호>.jpg (1200×630), 기본 썸네일 og/default.jpg 생성
// 4) sitemap.xml, p/ids.json(페이지가 만들어진 글 번호 목록) 생성
// 5) 글 상세 본문도 HTML에 미리 넣어, 자바스크립트를 실행하지 않는 수집기에도 내용이 보이게 함
// 실행: node scripts/build-pages.mjs _site   (테스트: DATA_FILE=posts.json 으로 Firestore 대신 파일 사용)
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SITE = "https://aaaxxxhhh.github.io/1117-blog-design";
const PROJECT = "slow-days-blog";
const API_KEY = "AIzaSyBQIgZUvgVvr-aDZ_lo9RqoKpFyBlvGg8k"; // 공개용 웹 키 (assets/fb.js와 동일)
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const OUT = path.resolve(process.argv[2] || "_site");
const ROOT = process.cwd();
const SKIP = new Set([".git", ".github", "scripts", "node_modules", "api", "tests", "docs", "package.json", "package-lock.json", "vercel.json", "AGENTS.md", path.basename(OUT)]);
const CAT_EN = { essay: "Essay", daily: "Daily", space: "Space", books: "Books" };

// ---------- 유틸 ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const plain = (s) => String(s ?? "")
  .replace(/<[^>]*>/g, " ")
  .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
  .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
  .replace(/[#>*_`]/g, " ")
  .replace(/\s+/g, " ").trim();
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1).trim() + "…" : s);
function val(v) {
  if (!v) return undefined;
  if ("stringValue" in v) return v.stringValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(val);
  if ("nullValue" in v) return null;
  return undefined;
}
const decode = (doc) => ({ id: doc.name.split("/").pop(), updateTime: doc.updateTime, ...Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, val(v)])) });

// ---------- 본문 표시 (assets/fb.js의 renderBody와 같은 결과) ----------
function inline(t) {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="text-decoration:underline">$1</a>');
}
function renderBody(text) {
  const blocks = String(text || "").replace(/\r/g, "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  let n = 0;
  return blocks.map((b) => {
    const imgs = [...b.matchAll(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+|img:[A-Za-z0-9]+)\)/g)];
    if (imgs.length && b.replace(/!\[[^\]]*\]\([^)]*\)/g, "").trim() === "") {
      const figs = imgs.map((m) => `<div class="ph" style="aspect-ratio:4/3">${m[2].startsWith("img:") ? `<img data-img="${esc(m[2].slice(4))}" alt="${esc(m[1])}">` : `<img src="${esc(m[2])}" alt="${esc(m[1])}" loading="lazy">`}</div>`).join("");
      return `<figure class="${imgs.length > 1 ? "spread" : "one"}"><div>${figs}</div>${imgs[0][1] ? `<figcaption>${esc(imgs.map((m) => m[1]).join(" · "))}</figcaption>` : ""}</figure>`;
    }
    if (/^(!\[[^\]]*\]\([^)]*\)\s*)+$/.test(b)) return "";
    if (b.startsWith("## ")) { n++; return `<h3 class="sub"><span>${String(n).padStart(2, "0")}</span>${inline(b.slice(3))}</h3>`; }
    if (b.startsWith("> ")) return `<blockquote>“${inline(b.replace(/^> ?/gm, ""))}”</blockquote>`;
    return `<p>${inline(b).replace(/\n/g, "<br>")}</p>`;
  }).join("");
}
const fmtDate = (iso) => { if (!iso) return ""; const d = new Date(Date.parse(iso) + 9 * 3600e3); return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`; };
// 글 상세 본문 (post/index.html이 그리는 화면과 같은 구조)
function articleHTML(p, coverSrc) {
  const intro = String(p.intro || "").split(/\n{2,}/).filter(Boolean).map((t) => `<p>${esc(t)}</p>`).join("");
  const alt = esc(p.titleKo || p.titleEn);
  const cover = coverSrc ? `<img src="${esc(coverSrc)}" alt="${alt}" width="900" height="1350" fetchpriority="high">` : "[대표 사진]";
  return `
    <header class="head"><h1>${esc(p.titleEn)}</h1><p class="ko">${esc(p.titleKo)}</p>
      <p class="by">${esc(CAT_EN[p.category] || "")} by ${esc(p.author)}<br>${fmtDate(p.publishedAt)}</p></header>
    <figure class="cover"><div class="ph" style="--tone:#D9D4CC">${cover}</div>${p.coverCredit ? `<figcaption>${esc(p.coverCredit)}</figcaption>` : ""}</figure>
    <div class="col intro">${intro}</div>
    <div class="body">${renderBody(p.body)}
      ${(p.tags || []).length ? `<p class="tags">${p.tags.map((t) => "#" + esc(t)).join(" ")}</p>` : ""}
      <div class="share"><a href="../../list/">← 목록으로</a><button type="button" id="copy">링크 복사</button></div></div>`;
}

// ---------- 데이터 ----------
async function loadPosts() {
  if (process.env.DATA_FILE) return JSON.parse(await fs.readFile(process.env.DATA_FILE, "utf8"));
  const r = await fetch(`${FS}:runQuery?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "posts" }], where: { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "published" } } } } }),
  });
  if (!r.ok) throw new Error(`Firestore 글 목록 읽기 실패: ${r.status} ${await r.text()}`);
  const rows = await r.json();
  const now = Date.now();
  return rows.filter((x) => x.document).map((x) => decode(x.document))
    .filter((p) => !p.publishedAt || Date.parse(p.publishedAt) <= now)
    .sort((a, b) => Date.parse(b.publishedAt || 0) - Date.parse(a.publishedAt || 0));
}
async function loadImage(id) {
  if (!id || process.env.DATA_FILE) return null;
  const r = await fetch(`${FS}/images/${encodeURIComponent(id)}?key=${API_KEY}`);
  if (!r.ok) return null;
  return val((await r.json()).fields?.data) || null;
}
function dataUrlToBuffer(u) {
  const m = /^data:image\/(?:jpeg|png|webp);base64,(.+)$/.exec(u || "");
  return m ? Buffer.from(m[1], "base64") : null;
}

// ---------- 썸네일 ----------
async function makeDefaultOg(file) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="#F4F2EE"/>
    <text x="600" y="330" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="120" font-weight="700" letter-spacing="-6" fill="#111">slow days</text>
    <text x="600" y="410" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="30" letter-spacing="6" fill="#555">ESSAY · DAILY · SPACE · BOOKS</text>
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toFile(file);
}
// 공유 썸네일(1200×630)과 글 상세 대표 사진(가로 900, 2:3) 파일 생성
async function makePostImages(p, ogFile, coverFile) {
  const buf = dataUrlToBuffer(await loadImage(p.coverId)) || dataUrlToBuffer(p.coverThumb);
  if (!buf) return false;
  await sharp(buf).rotate().resize(1200, 630, { fit: "cover", position: "attention" }).jpeg({ quality: 82, mozjpeg: true }).toFile(ogFile);
  await sharp(buf).rotate().resize(900, 1350, { fit: "cover", position: "attention" }).jpeg({ quality: 80, mozjpeg: true }).toFile(coverFile);
  return true;
}

// ---------- 글 페이지 ----------
function headFor(p, url, img, hasOwnImg) {
  const title = `${p.titleKo || p.titleEn} — slow days`;
  const desc = cut(plain(p.intro) || plain(p.body) || "slow days — 느리게 보는 생활 기록", 120);
  const ld = {
    "@context": "https://schema.org", "@type": "BlogPosting",
    headline: p.titleKo || p.titleEn, alternativeHeadline: p.titleEn || undefined,
    description: desc, image: [img], url, mainEntityOfPage: url,
    datePublished: p.publishedAt || p.createdAt, dateModified: p.updatedAt || p.publishedAt,
    author: { "@type": "Person", name: p.author || "slow days" },
    publisher: { "@type": "Organization", name: "slow days" },
    articleSection: CAT_EN[p.category] || undefined, keywords: (p.tags || []).join(", ") || undefined, inLanguage: "ko-KR",
  };
  return {
    title,
    meta: `<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="slow days">
<meta property="og:locale" content="ko_KR">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(hasOwnImg ? p.titleKo || p.titleEn : "slow days")}">
${p.publishedAt ? `<meta property="article:published_time" content="${esc(p.publishedAt)}">\n` : ""}${p.updatedAt ? `<meta property="article:modified_time" content="${esc(p.updatedAt)}">\n` : ""}<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(img)}">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\" + "u003c")}</script>`,
  };
}
function pageFrom(template, p, head, article) {
  let html = template
    .replace(/(["'(`])\.\.\//g, "$1../../")
    .replace('<html lang="ko">', `<html lang="ko" data-post-id="${esc(p.id)}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(head.title)}</title>`)
    .replace(/<meta name="description"[^>]*>\n?/, "")
    .replace(/<meta name="robots"[^>]*>\n?/, "")
    .replace(/<article id="art">[\s\S]*?<\/article>/, () => `<article id="art" data-static="1" data-updated="${esc(p.updatedAt || "")}">${article}</article>`);
  return html.replace("</title>", `</title>\n${head.meta}`);
}

// ---------- 실행 ----------
async function copyDir(src, dst) {
  await fs.mkdir(dst, { recursive: true });
  for (const e of await fs.readdir(src, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) await copyDir(s, d); else await fs.copyFile(s, d);
  }
}

await fs.rm(OUT, { recursive: true, force: true });
await copyDir(ROOT, OUT);
await fs.writeFile(path.join(OUT, ".nojekyll"), "");
await fs.mkdir(path.join(OUT, "og"), { recursive: true });
await makeDefaultOg(path.join(OUT, "og", "default.jpg"));

const posts = await loadPosts();
await fs.mkdir(path.join(OUT, "p"), { recursive: true });
const template = await fs.readFile(path.join(ROOT, "post", "index.html"), "utf8");
const urls = [{ loc: `${SITE}/`, lastmod: posts[0]?.updatedAt }, { loc: `${SITE}/list/`, lastmod: posts[0]?.updatedAt }];
let withImg = 0;
for (const p of posts) {
  const url = `${SITE}/p/${encodeURIComponent(p.id)}/`;
  const ogFile = path.join(OUT, "og", `${p.id}.jpg`);
  const coverFile = path.join(OUT, "og", `${p.id}-cover.jpg`);
  let own = false;
  try { own = await makePostImages(p, ogFile, coverFile); } catch (e) { console.warn(`사진 생성 실패 ${p.id}: ${e.message}`); }
  if (own) withImg++;
  const img = own ? `${SITE}/og/${encodeURIComponent(p.id)}.jpg` : `${SITE}/og/default.jpg`;
  const dir = path.join(OUT, "p", p.id);
  await fs.mkdir(dir, { recursive: true });
  const coverSrc = own ? `../../og/${encodeURIComponent(p.id)}-cover.jpg` : "";
  await fs.writeFile(path.join(dir, "index.html"), pageFrom(template, p, headFor(p, url, img, own), articleHTML(p, coverSrc)));
  urls.push({ loc: url, lastmod: p.updatedAt || p.publishedAt });
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${esc(String(u.lastmod).slice(0, 10))}</lastmod>` : ""}</url>`).join("\n")}
</urlset>
`;
await fs.writeFile(path.join(OUT, "sitemap.xml"), sitemap);
await fs.writeFile(path.join(OUT, "p", "ids.json"), JSON.stringify(posts.map((p) => p.id)));
console.log(`글 페이지 ${posts.length}개 생성 (자체 썸네일 ${withImg}개), sitemap.xml ${urls.length}개 주소`);
