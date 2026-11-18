// slow days — Firebase 연결 + 공통 함수
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

// Firebase 웹 앱 설정값 (공개되어도 되는 값입니다. 데이터 보호는 Firestore 보안 규칙이 담당합니다.)
const firebaseConfig = {
  apiKey: "AIzaSyBQIgZUvgVvr-aDZ_lo9RqoKpFyBlvGg8k",
  authDomain: "slow-days-blog.firebaseapp.com",
  projectId: "slow-days-blog",
  storageBucket: "slow-days-blog.firebasestorage.app",
  messagingSenderId: "462875351193",
  appId: "1:462875351193:web:6fe9c2915d334923fb8008"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const posts = collection(db, "posts");
const images = collection(db, "images");

export const CATS = { essay: "Essay 에세이", daily: "Daily 일상", space: "Space 공간", books: "Books 책" };
export const CAT_EN = { essay: "Essay", daily: "Daily", space: "Space", books: "Books" };
const TONES = ["#E4DED3", "#C9CFC8", "#BFC3C7", "#D9D4CC", "#E2CFCB", "#CCD2CB", "#D6CEC4"];
const SHAPES = [["100%", "64%"], ["72%", "100%"], ["100%", "78%"], ["76%", "100%"]];

// ---------- 데이터 ----------
const toMs = (t) => (t && t.toMillis ? t.toMillis() : 0);
export const byNewest = (a, b) => toMs(b.publishedAt || b.createdAt) - toMs(a.publishedAt || a.createdAt);

// 검색·공유용 글 페이지(p/글번호/)가 만들어진 글 번호 목록 (자동 배포 때 p/ids.json 생성)
const BUILT = new Set();
const builtReady = fetch(new URL("../p/ids.json", import.meta.url), { cache: "no-cache" })
  .then((r) => (r.ok ? r.json() : [])).then((a) => a.forEach((x) => BUILT.add(x))).catch(() => {});
// 글 주소: 페이지가 만들어진 글은 대표 주소(p/글번호/), 아직이면 예전 주소(post/?id=)
export const postHref = (p, base) => (BUILT.has(p.id) ? `${base}p/${encodeURIComponent(p.id)}/` : `${base}post/?id=${encodeURIComponent(p.id)}`);

export async function getPublished() {
  await builtReady;
  const snap = await getDocs(query(posts, where("status", "==", "published")));
  const now = Date.now();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => !p.publishedAt || toMs(p.publishedAt) <= now)
    .sort(byNewest);
}
export async function getAllPosts() {
  const snap = await getDocs(posts);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byNewest);
}
export async function getPost(id) {
  const s = await getDoc(doc(db, "posts", id));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}
export async function savePost(id, data) {
  const body = { ...data, updatedAt: serverTimestamp() };
  if (data.publishedAtStr) body.publishedAt = Timestamp.fromDate(new Date(data.publishedAtStr + "T09:00:00"));
  else if (data.status === "published") body.publishedAt = Timestamp.now();
  delete body.publishedAtStr;
  if (id) { await updateDoc(doc(db, "posts", id), body); return id; }
  body.createdAt = serverTimestamp();
  const ref = await addDoc(posts, body);
  return ref.id;
}
export const removePost = (id) => deleteDoc(doc(db, "posts", id));

// ---------- 사진 (Firestore 'images'에 사진 1장 = 문서 1개로 저장) ----------
// 무료 요금제(Spark)에서는 Cloud Storage를 쓸 수 없어서, 사진을 줄여 글자(data URL)로 바꿔 저장합니다.
// 문서 1개는 최대 1MiB라서 약 900KB 이하가 되도록 크기·화질을 자동으로 낮춥니다.
const LIMIT = 900 * 1024;
function loadImg(file) {
  return new Promise((ok, no) => { const u = URL.createObjectURL(file); const im = new Image();
    im.onload = () => { URL.revokeObjectURL(u); ok(im); }; im.onerror = () => no(new Error("사진을 읽지 못했어요")); im.src = u; });
}
export async function fileToDataURL(file, maxW = 1600, q = 0.82) {
  const im = await loadImg(file);
  let w = Math.min(maxW, im.naturalWidth), out = "";
  for (let i = 0; i < 8; i++) {
    const h = Math.round(im.naturalHeight * (w / im.naturalWidth));
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, w, h); cx.drawImage(im, 0, 0, w, h);
    out = cv.toDataURL("image/jpeg", q);
    if (out.length <= LIMIT) return out;
    if (q > 0.55) q -= 0.1; else w = Math.round(w * 0.8);
  }
  return out;
}
export async function uploadImage(file) {
  const data = await fileToDataURL(file);
  const ref = await addDoc(images, { data, createdAt: serverTimestamp() });
  return ref.id;
}
const imgCache = {};
export async function getImage(id) {
  if (!imgCache[id]) imgCache[id] = getDoc(doc(db, "images", id)).then((s) => (s.exists() ? s.data().data : ""));
  return imgCache[id];
}
export async function hydrateImages(root) {
  await Promise.all([...root.querySelectorAll("img[data-img]")].map(async (el) => {
    try { const d = await getImage(el.dataset.img); if (d) el.src = d; } catch (e) { console.error(e); }
  }));
}

