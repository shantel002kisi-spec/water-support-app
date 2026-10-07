import test from "node:test";
import assert from "node:assert/strict";
import { parseNews, relevantBulletins, caseSnapshot, changedCases, contactCount, emptyWatch, watchSchema } from "../lib/issue-updates.ts";

const item = (link: string, title = "Water bills &amp; household debt", date = "Tue, 06 Oct 2026 10:00:00 GMT") => `<item><title><![CDATA[${title}]]></title><link>${link}</link><pubDate>${date}</pubDate></item>`;
test("RSS parser decodes headlines, deduplicates and rejects unsafe/untrusted links", () => {
  const url = "https://www.bbc.co.uk/news/articles/water";
  const items = parseNews(`<rss>${item(url)}${item(url)}${item("javascript:alert(1)")}${item("https://www.bbc.co.uk.evil.test/story")}${item("http://www.bbc.co.uk/story")}</rss>`);
  assert.equal(items.length, 1); assert.equal(items[0].title, "Water bills & household debt"); assert.equal(items[0].publishedAt, "2026-10-06T10:00:00.000Z");
});
test("missing publication dates are unknown and empty/malformed feeds remain empty", () => {
  assert.equal(parseNews(item("https://www.bbc.com/news/a", "Drought", "not a date"))[0].publishedAt, null);
  assert.deepEqual(parseNews("<html>Service unavailable</html>"), []);
});
test("topic matching excludes unrelated headlines and distinguishes billing from service", () => {
  const items = parseNews(item("https://www.bbc.co.uk/news/a", "Households face debt") + item("https://www.bbc.co.uk/news/b", "River pollution inquiry") + item("https://www.bbc.co.uk/news/c", "Football final"));
  assert.equal(relevantBulletins(items, "billing")[0].title, "Households face debt"); assert.equal(relevantBulletins(items, "service")[0].title, "River pollution inquiry");
});
test("repeat contacts count actual contact entries; watched case changes are deduplicated", () => {
  const task = { id: "a", status: "waiting", activity: [{ id: "1", at: "2026-10-06T10:00:00Z", kind: "call", text: "Asked for update" }, { id: "2", at: "2026-10-06T11:00:00Z", kind: "note", text: "Personal note" }, { id: "3", at: "2026-10-06T12:00:00Z", kind: "email", text: "Follow-up" }] };
  assert.equal(contactCount(task), 2);
  const state = { ...emptyWatch, watched: ["a"], snapshots: { a: caseSnapshot(task) } };
  assert.deepEqual(changedCases([task], state), []);
  assert.equal(changedCases([{ ...task, status: "completed" }], state).length, 1);
  assert.deepEqual(changedCases([{ ...task, id: "b", status: "completed" }], state), []);
  assert.equal(watchSchema.safeParse({ ...state, watched: [42] }).success, false);
});
