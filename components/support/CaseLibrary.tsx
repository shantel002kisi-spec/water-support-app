"use client";

import { useState } from "react";
import { ArrowUpRight, CheckCircle2, Clock3, GripVertical, LayoutGrid, List, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deadlineLabel, findCases, transitionCase } from "@/lib/support-engine";
import type { SupportTask, TaskStatus } from "@/types/support";

const columns: { status: TaskStatus; title: string; tone: string }[] = [{ status: "action", title: "Taking action", tone: "amber" }, { status: "waiting", title: "Waiting for a response", tone: "blue" }, { status: "completed", title: "Completed", tone: "mint" }];

export function CaseLibrary({ tasks, onSelect, onUpdate }: { tasks: SupportTask[]; onSelect: (task: SupportTask) => void; onUpdate: (task: SupportTask) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [category, setCategory] = useState("all");
  const [mode, setMode] = useState<"board" | "list">("board");
  const [sort, setSort] = useState("priority");
  const [dragTarget, setDragTarget] = useState<TaskStatus | null>(null);
  const [message, setMessage] = useState("");
  const sorted = findCases(tasks, { query, status: filter, category, sort });
  function move(task: SupportTask, status: TaskStatus) {
    if (task.status === status) return;
    const title = columns.find(column => column.status === status)!.title;
    onUpdate(transitionCase(task, status, crypto.randomUUID(), new Date().toISOString()));
    setMessage(`${task.title} moved to ${title.toLowerCase()}.`);
  }
  function drop(event: React.DragEvent, status: TaskStatus) {
    event.preventDefault(); setDragTarget(null);
    const task = tasks.find(item => item.id === event.dataTransfer.getData("application/x-water-support-case"));
    if (task) move(task, status);
  }
  function card(task: SupportTask) {
    const meta = columns.find(column => column.status === task.status)!;
    const due = task.deadline && task.status !== "completed" ? deadlineLabel(task.deadline) : "";
    const checked = task.checklist?.filter(item => item.done).length ?? 0;
    return <article key={task.id} className={`board-card ${mode === "list" ? "list-card" : ""}`} draggable onDragStart={event => { event.dataTransfer.setData("application/x-water-support-case", task.id); event.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => setDragTarget(null)}>
      <div className="flex items-center justify-between gap-3"><span className={`case-badge ${meta.tone}`}>{task.category ?? "Correspondence"}</span><GripVertical className="size-4 text-[#9cafaa]" aria-hidden="true" /></div>
      <button className="mt-4 block w-full text-left" onClick={() => onSelect(task)}><span className="text-xs text-[#6c8178]">{task.organisation}</span><h3 className="mt-1 text-[15px] font-bold leading-6">{task.title}</h3><p className="mt-2 line-clamp-2 text-xs leading-6 text-[#647b72]">{task.nextStep ?? task.summary}</p></button>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-[#62786e]">{due && <span className={`inline-flex items-center gap-1.5 ${due.includes("overdue") || due === "Due today" ? "font-bold text-[#a44435]" : ""}`}><Clock3 className="size-3" />{due}</span>}{task.checklist?.length ? <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3" />{checked}/{task.checklist.length}</span> : null}<span>{task.activity?.length ?? 0} updates</span></div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#e5eee8] pt-3"><select className="board-status" aria-label={`Status for ${task.title}`} value={task.status} onChange={event => move(task, event.target.value as TaskStatus)}>{columns.map(column => <option key={column.status} value={column.status}>{column.title}</option>)}</select><button className="complete-button" onClick={() => onSelect(task)} aria-label={`Open ${task.title}`}><ArrowUpRight className="size-4" /></button></div>
    </article>;
  }
  return <div className="workspace-page"><div className="page-heading"><div><p className="eyebrow">FROM FIRST LETTER TO RESOLUTION</p><h1>My letters and actions</h1><p>See where every case stands. Keep the next step within reach.</p></div><div className="view-toggle" aria-label="Case view"><button aria-pressed={mode === "board"} className={mode === "board" ? "selected" : ""} onClick={() => setMode("board")}><LayoutGrid className="size-4" /> Board</button><button aria-pressed={mode === "list"} className={mode === "list" ? "selected" : ""} onClick={() => setMode("list")}><List className="size-4" /> List</button></div></div>
    <div className="library-filters panel"><label className="search-field"><Search className="size-4" /><input type="search" aria-label="Search cases and conversations" placeholder="Search cases, notes or conversations…" value={query} onChange={event => setQuery(event.target.value)} /></label><select aria-label="Filter cases by status" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All statuses</option>{columns.map(column => <option key={column.status} value={column.status}>{column.title}</option>)}</select><select aria-label="Filter cases by topic" value={category} onChange={event => setCategory(event.target.value)}><option value="all">All topics</option><option value="billing">Billing</option><option value="service">Water & service</option><option value="accessibility">Extra support</option><option value="complaint">Complaints</option></select><select aria-label="Sort cases" value={sort} onChange={event => setSort(event.target.value)}><option value="priority">Priority first</option><option value="newest">Newest first</option><option value="title">Title A–Z</option></select></div>
    <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-[#647b72]"><span aria-live="polite">{sorted.length} matching {sorted.length === 1 ? "case" : "cases"}</span><span>Drag cards between columns, or use each card’s status menu.</span></div>
    {message && <p role="status" className="mt-3 rounded-xl bg-[#e5f5ec] p-3 text-sm text-[#26785f]">{message}</p>}
    {mode === "board" ? <div className="case-board mt-6">{columns.filter(column => filter === "all" || filter === column.status).map(column => { const items = sorted.filter(task => task.status === column.status); return <section key={column.status} className={`board-column ${dragTarget === column.status ? "drag-over" : ""}`} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDragTarget(column.status); }} onDrop={event => drop(event, column.status)}><div className="flex items-center justify-between gap-2 px-1 pb-4"><h2 className="flex items-center gap-2 text-sm font-bold"><span className={`size-2 rounded-full ${column.status === "action" ? "bg-[#ca9a52]" : column.status === "waiting" ? "bg-[#76a4c4]" : "bg-[#6daa88]"}`} />{column.title}</h2><span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#647b72]">{items.length}</span></div><div className="space-y-3">{items.length ? items.map(card) : <p className="board-empty">No cases here yet. Move an existing case here when its status changes.</p>}</div></section>; })}</div> : <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sorted.length ? sorted.map(card) : <div className="panel empty-state md:col-span-2 xl:col-span-3"><Search className="size-8 text-[#6daa88]" /><h3>No matching cases</h3><p>Try a different search or clear your filters.</p><Button variant="outline" onClick={() => { setQuery(""); setFilter("all"); setCategory("all"); }}>Clear filters</Button></div>}</div>}
  </div>;
}
