"use client";

import { useState } from "react";
import { Accessibility, ArrowRight, ArrowUpRight, Check, Copy, Download, Droplets, Headphones, MessageSquare, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadFile, taskSchema, validDate } from "@/lib/support-engine";
import type { SupportTask } from "@/types/support";

const topics = [
  { id: "billing", title: "Bills & payments", description: "Prepare a question about a bill or ask about support options.", icon: Wallet, prompt: "Please explain my bill and the support options available to me.", url: "https://www.wessexwater.co.uk/bills-and-accounts/help-to-pay-your-bill", link: "Official help with your bill" },
  { id: "service", title: "Water & service", description: "Get your questions ready about a service issue or meter reading.", icon: Droplets, prompt: "Please help me understand this service issue and what happens next.", url: "https://www.wessexwater.co.uk/contact-us", link: "Official contact channels" },
  { id: "accessibility", title: "Extra support", description: "Explain how you prefer to communicate and what would help.", icon: Accessibility, prompt: "Please tell me about Priority Services and accessible communication options.", url: "https://www.wessexwater.co.uk/additional-support/priority-services", link: "Official Priority Services" },
  { id: "complaint", title: "Raise a concern", description: "Organise what happened, the impact and the outcome you want.", icon: MessageSquare, prompt: "Please investigate my concern and explain how you will put it right.", url: "https://www.wessexwater.co.uk/additional-support/how-to-make-a-complaint", link: "Official complaints process" },
] as const;

