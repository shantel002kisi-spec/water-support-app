import { parseNews } from "../lib/issue-updates.ts";
try {
  const response = await fetch("https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", { signal: AbortSignal.timeout(15000), redirect: "error" });
  const xml = await response.text(); const articles = parseNews(xml);
  console.log(JSON.stringify({ status: response.status, bytes: xml.length, articles: articles.length }));
  if (!response.ok || !articles.length) process.exitCode = 1;
} catch (error) { console.log(error.message, error.cause?.message); process.exitCode = 1; }
