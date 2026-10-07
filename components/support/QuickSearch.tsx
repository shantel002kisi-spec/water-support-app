"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Bell, Clock3, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deadlineLabel } from "@/lib/support-engine";
import type { SupportTask } from "@/types/support";

export function QuickSearch({ tasks, onSelect }: { tasks: SupportTask[]; onSelect: (task: SupportTask) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const matches = tasks.filter(task => `${task.title} ${task.organisation} ${task.summary} ${task.notes ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(current => !current); } };
    window.addEventListener("keydown", shortcut); return () => window.removeEventListener("keydown", shortcut);
  }, []);
  return <><Button variant="ghost" className="rounded-xl" aria-label="Search your workspace, Control or Command K" onClick={() => setOpen(true)}><Search className="size-4" /><span className="hidden xl:inline text-[#647b72]">Search <kbd className="ml-2 rounded border px-1.5 py-0.5 text-[10px]">⌘ / Ctrl K</kbd></span></Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-xl" onOpenAutoFocus={event => { event.preventDefault(); input.current?.focus(); }}><DialogHeader><DialogTitle>Find your next step</DialogTitle><DialogDescription>Search your letters, actions, organisations and notes.</DialogDescription></DialogHeader><label className="search-field rounded-xl border p-3"><Search className="size-4" /><input ref={input} aria-label="Search workspace" type="search" placeholder="What are you looking for?" value={query} onChange={event => setQuery(event.target.value)} /></label><div className="max-h-80 space-y-2 overflow-y-auto">{matches.slice(0, 30).map(task => <button className="planner-row" key={task.id} onClick={() => { setOpen(false); onSelect(task); }}><span><strong>{task.title}</strong><small>{task.organisation} · {task.status === "action" ? "To do" : task.status === "waiting" ? "Waiting" : "Completed"}</small></span><ArrowUpRight className="size-4" /></button>)}{!matches.length && <p className="p-6 text-center text-sm text-[#647b72]">No matching records. Try another word.</p>}</div><p aria-live="polite" className="text-xs text-[#647b72]">{matches.length} results{matches.length > 30 ? " · first 30 shown; narrow your search" : ""}</p></DialogContent></Dialog></>;
}

export function ReminderInbox({ tasks, onSelect }: { tasks: SupportTask[]; onSelect: (task: SupportTask) => void }) {
  const [open, setOpen] = useState(false);
  const threshold = new Date(); threshold.setDate(threshold.getDate() + 7);
  const end = `${threshold.getFullYear()}-${String(threshold.getMonth() + 1).padStart(2, "0")}-${String(threshold.getDate()).padStart(2, "0")}`;
  const due = tasks.filter(task => task.status !== "completed" && task.deadline && task.deadline <= end).sort((a, b) => a.deadline!.localeCompare(b.deadline!));
  return <><Button variant="ghost" className="relative rounded-xl" aria-label={`${due.length} actions due or overdue within seven days`} onClick={() => setOpen(true)}><Bell className="size-4" />{due.length > 0 && <span className="absolute right-1 top-0 grid min-w-3.5 place-items-center rounded-full bg-[#b76a43] px-1 text-[9px] font-bold text-white">{due.length}</span>}</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>On your radar</DialogTitle><DialogDescription>Overdue actions and dates in the next seven days. These are dates from your personal plan, not live provider updates.</DialogDescription></DialogHeader><div className="max-h-80 space-y-3 overflow-y-auto">{due.length ? due.map(task => <button key={task.id} className="planner-row" onClick={() => { setOpen(false); onSelect(task); }}><span><strong>{task.title}</strong><small className="flex items-center gap-1"><Clock3 className="size-3" />{deadlineLabel(task.deadline!)} · {task.status === "waiting" ? "Follow-up" : "Action"}</small></span><ArrowUpRight className="size-4" /></button>) : <div className="empty-state"><Bell className="size-8 text-[#6daa88]" /><h3>A little breathing room</h3><p>No deadlines recorded for the next seven days.</p></div>}</div><p className="text-xs leading-5 text-[#647b72]">For alerts outside this app, export a dated action to your calendar and import its reminder.</p></DialogContent></Dialog></>;
}
