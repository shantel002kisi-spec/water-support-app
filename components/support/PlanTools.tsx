"use client";

import { useRef, useState } from "react";
import { Download, Plus, RotateCcw, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { backupSchema, downloadFile, taskSchema, validDate } from "@/lib/support-engine";
import type { SupportTask } from "@/types/support";

export function PlanTools({ tasks, ready, onAdd, onRestore, onClear, onDemo }: {
  tasks: SupportTask[]; ready: boolean; onAdd: () => void; onRestore: (tasks: SupportTask[]) => void; onClear: () => void; onDemo: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<"clear" | "demo" | "restore" | null>(null);
  const [pending, setPending] = useState<SupportTask[]>([]);
  async function restore(file?: File) {
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("Backup is too large (maximum 5 MB).");
      const data = backupSchema.parse(JSON.parse(await file.text()));
      if (new Set(data.tasks.map(task => task.id)).size !== data.tasks.length) throw new Error("Backup contains duplicate action IDs.");
      setPending(data.tasks); setConfirmation("restore"); setError("");
    } catch { setError("This backup could not be read. Choose a valid Water Support JSON backup under 5 MB."); }
    if (input.current) input.current.value = "";
  }
  const completed = tasks.filter(task => task.status === "completed").length;
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d8e2e8] bg-white p-4">
      <div className="min-w-0"><span className="text-xs font-bold uppercase tracking-wider text-[#006f7b]">Personal support workspace</span><p className="mt-1 text-sm text-[#607084]">{ready ? `${completed} of ${tasks.length} actions completed · stored on this device` : "Loading your plan…"}</p><progress className="mt-2 h-1.5 w-full max-w-xs accent-[#006f7b]" aria-label="Actions completed" value={completed} max={Math.max(1, tasks.length)} /></div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!ready} onClick={onAdd}><Plus className="size-4" /> Add action</Button>
        <Button disabled={!ready} variant="outline" onClick={() => downloadFile("water-support-backup.json", JSON.stringify({ version: 1, tasks }, null, 2), "application/json")}><Download className="size-4" /> Backup</Button>
        <Button disabled={!ready} variant="outline" onClick={() => input.current?.click()}><Upload className="size-4" /> Restore</Button>
        <Button disabled={!ready} variant="ghost" onClick={() => setConfirmation("demo")}><RotateCcw className="size-4" /> Demo</Button>
        <Button disabled={!ready} variant="ghost" onClick={() => setConfirmation("clear")} aria-label="Clear saved plan"><Trash2 className="size-4" /></Button>
      </div>
    </div>
    <p className="mt-2 text-xs leading-5 text-[#607084]">Independent portfolio app · no connection to your water account · export a backup before clearing browser data. Reminders appear in your plan; add a deadline to your calendar for alerts.</p>
    <input ref={input} className="sr-only" aria-label="Restore backup file" type="file" accept="application/json,.json" onChange={event => void restore(event.target.files?.[0])} />
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    <Dialog open={confirmation !== null} onOpenChange={open => !open && setConfirmation(null)}><DialogContent><DialogHeader><DialogTitle>Replace your current plan?</DialogTitle><DialogDescription>{confirmation === "clear" ? "This removes all saved actions from this browser." : confirmation === "demo" ? "This replaces your saved actions with fictional demonstration records." : `This replaces your saved plan with ${pending.length} actions from your backup.`} Export a backup first if you want to keep your current plan.</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setConfirmation(null)}>Cancel</Button><Button onClick={() => { if (confirmation === "clear") onClear(); else if (confirmation === "demo") onDemo(); else onRestore(pending); setConfirmation(null); }}>Replace plan</Button></div></DialogContent></Dialog>
  </>;
}