export function SupportCentre({ onCreate }: { onCreate: (task: SupportTask) => void }) {
  const [topic, setTopic] = useState<(typeof topics)[number]>(topics[0]);
  const [organisation, setOrganisation] = useState("Wessex Water");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [outcome, setOutcome] = useState("");
  const [preference, setPreference] = useState("Written response");
  const [followUp, setFollowUp] = useState("");
  const [editedDraft, setEditedDraft] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const generated = `Subject: ${subject.trim() || topic.title}\n\nHello ${organisation.trim() || "support team"},\n\nI’m contacting you about ${subject.trim() || topic.title.toLowerCase()}.\n\n${details.trim() || "[Describe what happened, including relevant dates.]"}\n\nWhat I would like to happen:\n${outcome.trim() || topic.prompt}\n\nMy preferred way to receive your response is: ${preference}.\n\nPlease confirm receipt, any information you need from me, and the next steps.\n\nThank you.\n[Add your name and customer reference when sending through the official channel.]`;
  const draft = editedDraft ?? generated;
  function create(event: React.FormEvent) {
    event.preventDefault();
    if (followUp && !validDate(followUp)) { setFeedback("Check your follow-up date."); return; }
    const now = new Date().toISOString();
    const result = taskSchema.safeParse({ id: crypto.randomUUID(), title: subject.trim(), organisation: organisation.trim(), category: topic.id, status: "action", summary: details.trim(), nextStep: "Review your draft and contact the provider through its official channel. Record the conversation in this case afterwards.", deadline: followUp || undefined, reminder: Boolean(followUp), sourceText: draft, createdAt: now, checklist: [{ id: "prepare", title: "Check the relevant dates and documents", done: false }, { id: "contact", title: "Contact the provider through an official channel", done: false }, { id: "response", title: "Record the response and agreed next step", done: false }], activity: [{ id: crypto.randomUUID(), at: now, kind: "note", text: "Support request prepared locally. It has not been sent to the provider." }] });
    if (!result.success) { setFeedback("Check the required fields and text lengths before saving."); return; }
    onCreate(result.data);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(draft); setFeedback("Draft copied. Review it before sending through the provider’s official channel."); }
    catch { setFeedback("Copy is unavailable in this browser. Download the draft instead."); }
  }
  return <div className="workspace-page"><div className="page-heading"><div><p className="eyebrow">A CONVERSATION THAT MOVES THINGS FORWARD</p><h1>Let’s get you the right support.</h1><p>Prepare what you want to say. Keep a record of what happens next.</p></div><span className="date-chip"><Headphones className="size-4" /> Your support toolkit</span></div>
    <div className="topic-grid">{topics.map(item => <button key={item.id} onClick={() => { setTopic(item); setEditedDraft(null); setFeedback(""); }} aria-pressed={topic.id === item.id} className={`topic-card ${topic.id === item.id ? "selected" : ""}`}><span className="stat-icon mint"><item.icon className="size-5" /></span><strong>{item.title}</strong><p>{item.description}</p><span className="mt-3 flex items-center gap-2 text-xs font-bold text-[#258370]">{topic.id === item.id ? <><Check className="size-3" /> Selected</> : <>Explore <ArrowRight className="size-3" /></>}</span></button>)}</div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.9fr]"><section className="panel p-5 sm:p-7"><p className="eyebrow">STEP 1 · MAKE IT CLEAR</p><h2 className="mt-2 text-xl font-bold">Prepare your request</h2><p className="mt-2 text-sm leading-6 text-[#6c7c87]">This creates a personal case and a message draft. You choose how and when to contact the provider.</p><form onSubmit={create} className="mt-6 space-y-4">
      <label className="field-label">Organisation<input className="form-input mt-2" required maxLength={160} value={organisation} onChange={event => { setOrganisation(event.target.value); setEditedDraft(null); }} /></label>
      <label className="field-label">What do you need help with?<input className="form-input mt-2" required maxLength={240} value={subject} onChange={event => { setSubject(event.target.value); setEditedDraft(null); }} placeholder="For example, understanding my latest bill" /></label>
      <label className="field-label">What happened?<textarea className="form-input mt-2" required rows={4} maxLength={4000} value={details} onChange={event => { setDetails(event.target.value); setEditedDraft(null); }} placeholder="Include dates, previous conversations and what is unclear. You can leave account details out of this local draft." /></label>
      <label className="field-label">What would a helpful outcome look like?<textarea className="form-input mt-2" rows={2} maxLength={2000} value={outcome} onChange={event => { setOutcome(event.target.value); setEditedDraft(null); }} placeholder={topic.prompt} /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="field-label">Preferred response<select className="form-input mt-2" value={preference} onChange={event => { setPreference(event.target.value); setEditedDraft(null); }}><option>Written response</option><option>Telephone call</option><option>Email</option><option>Accessible format</option></select></label><label className="field-label">My follow-up date (optional)<input type="date" className="form-input mt-2" value={followUp} onChange={event => setFollowUp(event.target.value)} /></label></div><p className="text-xs leading-5 text-[#71828b]">Choose your own check-in date. This is not a promised provider response time.</p>
      <Button type="submit" className="h-12 w-full rounded-xl">Save case to my plan <ArrowRight className="size-4" /></Button>
    </form></section>
    <aside className="space-y-5"><section className="panel p-5 sm:p-6"><p className="eyebrow">STEP 2 · CHECK YOUR WORDS</p><h2 className="mt-2 text-xl font-bold">Your message, ready to review</h2><textarea className="draft-preview mt-5" aria-label="Editable support request draft" rows={15} maxLength={10000} value={draft} onChange={event => setEditedDraft(event.target.value)} /><div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={copy}><Copy className="size-4" /> Copy draft</Button><Button variant="outline" onClick={() => downloadFile("support-request.txt", draft, "text/plain")}><Download className="size-4" /> Download</Button>{editedDraft !== null && <Button variant="ghost" onClick={() => setEditedDraft(null)}>Regenerate</Button>}</div>{feedback && <p role="status" className="mt-3 text-sm text-[#258370]">{feedback}</p>}</section>
    <section className="panel official-card"><p className="eyebrow">STEP 3 · USE AN OFFICIAL CHANNEL</p><h3 className="mt-2 font-bold">Speak to the people who can help</h3><p className="mt-2 text-sm leading-6 text-[#6c7c87]">These links are for Wessex Water. If your provider is different, use its official website or the details on your bill.</p><a className="official-link" href={topic.url} target="_blank" rel="noopener noreferrer">{topic.link}<ArrowUpRight className="size-4" /></a><a className="official-link" href="https://www.wessexwater.co.uk/contact-us" target="_blank" rel="noopener noreferrer">Wessex Water contact options<ArrowUpRight className="size-4" /></a>{topic.id === "complaint" && <a className="official-link" href="https://www.ccw.org.uk/advice-and-support/make-a-complaint/complaints-policy/" target="_blank" rel="noopener noreferrer">Independent complaint guidance · CCW<ArrowUpRight className="size-4" /></a>}<p className="mt-3 text-xs text-[#71828b]">Official resource links checked 6 October 2026. Requests are not sent by this app.</p></section></aside></div>
    <section className="panel mt-6 p-5 sm:p-6"><h2 className="font-bold">Before your conversation</h2><div className="mt-4 grid gap-4 md:grid-cols-3">{[{ title: "Have the essentials nearby", text: "Your letter, customer reference and the question you want answered." }, { title: "Ask for a clear next step", text: "What happens next, who will do it, and is there an agreed date?" }, { title: "Keep a useful record", text: "Add the channel, date, outcome and any agreed follow-up in your case." }].map((item, index) => <div key={item.title} className="flex gap-3"><span className="step-number">{index + 1}</span><div><h3 className="text-sm font-bold">{item.title}</h3><p className="mt-1 text-sm leading-6 text-[#6c7c87]">{item.text}</p></div></div>)}</div></section>
  </div>;
}
