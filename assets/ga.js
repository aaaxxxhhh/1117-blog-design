// Google Analytics 4 (GA4) — 측정 ID 한 곳에서 관리
// 측정 ID는 GA 관리 > 데이터 스트림 > 웹 스트림 상세에서 확인 (형식: G-XXXXXXXXXX)
export const GA_ID = "G-XDP3GEVQXE";

const ok = /^G-[A-Z0-9]{4,}$/.test(GA_ID);

if (ok) {
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: false });
}

// 페이지 조회 1회 전송 (글 상세는 제목을 불러온 뒤 호출)
export function pageView(extra = {}) {
  if (!ok) return;
  window.gtag("event", "page_view", {
    page_title: document.title,
    page_location: location.href,
    page_path: location.pathname + location.search,
    ...extra,
  });
}

// 클릭 등 사용자 행동 이벤트
export function track(name, params = {}) {
  if (!ok) return;
  window.gtag("event", name, params);
}
