import { z } from "zod";
import { validDate } from "./support-engine.ts";

export const fundUrl = "https://www.wessexwater.co.uk/in-your-community/community-fund";
export const communityFields = [
  { id: "organisation", title: "Applicant organisation", prompt: "Name, charitable purpose, organisation type and eligible local foundation. An individual portfolio is not an eligible organisation." },
  { id: "need", title: "Community voice & local need", prompt: "Which local people need support? Record consultation findings, rural isolation or deprivation, and what residents want." },
  { id: "delivery", title: "Activities & partners", prompt: "Describe assisted bill-reading sessions, affordability-support signposting, budgeting workshops and peer support. Name confirmed venues, partners and responsibilities." },
  { id: "access", title: "Inclusive access & safeguarding", prompt: "Explain offline/telephone access, language and disability adjustments, consent, volunteer training, safeguarding and referral to qualified debt advice." },
  { id: "outcomes", title: "Outcomes & evaluation", prompt: "Set realistic targets for reach, confidence, community connections and support take-up. Explain anonymous feedback and how repeat attendees will be counted." },
  { id: "governance", title: "Eligibility & governance evidence", prompt: "Verify region, committee of at least three, independence, income/reserves, previous Wessex funding, bank and governing documents against your foundation's current rules." },
  { id: "sustainability", title: "Delivery dates & continuation", prompt: "Plan future spending within six months of an award, delivery within 12 months, ongoing ownership and support after the grant." },
] as const;
export const communitySchema = z.object({
  version: z.literal(1), title: z.string().max(240), evidence: z.record(z.string().max(12000)),
  costs: z.array(z.object({ id: z.string().min(1), label: z.string().trim().min(1).max(240), amount: z.number().finite().positive().max(100000), grant: z.number().finite().min(0).max(4000) }).refine(row => row.grant <= row.amount, "Grant share cannot exceed cost")).max(50),
  sessions: z.array(z.object({ id: z.string().min(1), title: z.string().trim().min(1).max(240), date: z.string().refine(validDate), attendance: z.number().int().min(0).max(10000), feedback: z.string().max(2000) })).max(100),
}).superRefine((data, context) => { for (const key of ["costs", "sessions"] as const) if (new Set(data[key].map(row => row.id)).size !== data[key].length) context.addIssue({ code: "custom", path: [key], message: "Duplicate record IDs" }); });
export type CommunityProject = z.infer<typeof communitySchema>;
export const emptyCommunity: CommunityProject = { version: 1, title: "Water Support Without Barriers — community pilot", evidence: {}, costs: [], sessions: [] };
export function communityTotals(project: CommunityProject) {
  const data = communitySchema.parse(project);
  const total = data.costs.reduce((sum, row) => sum + Math.round(row.amount * 100), 0) / 100;
  const grant = data.costs.reduce((sum, row) => sum + Math.round(row.grant * 100), 0) / 100;
  return { total, grant, other: Math.round((total - grant) * 100) / 100, withinLimit: grant <= 4000, attendances: data.sessions.reduce((sum, row) => sum + row.attendance, 0) };
}
export function communityReport(project: CommunityProject) {
  const data = communitySchema.parse(project), totals = communityTotals(data);
  return ["COMMUNITY FUND — PROJECT PREPARATION WORKSHEET", data.title, `Official guidance: ${fundUrl}`, "Deadline: Monday 19 October 2026. Verify the closing time with your local foundation.", "This worksheet is not an application and has not been submitted. Eligibility and funding are not confirmed.", "", ...communityFields.flatMap(field => [field.title.toUpperCase(), data.evidence[field.id]?.trim() || "Evidence still needed", ""]), "BUDGET", ...data.costs.map(row => `${row.label}: £${row.amount.toFixed(2)} total; £${row.grant.toFixed(2)} grant requested`), `Total £${totals.total.toFixed(2)}; grant £${totals.grant.toFixed(2)}; other funding needed £${totals.other.toFixed(2)}`, totals.withinLimit ? "Within £4,000 ceiling; costs still require eligibility review." : "OVER £4,000 CEILING — revise before applying.", "", "LOCAL SESSION RECORDS (USER ENTERED)", ...data.sessions.map(row => `${row.date} | ${row.title} | ${row.attendance} attendances\n${row.feedback}`), `Total attendances: ${totals.attendances}. Repeat attendance is not unique people reached.`, "Do not include residents' names, account numbers or sensitive case details in this shared project worksheet."].join("\n");
}
