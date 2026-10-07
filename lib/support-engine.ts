import { z } from "zod";

export const taskSchema = z.object({
  id: z.string().min(1).max(120), title: z.string().min(1).max(240),
  organisation: z.string().min(1).max(160), status: z.enum(["action", "waiting", "completed"]),
  customerId: z.string().trim().min(1).max(80).optional(),
  urgency: z.enum(["urgent", "soon", "normal"]).optional(),
  dueLabel: z.string().optional(), dueDate: z.string().optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(validDate).optional(),
  summary: z.string().max(20000), nextStep: z.string().max(2000).optional(),
  documents: z.array(z.string()).max(30).optional(), reminder: z.boolean().optional(),
  notes: z.string().max(10000).optional(), sourceText: z.string().max(100000).optional(),
  createdAt: z.string().optional(),
  category: z.enum(["billing", "service", "accessibility", "complaint"]).optional(),
  resolution: z.string().max(4000).optional(),
  checklist: z.array(z.object({ id: z.string().min(1).max(120), title: z.string().min(1).max(240), done: z.boolean() })).max(30).optional(),
  activity: z.array(z.object({ id: z.string().min(1).max(120), at: z.string().datetime(), kind: z.enum(["note", "call", "email", "webchat", "letter", "status"]), text: z.string().min(1).max(4000) })).max(200).optional(),
}).superRefine((task, context) => {
  for (const field of ["checklist", "activity"] as const) {
    const entries = task[field] ?? [];
    if (new Set(entries.map(entry => entry.id)).size !== entries.length) context.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: "Record IDs must be unique." });
  }
});
export const backupSchema = z.object({ version: z.literal(1), tasks: z.array(taskSchema).max(500) }).superRefine((value, context) => {
  if (new Set(value.tasks.map(task => task.id)).size !== value.tasks.length) context.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate action IDs are not allowed.", path: ["tasks"] });
});
export function validDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function deadlineLabel(value: string, now = new Date()) {
  if (!validDate(value)) return "Check deadline";
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(`${value}T00:00:00`);
  const days = Math.round((target.getTime() - today.getTime()) / 86400000);
  return days < 0 ? `${Math.abs(days)} ${days === -1 ? "day" : "days"} overdue` : days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : `Due in ${days} days`;
}
/** Conservative, explainable extraction: never invent missing details. */
export function extractLetter(text: string) {
  const lines = text.split(/\n/).map(line => line.trim()).filter(Boolean);
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const candidates: { date: string; context: string }[] = [];
  for (const match of text.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/gi)) {
    candidates.push({ date: `${match[3]}-${String(months.indexOf(match[2].toLowerCase()) + 1).padStart(2, "0")}-${match[1].padStart(2, "0")}`, context: text.slice(Math.max(0, match.index! - 90), match.index! + match[0].length) });
  }
  for (const match of text.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)) candidates.push({ date: match[1], context: text.slice(Math.max(0, match.index! - 90), match.index! + 10) });
  for (const match of text.matchAll(/\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/g)) candidates.push({ date: `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`, context: text.slice(Math.max(0, match.index! - 90), match.index! + match[0].length) });
  const deadline = candidates.find(item => validDate(item.date) && /deadline|closing|by\b|before|due|appointment/i.test(item.context))?.date ?? "";
  const action = lines.find(line => /\b(please|must|apply|submit|upload|provide|send|call|pay|complete)\b/i.test(line)) ?? "Review this letter and choose your next step";
  const organisation = lines.find(line => /water|council|housing|energy|foundation/i.test(line))?.slice(0, 160) ?? "";
  return { organisation, title: action.slice(0, 240), deadline, summary: lines.slice(0, 5).join(" ").slice(0, 2000), nextStep: action, sourceText: text };
}
export function calendarEvent(task: { id: string; title: string; summary: string; deadline?: string; reminder?: boolean }) {
  if (!task.deadline || !validDate(task.deadline)) throw new Error("A valid deadline is required.");
  const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
  const next = new Date(`${task.deadline}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Water Support//EN", "BEGIN:VEVENT", `UID:${escape(task.id)}@water-support.local`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`, `DTSTART;VALUE=DATE:${task.deadline.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, "")}`, `SUMMARY:${escape(task.title)}`, `DESCRIPTION:${escape(task.summary)}`];
  if (task.reminder) lines.push("BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:Support action due tomorrow", "END:VALARM");
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(line => { const chars = Array.from(line); let row = "", result = ""; for (const char of chars) { if (new TextEncoder().encode(row + char).length > 73) { result += row + "\r\n"; row = " "; } row += char; } return result + row; }).join("\r\n") + "\r\n";
}
export function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function caseReport(task: z.infer<typeof taskSchema>) {
  return ["WATER SUPPORT — PERSONAL CASE RECORD", `Case: ${task.title}`, `Organisation: ${task.organisation}`, `Status: ${task.status}`, `Next date: ${task.deadline ?? "Not set"}`, "", "SUMMARY", task.summary, "", "NEXT STEP", task.nextStep ?? "Not set", "", "RECORDED OUTCOME", task.resolution ?? "Not recorded", "", "CHECKLIST", ...(task.checklist ?? []).map(item => `${item.done ? "[x]" : "[ ]"} ${item.title}`), "", "MY NOTES", task.notes ?? "None", "", "CONTACT & ACTIVITY HISTORY", ...(task.activity ?? []).map(item => `${item.at} | ${item.kind}\n${item.text}\n`), "", "ORIGINAL LETTER / DRAFT", task.sourceText ?? "None", "", "This is a personal record. It does not confirm receipt by a provider."].join("\n");
}

export function findCustomerRecords<T extends { customerId?: string }>(tasks: T[], reference: string) {
  const normalised = reference.trim().toUpperCase();
  return normalised ? tasks.filter(task => task.customerId?.trim().toUpperCase() === normalised) : [];
}

export function priorityTasks<T extends { status: string; deadline?: string; urgency?: string }>(tasks: T[], now = new Date()) {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return [...tasks].filter(task => task.status !== "completed").sort((a, b) => {
    const score = (task: T) => task.deadline && task.deadline <= today ? 0 : task.urgency === "urgent" ? 1 : 2;
    return score(a) - score(b) || (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999");
  });
}

type Case = z.infer<typeof taskSchema>;
export function findCases(tasks: Case[], options: { query?: string; status?: string; category?: string; sort?: string } = {}) {
  const query = (options.query ?? "").trim().toLowerCase();
  const filtered = tasks.filter(task => (!options.status || options.status === "all" || task.status === options.status) && (!options.category || options.category === "all" || task.category === options.category) && `${task.title} ${task.organisation} ${task.summary} ${task.notes ?? ""} ${(task.activity ?? []).map(item => item.text).join(" ")}`.toLowerCase().includes(query));
  return options.sort === "title" ? [...filtered].sort((a, b) => a.title.localeCompare(b.title)) : options.sort === "newest" ? [...filtered].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")) : [...priorityTasks(filtered), ...filtered.filter(task => task.status === "completed")];
}

export function transitionCase(task: Case, status: Case["status"], eventId: string, at: string) {
  if (task.status === status) return task;
  const label = { action: "taking action", waiting: "waiting for a response", completed: "completed" }[status];
  return taskSchema.parse({ ...task, status, activity: (task.activity?.length ?? 0) < 200 ? [...(task.activity ?? []), { id: eventId, at, kind: "status", text: `Moved to ${label} in your personal case board.` }] : task.activity });
}
