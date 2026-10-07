import { z } from "zod";
import { validDate } from "./support-engine.ts";

export const challengeUrl = "https://marketplace.wessexwater.co.uk/challenges/water-resources-management-plan-wrmp-2029-option-suggestions";
const percent = z.number().finite().min(0).max(100);
export const scenarioSchema = z.object({
  households: z.number().int().min(0).max(10000000), litresPerHousehold: z.number().finite().min(0).max(10000),
  adoption: percent, reduction: percent, rebound: percent, retention: percent,
  supplyMld: z.number().finite().min(0).max(10000), reliability: percent, reserveMld: z.number().finite().min(0).max(10000),
  startYear: z.number().int().min(2030).max(2080), fullYear: z.number().int().min(2030).max(2080),
}).refine(value => value.fullYear >= value.startYear, { message: "Full rollout cannot precede the start year.", path: ["fullYear"] });
export type WaterScenario = z.infer<typeof scenarioSchema>;
export const illustrativeScenario: WaterScenario = { households: 10000, litresPerHousehold: 350, adoption: 50, reduction: 10, rebound: 20, retention: 90, supplyMld: 0, reliability: 80, reserveMld: 0, startYear: 2030, fullYear: 2040 };
export function scenarioImpact(input: WaterScenario, year: number, stress = false) {
  const data = scenarioSchema.parse(input);
  if (!Number.isInteger(year) || year < 2030 || year > 2080) throw new Error("Choose a planning year from 2030 to 2080.");
  const rollout = year < data.startYear ? 0 : data.fullYear === data.startYear ? 1 : Math.min(1, (year - data.startYear) / (data.fullYear - data.startYear));
  const baselineMld = data.households * data.litresPerHousehold / 1000000;
  const demandMld = baselineMld * data.adoption / 100 * data.reduction / 100 * (1 - data.rebound / 100) * data.retention / 100 * rollout * (stress ? 0.5 : 1);
  const reliableSupplyMld = data.supplyMld * data.reliability / 100 * rollout * (stress ? 0.6 : 1);
  const netSupplyMld = Math.max(0, reliableSupplyMld - data.reserveMld);
  return { year, rollout, baselineMld, demandMld, reliableSupplyMld, netSupplyMld, totalMld: demandMld + netSupplyMld };
}
export const readingSchema = z.object({ id: z.string().min(1).max(120), date: z.string().refine(validDate), cubicMetres: z.number().finite().min(0).max(10000000) });
export type MeterReading = z.infer<typeof readingSchema>;
export function validateReadings(readings: MeterReading[]) {
  const ordered = z.array(readingSchema).max(200).parse(readings).sort((a, b) => a.date.localeCompare(b.date));
  if (new Set(ordered.map(item => item.date)).size !== ordered.length || new Set(ordered.map(item => item.id)).size !== ordered.length) throw new Error("Use one reading per date and unique record IDs.");
  if (ordered.some((item, index) => index > 0 && item.cubicMetres < ordered[index - 1].cubicMetres)) throw new Error("Readings cannot decrease. A replaced/reset meter needs a separate dataset.");
  return ordered;
}
export function observedUse(readings: MeterReading[], interventionDate: string) {
  if (!validDate(interventionDate)) throw new Error("Choose a valid intervention date.");
  const sorted = validateReadings(readings);
  let beforeLitres = 0, beforeDays = 0, afterLitres = 0, afterDays = 0, excluded = 0;
  for (let index = 1; index < sorted.length; index++) {
    const from = sorted[index - 1], to = sorted[index];
    const days = (Date.parse(`${to.date}T12:00:00Z`) - Date.parse(`${from.date}T12:00:00Z`)) / 86400000;
    const litres = (to.cubicMetres - from.cubicMetres) * 1000;
    if (to.date <= interventionDate) { beforeDays += days; beforeLitres += litres; }
    else if (from.date >= interventionDate) { afterDays += days; afterLitres += litres; }
    else excluded++;
  }
  const before = beforeDays ? beforeLitres / beforeDays : null;
  const after = afterDays ? afterLitres / afterDays : null;
  return { before, after, beforeDays, afterDays, excluded, reductionPercent: before !== null && before > 0 && after !== null ? (before - after) / before * 100 : null };
}
export const evidenceFields = [
  { id: "novelty", title: "Additionality & novelty", prompt: "Explain why this is not an existing planning option or a service supporting one. Record Wessex Water feedback and a comparison with current activities." },
  { id: "benefit", title: "Supply / demand benefit", prompt: "State the mechanism, location, beneficiaries, units, data sources and independently verifiable yield or savings. Separate estimates from measurements." },
  { id: "resilience", title: "Drought & long-term resilience", prompt: "Explain performance in dry conditions, persistence, dependencies and an adaptive pathway through 2030–2080." },
  { id: "delivery", title: "Technical delivery & partners", prompt: "Describe maturity, pilot design, time to delivery, operating requirements, costs, partners and evidence still needed." },
  { id: "consents", title: "Permissions & agreements", prompt: "List relevant permits, abstraction licences, planning, land and stakeholder agreements. State what is unknown or not applicable and why." },
  { id: "environment", title: "Environmental safeguards", prompt: "Assess protected sites, waterbody status, heritage, energy/carbon, rebound and cumulative effects. Do not infer ecological benefit from litres alone." },
  { id: "inclusion", title: "Social acceptability & inclusion", prompt: "Explain impacts on vulnerable customers, consent, accessible/offline routes, affordability, essential water needs and consultation." },
  { id: "evaluation", title: "Pilot & evidence plan", prompt: "Define a baseline, matched/control comparison, occupancy and weather adjustments, leakage handling, primary metric, independent review and success/stop criteria." },
  { id: "compliance", title: "Supplier / BAF confirmations", prompt: "Record your actual position on health and safety, environmental policy, finance/insurance and modern slavery requirements. Do not declare compliance without evidence." },
] as const;
export const labSchema = z.object({ version: z.literal(1), scenario: scenarioSchema, readings: z.array(readingSchema).max(200), interventionDate: z.string().refine(value => value === "" || validDate(value)), proposalTitle: z.string().max(240), owner: z.string().max(240), evidence: z.record(z.string().max(12000)) }).superRefine((data, context) => { try { validateReadings(data.readings); } catch (error) { context.addIssue({ code: z.ZodIssueCode.custom, path: ["readings"], message: error instanceof Error ? error.message : "Invalid readings" }); } });
export type WaterLab = z.infer<typeof labSchema>;
export const emptyLab: WaterLab = { version: 1, scenario: illustrativeScenario, readings: [], interventionDate: "", proposalTitle: "Inclusive water-security evidence platform — concept for appraisal", owner: "", evidence: {} };
export function proposalReport(lab: WaterLab) {
  const data = labSchema.parse(lab);
  const model = scenarioImpact(data.scenario, 2080);
  const observed = data.interventionDate ? observedUse(data.readings, data.interventionDate) : null;
  const observationSummary = observed ? ["OBSERVED USE COMPARISON", `Intervention date: ${data.interventionDate}`, `Before: ${observed.before === null ? "Insufficient data" : observed.before.toFixed(2) + " litres/day"} (${observed.beforeDays} days)`, `After: ${observed.after === null ? "Insufficient data" : observed.after.toFixed(2) + " litres/day"} (${observed.afterDays} days)`, `Observed reduction: ${observed.reductionPercent === null ? "Not calculable" : observed.reductionPercent.toFixed(2) + "%"}`, `Intervals crossing intervention excluded: ${observed.excluded}`, "Unadjusted user-entered observations do not establish causal savings."] : ["No intervention date supplied; observed comparison not calculated."];
  return ["WRMP 2030–2080 — PREPARATION WORKSHEET (NOT THE OFFICIAL FORM)", data.proposalTitle, `Prepared by: ${data.owner || "Not supplied"}`, `Challenge: ${challengeUrl}`, "Deadline: 23 October 2026", "Official submission: complete the current Option Proposal Form and email it to marketplace@wessexwater.co.uk. This app does not submit proposals.", "", "SCOPE & LIMITS", "Working prototype for scenario appraisal, observed meter-use records and inclusive customer support. It does not produce additional water, demonstrate novelty, establish causal savings or certify environmental compliance. Generic water efficiency and services supporting existing options are explicitly outside this challenge; confirm additionality with Wessex Water.", "", ...evidenceFields.flatMap(field => [field.title.toUpperCase(), data.evidence[field.id]?.trim() || "EVIDENCE GAP — not yet documented", ""]), "ILLUSTRATIVE USER-ENTERED SCENARIO ASSUMPTIONS", JSON.stringify(data.scenario, null, 2), `2080 assumed demand reduction: ${model.demandMld.toFixed(6)} Ml/day`, `2080 assumed net dependable supply: ${model.netSupplyMld.toFixed(6)} Ml/day`, "These are arithmetic scenario estimates, not WRMP forecasts or verified benefits.", "", ...observationSummary, "", "METER RECORDS — USER ENTERED, UNVERIFIED", ...data.readings.map(reading => `${reading.date}, ${reading.cubicMetres} m³`), "", "NEXT STEP", "Obtain the official form, verify novelty, substantiate claims and complete required supplier evidence before submission."].join("\n");
}
