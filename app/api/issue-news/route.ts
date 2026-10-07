import { parseNews, type Bulletin } from "@/lib/issue-updates";

const feeds = ["https://feeds.bbci.co.uk/news/uk/rss.xml", "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml"];
let cached: { checkedAt: string; articles: Bulletin[]; failures: string[] } | undefined;
let pending: Promise<NonNullable<typeof cached>> | undefined;
const interval = 15 * 60 * 1000;
async function load() {
  const results = await Promise.allSettled(feeds.map(async url => {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: "manual", headers: { Accept: "application/rss+xml, application/xml" } });
    if (!response.ok || !response.body) throw new Error("Source unavailable");
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let xml = "", bytes = 0;
    try { while (true) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.byteLength; if (bytes > 1000000) throw new Error("Source too large"); xml += decoder.decode(chunk.value, { stream: true }); } } finally { await reader.cancel(); }
    xml += decoder.decode(); const articles = parseNews(xml); if (!articles.length) throw new Error("Unreadable source"); return articles;
  }));
  const articles = new Map<string, Bulletin>(); const failures: string[] = [];
  results.forEach((result, index) => { if (result.status === "fulfilled") result.value.forEach(article => articles.set(article.id, article)); else { console.warn("Public-news source unavailable", index, result.reason instanceof Error ? result.reason.message : "Fetch failed"); failures.push(index === 0 ? "BBC UK feed unavailable" : "BBC science and environment feed unavailable"); } });
  return { checkedAt: new Date().toISOString(), articles: [...articles.values()].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")).slice(0, 150), failures };
}
export async function GET() {
  if (!cached || Date.now() - Date.parse(cached.checkedAt) >= (cached.failures.length ? 60000 : interval)) {
    pending ??= load().finally(() => { pending = undefined; });
    cached = await pending;
  }
  return Response.json(cached, { headers: { "Cache-Control": "public, max-age=60" } });
}
