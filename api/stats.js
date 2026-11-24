// F3 방문 통계: GA4에서 기간별 사용자·조회수·세션, 일별 추이, 유입 경로·인기 글 상위 5, 최근 30분 실시간 사용자
import { adminHandler } from "./_lib/http.js";
import { gaPost, rowsOf } from "./_lib/ga.js";

export function statsRequests(days) {
  const dateRanges = [{ startDate: `${days - 1}daysAgo`, endDate: "today" }];
  const top = (dim, metric) => ({ dateRanges, dimensions: [{ name: dim }], metrics: [{ name: metric }], orderBys: [{ metric: { metricName: metric }, desc: true }], limit: 5 });
  return [
    { dateRanges, metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }, { name: "sessions" }] },
    { dateRanges, dimensions: [{ name: "date" }], metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }], orderBys: [{ dimension: { dimensionName: "date" } }] },
    top("sessionSourceMedium", "sessions"),
    { ...top("pageTitle", "screenPageViews"), dimensions: [{ name: "pageTitle" }, { name: "pagePath" }] },
    top("sessionCampaignName", "sessions"),
  ];
}

export default adminHandler("GET", async (req, res) => {
  const days = [7, 28, 90].includes(Number(req.query?.days)) ? Number(req.query.days) : 7;
  const [batch, rt] = await Promise.all([
    gaPost("batchRunReports", { requests: statsRequests(days) }),
    gaPost("runRealtimeReport", { metrics: [{ name: "activeUsers" }] }).catch(() => null),
  ]);
  const [tot, daily, sources, pages, campaigns] = (batch.reports || []).map(rowsOf);
  return res.status(200).json({
    ok: true, days,
    totals: tot?.[0] || { activeUsers: 0, screenPageViews: 0, sessions: 0 },
    daily: daily || [], sources: sources || [], pages: pages || [],
    campaigns: (campaigns || []).filter((c) => c.sessionCampaignName && !c.sessionCampaignName.startsWith("(")),
    realtime: rt ? rowsOf(rt)[0]?.activeUsers ?? 0 : null,
    fetchedAt: new Date().toISOString(),
  });
});
