import test from "node:test";
import assert from "node:assert/strict";
import { backupSchema, calendarEvent, caseReport, deadlineLabel, extractLetter, findCases, priorityTasks, taskSchema, transitionCase, validDate } from "../lib/support-engine.ts";

test("extracts an action and deadline without confusing the letter date", () => {
  const result = extractLetter("Wessex Water\nLetter dated 1 October 2026\nPlease upload your income evidence by 19 October 2026.");
  assert.equal(result.deadline, "2026-10-19");
  assert.equal(result.organisation, "Wessex Water");
  assert.match(result.title, /upload/);
});
test("does not invent a deadline or organisation", () => {
  const result = extractLetter("Dear customer\nThank you for your recent correspondence.");
  assert.equal(result.deadline, ""); assert.equal(result.organisation, "");
});
test("recognises UK numeric deadlines", () => assert.equal(extractLetter("Please respond before 21/11/2026").deadline, "2026-11-21"));
test("recognises ISO deadlines", () => assert.equal(extractLetter("Closing date: 2026-11-21").deadline, "2026-11-21"));
test("rejects impossible and invalid dates", () => {
  assert.equal(validDate("2026-02-30"), false); assert.equal(validDate(""), false);
  assert.equal(validDate("2028-02-29"), true);
  assert.equal(extractLetter("Please send this by 31 February 2026").deadline, "");
});
test("deadline labels distinguish overdue, today and tomorrow", () => {
  const now = new Date(2026, 9, 6, 14);
  assert.equal(deadlineLabel("2026-10-05", now), "1 day overdue");
  assert.equal(deadlineLabel("2026-10-06", now), "Due today");
  assert.equal(deadlineLabel("2026-10-07", now), "Due tomorrow");
  assert.equal(deadlineLabel("2026-10-09", now), "Due in 3 days");
});
test("calendar event escapes text and ends on the next date", () => {
  const event = calendarEvent({ id: "test", title: "Call; send, check\nletter", summary: "Hello", deadline: "2026-12-31", reminder: true });
  assert.match(event, /DTSTART;VALUE=DATE:20261231/); assert.match(event, /DTEND;VALUE=DATE:20270101/);
  assert.ok(event.includes("SUMMARY:Call\\; send\\, check\\nletter")); assert.match(event, /BEGIN:VALARM/);
});
test("calendar event rejects missing deadlines", () => assert.throws(() => calendarEvent({ id: "test", title: "Test", summary: "" })));
test("calendar lines respect octet folding for Unicode", () => {
  const event = calendarEvent({ id: "test", title: "£".repeat(200), summary: "", deadline: "2026-11-01" });
  assert.ok(event.split("\r\n").every(line => Buffer.byteLength(line) <= 75));
});
test("backup validates statuses and dates", () => {
  const task = { id: "a", title: "Call", organisation: "Water", status: "action", summary: "Call support", deadline: "2026-10-20" };
  assert.equal(backupSchema.parse({ version: 1, tasks: [task] }).tasks.length, 1);
  assert.equal(backupSchema.safeParse({ version: 2, tasks: [task] }).success, false);
  assert.equal(backupSchema.safeParse({ version: 1, tasks: [{ ...task, status: "unknown" }] }).success, false);
  assert.equal(backupSchema.safeParse({ version: 1, tasks: [{ ...task, deadline: "2026-02-30" }] }).success, false);
});