// ---------- 로그인 ----------
export async function login(email, pw, keep) {
  await setPersistence(auth, keep ? browserLocalPersistence : browserSessionPersistence);
  return signInWithEmailAndPassword(auth, email, pw);
}
export const logout = () => signOut(auth);
export const resetPw = (email) => sendPasswordResetEmail(auth, email);
export const onUser = (cb) => onAuthStateChanged(auth, cb);

// ---------- 화면 도우미 ----------
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : "");
export const safeSrc = (u) => (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u || "") ? u : safeUrl(u));
export function fmtDate(t) {
  if (!t || !t.toDate) return "";
  const d = t.toDate();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
export function photo(p, i, label = "[사진]") {
  const tone = TONES[i % TONES.length];
  const src = safeSrc(p && (p.coverThumb || p.coverUrl));
  return `<div class="ph" style="--tone:${tone}">${src ? `<img src="${esc(src)}" alt="${esc(p.titleKo || p.titleEn || "")}" loading="lazy">` : label}</div>`;
}
export function shapeVars(i) {
  const s = SHAPES[i % SHAPES.length], land = s[0] === "100%";
  // 메인 3열(비율) + 글 목록 4열(PW /articles 실제 크기: 가로 146×97 · 세로 85×127 / 태블릿 125×83 · 75×113)
  return `--w:${s[0]};--h:${s[1]};--lw:${land ? 146 : 85}px;--lh:${land ? 97 : 127}px;--tw:${land ? 125 : 75}px;--th:${land ? 83 : 113}px`;
}
export function cardHTML(p, i, base, tag = "h2") {
  return `<a class="card" href="${postHref(p, base)}">
    <div class="frame" style="${shapeVars(i)}">${photo(p, i)}</div>
    <${tag}>${esc(p.titleEn)}${p.titleKo ? "<br>" + esc(p.titleKo) : ""}</${tag}>
    <p>${esc(CAT_EN[p.category] || "")} by ${esc(p.author || "")}<br>${fmtDate(p.publishedAt)}</p></a>`;
}
export function sideHTML(base, active) {
  const items = [["", "All 전체 글"], ...Object.entries(CATS)];
  return `<aside class="side"><nav aria-label="카테고리">${items.map(([k, v]) =>
    `<a href="${base}list/${k ? "?cat=" + k : ""}" class="${active === k ? "on" : ""}">${v}</a>`).join("")}
    <a href="${base}list/?search=1" class="gap">Search 검색</a></nav>
    <a class="brand" href="${base}"><strong>slow days</strong><span><br>느리게 보는 생활 기록</span></a></aside>`;
}

// 본문 표기법 → 화면 (## 소제목 / > 인용 / ![설명](주소) 사진 / **굵게** / [글자](주소) 링크)
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="text-decoration:underline">$1</a>');
}
export function renderBody(text) {
  const blocks = String(text || "").replace(/\r/g, "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  let n = 0;
  return blocks.map((b) => {
    const imgs = [...b.matchAll(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+|img:[A-Za-z0-9]+)\)/g)];
    if (imgs.length && b.replace(/!\[[^\]]*\]\([^)]*\)/g, "").trim() === "") {
      const figs = imgs.map((m) => `<div class="ph" style="aspect-ratio:4/3">${m[2].startsWith("img:") ? `<img data-img="${esc(m[2].slice(4))}" alt="${esc(m[1])}">` : `<img src="${esc(m[2])}" alt="${esc(m[1])}" loading="lazy">`}</div>`).join("");
      return `<figure class="${imgs.length > 1 ? "spread" : "one"}"><div>${figs}</div>${imgs[0][1] ? `<figcaption>${esc(imgs.map((m) => m[1]).join(" · "))}</figcaption>` : ""}</figure>`;
    }
    if (/^(!\[[^\]]*\]\([^)]*\)\s*)+$/.test(b)) return ""; // 주소가 비어 있는 사진 표시(예: ![설명](https://))는 화면에 글자로 남기지 않음
    if (b.startsWith("## ")) { n++; return `<h3 class="sub"><span>${String(n).padStart(2, "0")}</span>${inline(b.slice(3))}</h3>`; }
    if (b.startsWith("> ")) return `<blockquote>“${inline(b.replace(/^> ?/gm, ""))}”</blockquote>`;
    return `<p>${inline(b).replace(/\n/g, "<br>")}</p>`;
  }).join("");
}
