"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { caseSnapshot, changedCases, contactCount, emptyWatch, feedSchema, officialIssueSources, relevantBulletins, watchSchema, type WatchState } from "@/lib/issue-updates";
import { downloadFile } from "@/lib/support-engine";
import type { SupportTask } from "@/types/support";

export function IssueUpdates({ tasks, onSelect }: { tasks: SupportTask[]; onSelect: (task: SupportTask) => void }) {
  const [open, setOpen] = useState(false), [selected, setSelected] = useState("");
  const [watch, setWatch] = useState<WatchState>(emptyWatch), [ready, setReady] = useState(false);
  const [feed, setFeed] = useState<ReturnType<typeof feedSchema.parse> | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [notice, setNotice] = useState(""), [recovery, setRecovery] = useState("");
  const [storageBlocked, setStorageBlocked] = useState(false);
  const watchRef = useRef(watch), tasksRef = useRef(tasks), blocked = useRef(false), controller = useRef<AbortController | null>(null);
  useEffect(() => { watchRef.current = watch; tasksRef.current = tasks; }, [watch, tasks]);
  useEffect(() => {
    let raw: string | null = null;
    try { raw = localStorage.getItem("water-issue-watch-v1"); if (raw) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWatch(watchSchema.parse(JSON.parse(raw)));
    } } catch { blocked.current = true; setStorageBlocked(true); setRecovery(raw ?? ""); setError("Update preferences could not be read. Existing storage is preserved; use recovery export and reset below."); }
    setReady(true);
    return () => controller.current?.abort();
  }, []);
  useEffect(() => { if (ready && !blocked.current) { try { localStorage.setItem("water-issue-watch-v1", JSON.stringify(watch)); } catch {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError("Update preferences could not be saved. They apply only to this session.");
  } } }, [watch, ready]);
  useEffect(() => {
    if (!ready || blocked.current) return;
    const changes = changedCases(tasks, watchRef.current);
    const next = Object.fromEntries(tasks.filter(task => watchRef.current.watched.includes(task.id)).map(task => [task.id, caseSnapshot(task)]));
    if (JSON.stringify(next) !== JSON.stringify(watchRef.current.snapshots)) {
      setWatch(current => ({ ...current, snapshots: next }));
      if (changes.length) setNotice(`${changes.length} watched case${changes.length === 1 ? " has" : "s have"} changed in your personal record. Open the update centre for the latest next step.`);
    }
  }, [tasks, ready, watch.watched]);
  const checkNews = useCallback(async () => {
    if (controller.current) return;
    const abort = new AbortController(); controller.current = abort; setBusy(true);
    const timer = setTimeout(() => abort.abort(), 15000);
    try {
      const response = await fetch("/api/issue-news", { signal: abort.signal });
      if (!response.ok) throw new Error(); const result = feedSchema.parse(await response.json()); if (!result.articles.length && result.failures.length) throw new Error(); setFeed(result);
      if (result.failures.length) setError(`${result.failures.join("; ")}. Available items may be incomplete. Use official links below.`); else if (!blocked.current) setError("");
      const current = watchRef.current;
      const watched = tasksRef.current.filter(task => current.watched.includes(task.id));
      const relevant = [...new Map(watched.flatMap(task => relevantBulletins(result.articles, task.category)).map(article => [article.id, article])).values()];
      const fresh = relevant.filter(article => !current.seen.includes(article.id));
      if (fresh.length && current.baseline) setNotice(`${fresh.length} public news item${fresh.length === 1 ? " is" : "s are"} new to your watched topics. These are background reports, not confirmed action on your case.`);
      setWatch(state => ({ ...state, baseline: true, seen: [...new Set([...state.seen, ...relevant.map(article => article.id)])].slice(-500) }));
    } catch { if (!blocked.current) setError("Public news could not be checked. Any previous items are retained; use the official sources below. Your case status has not changed."); }
    finally { clearTimeout(timer); controller.current = null; setBusy(false); }
  }, []);
  const enabled = ready && watch.watched.length > 0;
  useEffect(() => {
    if (!enabled) return;
    const first = setTimeout(() => { if (document.visibilityState === "visible") void checkNews(); }, 0);
    const interval = setInterval(() => { if (document.visibilityState === "visible") void checkNews(); }, 15 * 60 * 1000);
    const resume = () => { if (document.visibilityState === "visible") void checkNews(); };
    document.addEventListener("visibilitychange", resume);
    return () => { clearTimeout(first); clearInterval(interval); document.removeEventListener("visibilitychange", resume); };
  }, [enabled, checkNews]);
  const task = tasks.find(item => item.id === selected) ?? tasks.find(item => item.status !== "completed") ?? tasks[0];
  const related = task && feed ? relevantBulletins(feed.articles, task.category) : [];
  const repeat = tasks.filter(item => item.status !== "completed" && contactCount(item) >= 2);
  function toggleWatch(task: SupportTask) {
    setWatch(current => current.watched.includes(task.id) ? { ...current, watched: current.watched.filter(id => id !== task.id) } : { ...current, watched: [...current.watched, task.id].slice(-500), snapshots: { ...current.snapshots, [task.id]: caseSnapshot(task) } });
  }
  return <>
    <section className="mx-auto max-w-6xl px-5 pb-5 md:px-8 lg:px-10"><button className="water-lab-link w-full text-left" onClick={() => setOpen(true)}><span className="stat-icon blue"><BellRing className="size-5" /></span><span><strong>Stay informed about your issue</strong><small>{repeat.length ? `${repeat.length} ongoing case(s) with repeat contacts — see the latest recorded position.` : "Your case progress, public news and official report links in one place."}</small></span><span className="text-xs font-bold">{watch.watched.length} watched</span></button></section>
    {notice && <aside role="status" className="fixed bottom-24 right-4 z-40 max-w-sm rounded-2xl border border-[#c8ded6] bg-white p-5 shadow-xl lg:bottom-6"><strong className="text-sm">Issue update</strong><p className="mt-2 text-sm leading-6">{notice}</p><div className="mt-3 flex gap-2"><Button size="sm" onClick={() => { setNotice(""); setOpen(true); }}>View updates</Button><Button size="sm" variant="outline" onClick={() => setNotice("")}>Dismiss</Button></div></aside>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Your issue update centre</DialogTitle><DialogDescription>Keep the latest recorded next step in view. Public reporting provides context; it cannot verify your individual case or a repair completion.</DialogDescription></DialogHeader>
      {error && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
      {storageBlocked && <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => downloadFile("issue-watch-recovery.json", recovery, "application/json")}>Export recovery</Button><Button variant="outline" onClick={() => { if (window.confirm("Reset update preferences? Export the original recovery data first if needed.")) { blocked.current = false; setStorageBlocked(false); setWatch(emptyWatch); setError(""); setRecovery(""); } }}>Reset preferences</Button></div>}
      {task ? <><label className="field-label">Choose a case<select className="form-input mt-2" value={task.id} onChange={event => setSelected(event.target.value)}>{tasks.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <section className="rounded-2xl bg-[#edf7f2] p-4"><p className="eyebrow">PERSONAL RECORD · NOT PROVIDER-VERIFIED</p><h3 className="mt-2 font-bold">{task.title}</h3><p className="mt-2 text-sm"><strong>Status:</strong> {task.status === "action" ? "Action needed" : task.status === "waiting" ? "Awaiting a response" : "Completed in your record"}</p><p className="mt-2 text-sm"><strong>Next step:</strong> {task.nextStep || "No next step recorded. Ask the provider for an agreed action and response date."}</p>{task.resolution && <p className="mt-2 text-sm"><strong>Recorded outcome:</strong> {task.resolution}</p>}<p className="mt-2 text-sm">{contactCount(task)} recorded contacts · {task.deadline ? `Next check-in: ${task.deadline}` : "No check-in date recorded"}</p>{task.activity?.length ? <p className="mt-3 whitespace-pre-wrap text-sm"><strong>Latest log entry:</strong> {task.activity.at(-1)?.text}</p> : <p className="mt-3 text-sm">No contact log yet. No provider action has been verified by this app.</p>}<div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => { setOpen(false); onSelect(task); }}>Open case & record an update</Button><Button size="sm" disabled={!ready || storageBlocked} aria-pressed={watch.watched.includes(task.id)} onClick={() => toggleWatch(task)}>{watch.watched.includes(task.id) ? "Stop watching" : "Watch this issue"}</Button></div></section>
      </> : <p className="text-sm">Add a case first to watch its progress.</p>}
      <p className="text-xs leading-5 text-[#526975]">Watching checks public news every 15 minutes while this tab is visible and on return. New-item notices are deduplicated; the first check establishes a baseline. Checks stop when no cases are watched. No background push, email or SMS. Case details are never sent to news sources.</p>
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">Related public news · topic match only</h3><Button size="sm" variant="outline" disabled={busy} onClick={() => void checkNews()}><RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />{busy ? "Checking…" : "Check public news"}</Button></div>
      <p className="text-xs text-[#526975]">{feed ? `Last source check: ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(feed.checkedAt))}.` : "News has not been checked yet."} Matching uses broad topic words, not location or account data. Sources may discuss other providers or places.</p>
      <div className="space-y-3">{related.slice(0, 8).map(article => <article key={article.id} className="rounded-xl border p-3"><a href={article.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#187b69] underline">{article.title} ↗</a><p className="mt-2 text-xs text-[#526975]">{article.publisher} · {article.publishedAt ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(article.publishedAt)) : "Publication date unavailable"} · Public context, relevance unverified</p></article>)}{feed && !related.length && <p className="rounded-xl bg-[#f4f8f7] p-3 text-sm">No matching articles found in the available feeds. This does not mean the issue is resolved or that no work is happening.</p>}</div>
      <h3 className="font-bold">Official incident information & reports</h3><div className="space-y-2">{officialIssueSources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="block rounded-xl border p-3"><strong className="text-sm text-[#187b69]">{source.title} ↗</strong><small className="mt-1 block text-[#526975]">{source.kind}</small></a>)}</div><p className="text-xs leading-5 text-[#526975]">These links are for Wessex Water; confirm your actual supplier. For an urgent or worsening problem, contact the provider directly rather than waiting for an app update.</p>
    </DialogContent></Dialog>
  </>;
}
