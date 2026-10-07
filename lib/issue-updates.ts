import { z } from "zod";

export const bulletinSchema = z.object({ id: z.string().max(1500), title: z.string().min(1).max(500), url: z.string().url().refine(value => { const url = new URL(value); return url.protocol === "https:" && ["www.bbc.co.uk", "www.bbc.com", "bbc.co.uk", "bbc.com"].includes(url.hostname); }), publisher: z.literal("BBC News"), publishedAt: z.string().datetime().nullable() });
export type Bulletin = z.infer<typeof bulletinSchema>;
export const feedSchema = z.object({ checkedAt: z.string().datetime(), articles: z.array(bulletinSchema).max(150), failures: z.array(z.string().max(240)).max(5) });
export const watchSchema = z.object({ version: z.literal(1), watched: z.array(z.string().max(120)).max(500), seen: z.array(z.string().max(1500)).max(500), baseline: z.boolean().default(false), snapshots: z.record(z.string().max(10000)) });
export type WatchState = z.infer<typeof watchSchema>;
export const emptyWatch: WatchState = { version: 1, watched: [], seen: [], baseline: false, snapshots: {} };
function plainText(value: string) { return value.replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim(); }
export function parseNews(xml: string): Bulletin[] {
  const articles: Bulletin[] = [];
  for (const item of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const field = (name: string) => plainText(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i").exec(item[1])?.[1] ?? "");
    const date = Date.parse(field("pubDate")), url = field("link");
    const result = bulletinSchema.safeParse({ id: url, title: field("title"), url, publisher: "BBC News", publishedAt: Number.isNaN(date) ? null : new Date(date).toISOString() });
    if (result.success && !articles.some(article => article.id === url)) articles.push(result.data);
  }
  return articles.slice(0, 150);
}
const topicWords = {
  billing: /\b(water|utility|utilities|bill|bills|debt|affordability|cost of living|poverty)\b/i,
  service: /\b(water|sewage|sewer|flood|flooding|drought|pollution|river|rivers|leak|leaks)\b/i,
  accessibility: /\b(water|disability|disabled|accessibility|vulnerable|poverty)\b/i,
  complaint: /\b(water|sewage|ofwat|utility|utilities|bill|bills|pollution)\b/i,
};
export function relevantBulletins(articles: Bulletin[], category?: keyof typeof topicWords) { return articles.filter(article => (topicWords[category ?? "service"]).test(article.title)); }
type CaseSummary = { id: string; status: string; nextStep?: string; resolution?: string; deadline?: string; activity?: { id: string; at: string; kind: string; text: string }[] };
export function contactCount(task: CaseSummary) { return (task.activity ?? []).filter(item => ["call", "email", "webchat", "letter"].includes(item.kind)).length; }
export function caseSnapshot(task: CaseSummary) { const latest = task.activity?.at(-1); return JSON.stringify([task.status, task.nextStep ?? "", task.resolution ?? "", task.deadline ?? "", latest?.id ?? "", latest?.at ?? "", latest?.text ?? ""]); }
export function changedCases(tasks: CaseSummary[], state: WatchState) { return tasks.filter(task => state.watched.includes(task.id) && state.snapshots[task.id] !== undefined && state.snapshots[task.id] !== caseSnapshot(task)); }
export const officialIssueSources = [
  { title: "Official incidents and work in your area", url: "https://www.wessexwater.co.uk/emergencies", kind: "Provider incident updates — check your location" },
  { title: "Wessex Water news", url: "https://www.wessexwater.co.uk/news", kind: "Provider announcements — open the source" },
  { title: "Published performance reports and datasets", url: "https://corporate.wessexwater.co.uk/our-performance/open-data-schedule", kind: "Industry evidence — not a personal case update" },
] as const;