export function ActionEditor({ open, task, onClose, onSave }: { open: boolean; task: SupportTask | null; onClose: () => void; onSave: (task: SupportTask) => void }) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [organisation, setOrganisation] = useState(task?.organisation ?? "");
  const [customerId, setCustomerId] = useState(task?.customerId ?? "");
  const [summary, setSummary] = useState(task?.summary ?? "");
  const [nextStep, setNextStep] = useState(task?.nextStep ?? "");
  const [deadline, setDeadline] = useState(task?.deadline ?? "");
  const [status, setStatus] = useState<SupportTask["status"]>(task?.status ?? "action");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [reminder, setReminder] = useState(task?.reminder ?? true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState(task?.category ?? "");
  const [urgency, setUrgency] = useState<NonNullable<SupportTask["urgency"]>>(task?.urgency ?? "normal");
  const [resolution, setResolution] = useState(task?.resolution ?? "");
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (deadline && !validDate(deadline)) { setError("Choose a valid deadline, or leave it blank."); return; }
    const result = taskSchema.safeParse({ ...task, id: task?.id ?? crypto.randomUUID(), title: title.trim(), organisation: organisation.trim(), customerId: customerId.trim() || undefined, summary: summary.trim(), nextStep: nextStep.trim(), deadline: deadline || undefined, dueDate: deadline ? new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(new Date(`${deadline}T12:00:00`)) : undefined, dueLabel: undefined, status, notes, category: category || undefined, urgency, resolution, reminder: Boolean(deadline && reminder), createdAt: task?.createdAt ?? new Date().toISOString() });
    if (!result.success) { setError("Check the title, organisation, date and text lengths before saving."); return; }
    onSave(result.data);
  }
  return <Dialog open={open} onOpenChange={value => !value && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{task ? "Edit your action" : "Create an action"}</DialogTitle><DialogDescription>Keep the next step clear. Deadlines are optional and should match your letter.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4">
    <label className="block text-sm font-semibold">Action title<input required maxLength={240} className="form-input mt-1" value={title} onChange={event => setTitle(event.target.value)} /></label>
    <label className="block text-sm font-semibold">Organisation<input required maxLength={160} className="form-input mt-1" value={organisation} onChange={event => setOrganisation(event.target.value)} /></label>
    <label className="field-label">Customer ID / account reference (optional)<input className="form-input mt-1" maxLength={80} autoComplete="off" value={customerId} onChange={event => setCustomerId(event.target.value)} /><span className="mt-1 block text-xs font-normal">Used only to find records on this device.</span></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="field-label">Topic<select className="form-input mt-1" value={category} onChange={event => setCategory(event.target.value as typeof category)}><option value="">General correspondence</option><option value="billing">Billing</option><option value="service">Water & service</option><option value="accessibility">Extra support</option><option value="complaint">Complaint</option></select></label><label className="field-label">Priority<select className="form-input mt-1" value={urgency} onChange={event => setUrgency(event.target.value as typeof urgency)}><option value="normal">Normal</option><option value="soon">Soon</option><option value="urgent">Urgent</option></select></label></div>
    <label className="block text-sm font-semibold">What this means<textarea maxLength={20000} className="form-input mt-1" rows={3} value={summary} onChange={event => setSummary(event.target.value)} /></label>
    <label className="block text-sm font-semibold">Next step<textarea maxLength={2000} className="form-input mt-1" rows={2} value={nextStep} onChange={event => setNextStep(event.target.value)} /></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Deadline<input type="date" className="form-input mt-1" value={deadline} onChange={event => setDeadline(event.target.value)} /></label><label className="text-sm font-semibold">Status<select className="form-input mt-1" value={status} onChange={event => setStatus(event.target.value as SupportTask["status"])}><option value="action">Action needed</option><option value="waiting">Waiting</option><option value="completed">Completed</option></select></label></div>
    <label className="block text-sm font-semibold">My notes<textarea maxLength={10000} className="form-input mt-1" rows={3} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Keep track of calls, documents and progress" /></label>
    <label className="field-label">Outcome / resolution (optional)<textarea maxLength={4000} className="form-input mt-1" rows={2} value={resolution} onChange={event => setResolution(event.target.value)} placeholder="What resolved the issue, and what remains to do?" /></label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reminder} onChange={event => setReminder(event.target.checked)} /> Include a reminder when exporting to calendar</label>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit">Save action</Button></div>
  </form></DialogContent></Dialog>;
}
