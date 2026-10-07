import test from "node:test";
import assert from "node:assert/strict";
import { backupSchema, findCustomerRecords } from "../lib/support-engine.ts";

test("local customer lookup uses the whole reference and does not reveal other records", () => {
  const tasks = [{ id: "a", customerId: " WW-001 " }, { id: "b", customerId: "WW-002" }, { id: "c" }];
  assert.deepEqual(findCustomerRecords(tasks, "ww-001"), [tasks[0]]);
  assert.deepEqual(findCustomerRecords(tasks, "001"), []);
  assert.deepEqual(findCustomerRecords(tasks, ""), []);
  assert.deepEqual(findCustomerRecords(tasks, "unknown"), []);
});
test("customer reference survives backup and restore and oversized references are rejected", () => {
  const task = { id: "a", title: "Check bill", organisation: "Water provider", status: "action", summary: "Check the letter", customerId: "ACCOUNT-001" };
  assert.equal(backupSchema.parse(JSON.parse(JSON.stringify({ version: 1, tasks: [task] }))).tasks[0].customerId, "ACCOUNT-001");
  assert.equal(backupSchema.safeParse({ version: 1, tasks: [{ ...task, customerId: "x".repeat(81) }] }).success, false);
});
