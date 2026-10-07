import test from "node:test";
import assert from "node:assert/strict";
import { communitySchema, communityTotals, communityReport, emptyCommunity } from "../lib/community-fund.ts";

test("budget uses penny rounding and flags total grant above ceiling", () => {
  const project = { ...emptyCommunity, costs: [{ id: "a", label: "Delivery", amount: 3500, grant: 3000 }, { id: "b", label: "Access", amount: 1500, grant: 1200 }] };
  assert.deepEqual(communityTotals(project), { total: 5000, grant: 4200, other: 800, withinLimit: false, attendances: 0 });
  assert.match(communityReport(project), /OVER £4,000/);
});
test("records reject grant exceeding cost, duplicate identities and invalid session dates", () => {
  assert.equal(communitySchema.safeParse({ ...emptyCommunity, costs: [{ id: "a", label: "Venue", amount: 20, grant: 30 }] }).success, false);
  const session = { id: "a", title: "Workshop", date: "2026-02-30", attendance: 3, feedback: "" };
  assert.equal(communitySchema.safeParse({ ...emptyCommunity, sessions: [session] }).success, false);
  assert.equal(communitySchema.safeParse({ ...emptyCommunity, sessions: [{ ...session, date: "2027-02-01" }, { ...session, date: "2027-02-02" }] }).success, false);
});
test("worksheet distinguishes attendance from reach and exposes evidence gaps", () => {
  const project = { ...emptyCommunity, sessions: [{ id: "a", title: "Bill clinic", date: "2027-01-01", attendance: 8, feedback: "Residents requested telephone support" }] };
  assert.equal(communityTotals(project).attendances, 8);
  assert.match(communityReport(project), /Evidence still needed/);
  assert.match(communityReport(project), /not unique people/);
  assert.match(communityReport(project), /not an application/);
  assert.deepEqual(communitySchema.parse(JSON.parse(JSON.stringify(project))), project);
});
