import test from "node:test";
import assert from "node:assert/strict";
import { emptyLab, illustrativeScenario, labSchema, observedUse, proposalReport, scenarioImpact, validateReadings } from "../lib/water-security.ts";

test("model converts litres to Ml/day and applies participation, rebound and retention", () => {
  const result = scenarioImpact(illustrativeScenario, 2040);
  assert.equal(result.baselineMld, 3.5);
  assert.ok(Math.abs(result.demandMld - 0.126) < 1e-10);
  assert.equal(result.netSupplyMld, 0);
});
test("rollout respects start/full years and 2030–2080 bounds", () => {
  assert.equal(scenarioImpact(illustrativeScenario, 2030).totalMld, 0);
  assert.equal(scenarioImpact(illustrativeScenario, 2035).rollout, 0.5);
  assert.equal(scenarioImpact(illustrativeScenario, 2080).rollout, 1);
  assert.throws(() => scenarioImpact(illustrativeScenario, 2081));
  assert.throws(() => scenarioImpact({ ...illustrativeScenario, startYear: 2045, fullYear: 2040 }, 2050));
});
test("separate supply is derated and environmentally reserved before contribution", () => {
  const scenario = { ...illustrativeScenario, supplyMld: 1, reliability: 80, reserveMld: 0.1 };
  const result = scenarioImpact(scenario, 2040);
  assert.ok(Math.abs(result.netSupplyMld - 0.7) < 1e-10);
  assert.ok(Math.abs(scenarioImpact(scenario, 2040, true).totalMld - 0.443) < 1e-10);
  assert.equal(scenarioImpact({ ...scenario, reserveMld: 1 }, 2040).netSupplyMld, 0);
});
test("zero participation and full rebound yield no demand saving", () => {
  assert.equal(scenarioImpact({ ...illustrativeScenario, adoption: 0 }, 2040).demandMld, 0);
  assert.equal(scenarioImpact({ ...illustrativeScenario, rebound: 100 }, 2040).demandMld, 0);
  assert.throws(() => scenarioImpact({ ...illustrativeScenario, adoption: 101 }, 2040));
});
test("meter comparison excludes crossing intervals and computes weighted daily use", () => {
  const readings = [{ id: "a", date: "2026-01-01", cubicMetres: 100 }, { id: "b", date: "2026-01-11", cubicMetres: 103 }, { id: "c", date: "2026-01-16", cubicMetres: 105 }, { id: "d", date: "2026-01-26", cubicMetres: 107 }];
  const result = observedUse(readings, "2026-01-15");
  assert.equal(result.before, 300); assert.equal(result.after, 200); assert.equal(result.excluded, 1);
  assert.ok(Math.abs(result.reductionPercent! - 100 / 3) < 1e-10);
  assert.equal(readings[0].id, "a");
});
test("meter averages are day-weighted rather than averaging interval means", () => {
  const readings = [{ id: "a", date: "2026-01-01", cubicMetres: 0 }, { id: "b", date: "2026-01-02", cubicMetres: 1 }, { id: "c", date: "2026-01-11", cubicMetres: 2 }];
  assert.equal(observedUse(readings, "2026-02-01").before, 200);
  assert.equal(observedUse(readings, "2026-02-01").reductionPercent, null);
});
test("meter records reject decreases, impossible dates and duplicate dates", () => {
  const first = { id: "a", date: "2026-01-01", cubicMetres: 100 };
  assert.throws(() => validateReadings([first, { id: "b", date: "2026-01-02", cubicMetres: 90 }]));
  assert.throws(() => validateReadings([first, { ...first, id: "b" }]));
  assert.throws(() => validateReadings([{ ...first, date: "2026-02-30" }]));
});
test("lab backup validates its version and proposal export exposes evidence gaps", () => {
  assert.deepEqual(labSchema.parse(JSON.parse(JSON.stringify(emptyLab))), emptyLab);
  assert.equal(labSchema.safeParse({ ...emptyLab, version: 2 }).success, false);
  const report = proposalReport(emptyLab);
  assert.match(report, /NOT THE OFFICIAL FORM/); assert.match(report, /EVIDENCE GAP/); assert.match(report, /23 October 2026/); assert.match(report, /does not produce additional water/);
});