test("backup round-trip preserves a case checklist and contact history", () => {
  const task = { id: "case", title: "Review bill", organisation: "Water", status: "waiting", summary: "Asked for clarification", category: "billing", checklist: [{ id: "contact", title: "Contact support", done: true }], activity: [{ id: "event", at: "2026-10-06T10:00:00.000Z", kind: "call", text: "Agreed to send a written explanation." }] };
  const parsed = backupSchema.parse(JSON.parse(JSON.stringify({ version: 1, tasks: [task] })));
  assert.deepEqual(parsed.tasks[0].checklist, task.checklist);
  assert.deepEqual(parsed.tasks[0].activity, task.activity);
});
test("backup rejects duplicate identities", () => {
  const task = { id: "same", title: "Call", organisation: "Water", status: "action", summary: "" };
  assert.equal(backupSchema.safeParse({ version: 1, tasks: [task, task] }).success, false);
});
test("contact records reject invalid timestamps and oversized notes", () => {
  const task = { id: "case", title: "Call", organisation: "Water", status: "action", summary: "", activity: [{ id: "a", at: "not-a-date", kind: "call", text: "Contacted support" }] };
  assert.equal(taskSchema.safeParse(task).success, false);
  assert.equal(taskSchema.safeParse({ ...task, activity: [{ ...task.activity[0], at: "2026-10-06T10:00:00.000Z", text: "x".repeat(4001) }] }).success, false);
});
test("priority ranks overdue follow-ups ahead of urgent future tasks", () => {
  const tasks = [{ id: "later", status: "action", deadline: "2026-10-10", urgency: "urgent" }, { id: "complete", status: "completed", deadline: "2026-10-01" }, { id: "overdue", status: "waiting", deadline: "2026-10-05" }];
  assert.deepEqual(priorityTasks(tasks, new Date(2026, 9, 6)).map(task => task.id), ["overdue", "later"]);
  assert.equal(tasks[0].id, "later", "Sorting must not mutate the original collection");
});
test("case report includes conversations, checklist and local-only scope", () => {
  const report = caseReport({ id: "a", title: "Explain bill", organisation: "Water", status: "waiting", summary: "A question", deadline: "2026-10-20", checklist: [{ id: "check", title: "Read bill", done: true }], activity: [{ id: "call", at: "2026-10-06T10:00:00.000Z", kind: "call", text: "Asked for a response" }] });
  assert.match(report, /\[x\] Read bill/); assert.match(report, /Asked for a response/); assert.match(report, /does not confirm receipt/); assert.match(report, /2026-10-20/);
});

test("case search finds conversation text and respects topic/status filters", () => {
  const task = taskSchema.parse({ id: "a", title: "Bill question", organisation: "Water", status: "waiting", category: "billing", summary: "", activity: [{ id: "e", at: "2026-10-06T10:00:00.000Z", kind: "call", text: "Asked for an itemised explanation" }] });
  assert.equal(findCases([task], { query: " ITEMISED ", status: "waiting", category: "billing" }).length, 1);
  assert.equal(findCases([task], { query: "itemised", category: "service" }).length, 0);
  assert.equal(findCases([task], { status: "completed" }).length, 0);
});
test("board transitions preserve case content, log once and do not mutate input", () => {
  const task = taskSchema.parse({ id: "a", title: "Question", organisation: "Water", status: "action", summary: "Details", notes: "Keep these notes", deadline: "2026-10-20" });
  const moved = transitionCase(task, "waiting", "event", "2026-10-06T10:00:00.000Z");
  assert.equal(moved.status, "waiting"); assert.equal(moved.notes, task.notes); assert.equal(moved.deadline, task.deadline); assert.equal(task.status, "action");
  assert.equal(moved.activity?.length, 1); assert.equal(transitionCase(moved, "waiting", "ignored", "2026-10-06T10:01:00.000Z"), moved);
});
test("backup rejects duplicate checklist and activity IDs", () => {
  const step = { id: "same", title: "Check bill", done: false };
  const task = { id: "a", title: "Question", organisation: "Water", status: "action", summary: "" };
  assert.equal(taskSchema.safeParse({ ...task, checklist: [step, step] }).success, false);
  const event = { id: "same", at: "2026-10-06T10:00:00.000Z", kind: "call", text: "Called" };
  assert.equal(taskSchema.safeParse({ ...task, activity: [event, event] }).success, false);
});
