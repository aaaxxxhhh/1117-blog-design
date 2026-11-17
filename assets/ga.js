// Google Analytics 4 (GA4) — 측정 ID와 이벤트 전송을 한 곳에서 관리
// 기준: 20261117_유입 증대 이벤트 텍소노미 지침_v1.0 (https://claude.ai/artifact/6DwmBFtGcTweSsFA7varbz)
// 측정 ID는 GA 관리 > 데이터 스트림 > 웹 스트림 상세에서 확인 (형식: G-XXXXXXXXXX)
export const GA_ID = "G-XDP3GEVQXE";

// 내부(운영자) 방문 제외: 관리자 로그인 시 이 기기에 표시를 남기고, 표시가 있으면 전송하지 않음
// 수동 전환: 주소 뒤에 ?internal=1 (제외 켜기) / ?internal=0 (제외 끄기)
const FLAG = "sd_internal";
const store = (fn) => { try { return fn(window.localStorage); } catch { return null; } };
const urlFlag = new URLSearchParams(location.search).get("internal");
if (urlFlag === "1") store((s) => s.setItem(FLAG, "1"));
if (urlFlag === "0") store((s) => s.removeItem(FLAG));
export function markInternal(on) { store((s) => (on ? s.setItem(FLAG, "1") : s.removeItem(FLAG))); }
const internal = store((s) => s.getItem(FLAG) === "1") === true;

const ok = /^G-[A-Z0-9]{4,}$/.test(GA_ID) && !internal;

// 화면 종류: home / list / content
const path = location.pathname;
export const PAGE_TYPE = /\/post\/?$/.test(path) ? "content" : /\/list\/?$/.test(path) ? "list" : "home";

if (ok) {
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("set", { page_type: PAGE_TYPE });
  window.gtag("config", GA_ID, { send_page_view: false });
}

// 이벤트 전송 (모든 이벤트에 page_type 포함)
export function track(name, params = {}) {
  if (!ok) return;
  window.gtag("event", name, { page_type: PAGE_TYPE, ...params });
}

// 페이지 조회 1회 전송 (글 상세는 제목을 불러온 뒤 호출)
export function pageView(extra = {}) {
  track("page_view", {
    page_title: document.title,
    page_location: location.href,
    ...extra,
  });
}

// 클릭 위치(click_location): data-loc 속성이 있으면 그 값, 없으면 화면 영역으로 판단
const LOC = [
  [".strip", "main_hero"],
  [".more", "related"],
  [".side", "side_menu"],
  ["#chips, .chips", "list_chip"],
  [".grid4, .idx", "list_grid"],
  [".lower", "main_grid"],
  ["header, .wsm-top, .top-logo", "header"],
  ["footer, .foot, .wsm-foot", "footer"],
];
function locOf(el) {
  const tagged = el.closest("[data-loc]");
  if (tagged) return tagged.dataset.loc;
  for (const [sel, name] of LOC) if (el.closest(sel)) return name;
  return "body";
}

// 글 클릭(select_content)·분류 클릭(select_category)을 한 함수로 처리
document.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest("a[href]");
  if (!a) return;
  let url;
  try { url = new URL(a.getAttribute("href"), location.href); } catch { return; }
  if (url.origin !== location.origin) return; // 외부 링크는 GA 자동 수집(click)
  const loc = locOf(a);
  if (/\/post\/?$/.test(url.pathname) && url.searchParams.get("id")) {
    track("select_content", { content_type: "post", item_id: url.searchParams.get("id"), click_location: loc });
  } else if (/\/list\/?$/.test(url.pathname) && !url.searchParams.get("search") && (loc === "side_menu" || loc === "list_chip")) {
    track("select_category", { category: url.searchParams.get("cat") || "all", click_location: loc });
  }
}, true);

// 읽은 정도(read_progress 25·50·75%)와 완독(post_read_complete): 화면 보임 감지로 각 1회
export function watchReading(bodyEl, endEl, params = {}) {
  if (!ok || !bodyEl || !("IntersectionObserver" in window)) return;
  if (getComputedStyle(bodyEl).position === "static") bodyEl.style.position = "relative";
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      io.unobserve(en.target);
      const pct = en.target.dataset.pct;
      if (pct) track("read_progress", { ...params, percent: Number(pct) });
      else track("post_read_complete", params);
    }
  });
  for (const pct of [25, 50, 75]) {
    const m = document.createElement("span");
    m.dataset.pct = pct;
    m.setAttribute("aria-hidden", "true");
    m.style.cssText = `position:absolute;left:0;top:${pct}%;width:1px;height:1px;pointer-events:none;`;
    bodyEl.appendChild(m);
    io.observe(m);
  }
  if (endEl) io.observe(endEl);
}

// 공유용 주소: 유입 경로 표시(UTM)를 붙인 주소
export function shareUrl(campaign) {
  const u = new URL(location.href);
  ["utm_source", "utm_medium", "utm_campaign", "internal"].forEach((k) => u.searchParams.delete(k));
  u.searchParams.set("utm_source", "copy_link");
  u.searchParams.set("utm_medium", "share");
  if (campaign) u.searchParams.set("utm_campaign", campaign);
  return u.toString();
}
