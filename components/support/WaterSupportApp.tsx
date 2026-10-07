"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertCircle, BadgeCheck, Bell, CalendarDays, Camera, Check, CheckCircle2, ChevronRight,
  CircleHelp, FileText, Home, ImagePlus, LoaderCircle,
  Search, ShieldCheck, Upload, UserRound, Volume2, X, Headphones, LayoutDashboard, Leaf,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import type { SupportTask, SupportView } from "@/types/support";
import { Brand } from "@/components/support/Brand";
import { NavButton } from "@/components/support/NavButton";
import { MobileNavButton } from "@/components/support/MobileNavButton";
import { findCustomerRecords, backupSchema, calendarEvent, deadlineLabel, downloadFile, extractLetter, taskSchema, validDate } from "@/lib/support-engine";
import { PlanTools, ActionEditor } from "@/components/support/PlanTools";
import { Dashboard } from "@/components/support/Dashboard";
import { Planner } from "@/components/support/Planner";
import { SupportCentre } from "@/components/support/SupportCentre";
import { CaseWorkspace } from "@/components/support/CaseWorkspace";
import { IssueUpdates } from "@/components/support/IssueUpdates";
import { DisplaySettings } from "@/components/support/DisplaySettings";
import { CaseLibrary } from "@/components/support/CaseLibrary";
import { QuickSearch, ReminderInbox } from "@/components/support/QuickSearch";
import { CommunityProject } from "@/components/support/CommunityProject";

type CaptureStage = "capture" | "processing" | "review";
type PagePhoto = { name: string; src: string; objectUrl?: boolean };

function demoDeadline(offset: number) {
  const date = new Date(); date.setDate(date.getDate() + offset);
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { deadline: iso, dueDate: new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(date), dueLabel: deadlineLabel(iso) };
}

const initialTasks: SupportTask[] = [
  {
    id: "income-evidence", title: "Upload income evidence", organisation: "Wessex Water",
    status: "action", urgency: "urgent", ...demoDeadline(2),
    summary: "Wessex Water needs proof of your household income before it can continue your application.",
    nextStep: "Upload one accepted document showing your household income.",
    documents: ["Recent payslip", "Benefits statement", "Other accepted income evidence"], reminder: true,
  },
  {
    id: "phone-appointment", title: "Prepare for your telephone appointment", organisation: "Wessex Water",
    status: "action", urgency: "soon", ...demoDeadline(1),
    summary: "A member of the support team will call to discuss your application and household circumstances.",
    nextStep: "Keep your account number and recent income details nearby.", reminder: true,
  },
  {
    id: "reviewing", title: "Your support application is being reviewed", organisation: "Wessex Water",
    status: "waiting", summary: "You do not need to do anything while the support team reviews your information.",
  },
  {
    id: "bill-uploaded", title: "Water bill uploaded", organisation: "Wessex Water", status: "completed",
    summary: "Your latest water bill was added to your application.",
  },
  {
    id: "application-sent", title: "Application submitted", organisation: "Wessex Water", status: "completed",
    summary: "Your application was sent successfully.",
  },
];

const demoCustomerTasks: SupportTask[] = [
  {
    id: "record-meter-reading", title: "Send your latest meter reading", organisation: "Wessex Water",
    status: "action", urgency: "urgent", ...demoDeadline(4),
    summary: "A current meter reading is needed so your next bill reflects the water you have used.",
    nextStep: "Take a clear photo of the meter display or enter the reading online.", reminder: true,
  },
  {
    id: "record-support-renewal", title: "Review your support plan renewal", organisation: "Wessex Water",
    status: "action", urgency: "normal", ...demoDeadline(14),
    summary: "Your reduced-payment support plan is due for its yearly review.",
    nextStep: "Check that your household and income details are still correct.",
    documents: ["Recent income evidence", "Current household details"], reminder: true,
  },
  {
    id: "record-payment-review", title: "Payment arrangement under review", organisation: "Wessex Water",
    status: "waiting", summary: "The support team is checking whether your current payment amount is still suitable.",
  },
  {
    id: "record-payment-received", title: "September payment received", organisation: "Wessex Water",
    status: "completed", summary: "Your latest payment has been received and added to your account.",
  },
];

const statusMeta = {
  action: { label: "Action needed", tone: "red" },
  waiting: { label: "Waiting", tone: "blue" },
  completed: { label: "Completed", tone: "green" },
} as const;

export default function WaterSupportApp({ initialView = "home" }: { initialView?: SupportView }) {
  const [tasks, setTasks] = useState<SupportTask[]>(initialTasks);
  const [activeView, setActiveView] = useState<SupportView>(initialView);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [lookupStage, setLookupStage] = useState<"entry" | "searching" | "results">("entry");
  const [customerId, setCustomerId] = useState("");
  const [captureCustomerId, setCaptureCustomerId] = useState("");
  const [matchedRecords, setMatchedRecords] = useState<SupportTask[]>([]);
  const [lookupError, setLookupError] = useState("");
  const [captureStage, setCaptureStage] = useState<CaptureStage>("capture");
  const [photos, setPhotos] = useState<PagePhoto[]>([]);
  const [showPhotoHelp, setShowPhotoHelp] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedTask, setSelectedTask] = useState<SupportTask | null>(null);
  const [deadlineConfirmed, setDeadlineConfirmed] = useState(false);
  const [reminder, setReminder] = useState(true);
  const [organisation, setOrganisation] = useState("Wessex Water Foundation");
  const [actionTitle, setActionTitle] = useState("Apply for the Community Fund");
  const [deadline, setDeadline] = useState("2026-10-19");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<SupportTask | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [summary, setSummary] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [captureError, setCaptureError] = useState("");
  const scanGeneration = useRef(0);
  const [undoTask, setUndoTask] = useState<SupportTask | null>(null);
  const storageBlocked = useRef(false);
  const [persistenceError, setPersistenceError] = useState("");
  const [recoveryCopy, setRecoveryCopy] = useState("");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("water-support-plan-v1");
      // Hydrate from browser storage after SSR; the server cannot access this external store.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setTasks(backupSchema.parse(JSON.parse(saved)).tasks);
    } catch {
      storageBlocked.current = true;
      setRecoveryCopy(saved ?? "");
      setPersistenceError("Your saved plan could not be loaded. The original data has been kept. Export a recovery copy, then restore a valid backup or use Manage workspace to start a new plan. Changes are not saved until then.");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || storageBlocked.current) return;
    try { localStorage.setItem("water-support-plan-v1", JSON.stringify({ version: 1, tasks })); }
    // Report an external storage failure to prevent silent data loss.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    catch { setPersistenceError("Your browser could not save this plan. Export a backup before closing this page."); }
  }, [ready, tasks]);

  const visibleTasks = tasks.map(task => ({ ...task, dueLabel: task.deadline && task.status !== "completed" ? deadlineLabel(task.deadline) : task.dueLabel }));
  const actionTasks = visibleTasks.filter((task) => task.status === "action").sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));
  const waitingTasks = visibleTasks.filter((task) => task.status === "waiting");
  const completedTasks = visibleTasks.filter((task) => task.status === "completed");
  const allLetters = useMemo(() => [...actionTasks, ...waitingTasks, ...completedTasks], [actionTasks, waitingTasks, completedTasks]);

  function navigate(view: SupportView) {
    setActiveView(view);
    const url = new URL(window.location.href);
    if (view === "home") url.searchParams.delete("view"); else url.searchParams.set("view", view);
    window.history.pushState({ view }, "", url);
  }
  useEffect(() => {
    const onBack = () => {
      const view = new URLSearchParams(window.location.search).get("view");
      setActiveView(view === "letters" || view === "planner" || view === "support" || view === "community" ? view : "home");
    };
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, []);

  function resetCapture() {
    setCaptureCustomerId("");
    scanGeneration.current++;
    setSourceText(""); setSummary(""); setNextStep(""); setCaptureError("");
    photos.forEach((photo) => photo.objectUrl && URL.revokeObjectURL(photo.src));
    setPhotos([]); setCaptureStage("capture"); setProgress(0); setDeadlineConfirmed(false);
    setReminder(true); setOrganisation("");
    setActionTitle(""); setDeadline("");
  }

  function handleCaptureChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    if (photos.length + files.length > 8 || files.some(file => !file.type.startsWith("image/") || file.size > 10 * 1024 * 1024)) {
      setCaptureError("Choose up to 8 images, each smaller than 10 MB."); event.target.value = ""; return;
    }
    setCaptureError("");
    setPhotos((current) => [...current, ...files.map((file) => ({ name: file.name, src: URL.createObjectURL(file), objectUrl: true }))]);
    event.target.value = "";
  }

  function useSampleLetter() {
    photos.forEach(photo => photo.objectUrl && URL.revokeObjectURL(photo.src));
    setPhotos([{ name: "Wessex Water Community Fund announcement", src: "/sample-community-fund.png" }]);
  }

  async function analyseLetter() {
    const generation = ++scanGeneration.current;
    setCaptureError(""); setCaptureStage("processing"); setProgress(0);
    let worker: Awaited<ReturnType<typeof import("tesseract.js")["createWorker"]>> | undefined;
    try {
      let text = sourceText.trim();
      if (!text) {
        const { createWorker } = await import("tesseract.js");
        let completedPages = 0;
        worker = await createWorker("eng", 1, { workerPath: "/ocr/worker.min.js", corePath: "/ocr", langPath: "/ocr", logger: message => {
          if (scanGeneration.current === generation && message.status === "recognizing text") setProgress(Math.round((completedPages + message.progress) / photos.length * 100));
        } });
        const pages: string[] = [];
        for (const photo of photos) { if (scanGeneration.current !== generation) return; pages.push((await worker.recognize(photo.src)).data.text); completedPages++; }
        text = pages.join("\n\n");
      }
      if (scanGeneration.current !== generation) return;
      if (text.trim().length < 20) throw new Error("We could not read enough text. Try a clearer photo or paste the letter text.");
      const result = extractLetter(text);
      setSourceText(text); setOrganisation(result.organisation); setActionTitle(result.title);
      setDeadline(result.deadline); setSummary(result.summary); setNextStep(result.nextStep);
      setProgress(100); setCaptureStage("review");
    } catch (error) {
      if (scanGeneration.current === generation) { setCaptureStage("capture"); setCaptureError(error instanceof Error ? error.message : "Reading failed. Paste the letter text to continue."); }
    } finally { await worker?.terminate(); }
  }

  function saveExtractedAction() {
    if ((deadline && !validDate(deadline)) || !deadlineConfirmed || !organisation.trim() || !actionTitle.trim()) return;
    const formattedDeadline = deadline ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${deadline}T12:00:00`)) : undefined;
    const newTask: SupportTask = {
      id: crypto.randomUUID(), title: actionTitle.trim(), organisation: organisation.trim(), status: "action", urgency: "normal",
      dueLabel: deadline ? deadlineLabel(deadline) : undefined, dueDate: formattedDeadline,
      summary, nextStep, sourceText, customerId: captureCustomerId.trim() || undefined, deadline: deadline || undefined, createdAt: new Date().toISOString(), reminder: Boolean(deadline && reminder),
    };
    const validated = taskSchema.safeParse(newTask);
    if (!validated.success) { setCaptureError("Check the field lengths before saving this letter."); return; }
    setTasks((current) => [validated.data, ...current]); setCaptureOpen(false); navigate("home"); resetCapture();
  }

  function markComplete(id: string) {
    const task = tasks.find(item => item.id === id);
    if (!task) return;
    setUndoTask(task);
    const updated: SupportTask = { ...task, status: "completed", dueLabel: undefined, activity: (task.activity?.length ?? 0) < 200 ? [...(task.activity ?? []), { id: crypto.randomUUID(), at: new Date().toISOString(), kind: "status", text: "Marked complete in your personal plan." }] : task.activity };
    setTasks(current => current.map(item => item.id === id ? updated : item));
    setSelectedTask(current => current?.id === id ? updated : current);
  }

  function updateTask(task: SupportTask) {
    const previous = tasks.find(item => item.id === task.id);
    if (previous) setUndoTask(previous);
    const updated = { ...task, dueLabel: task.deadline && task.status !== "completed" ? deadlineLabel(task.deadline) : undefined };
    setTasks(current => current.map(item => item.id === task.id ? updated : item));
    setSelectedTask(current => current?.id === task.id ? updated : current);
  }

  function resetLookup() {
    setLookupStage("entry");
    setCustomerId("");
    setLookupError("");
  }

  function lookupRecords() {
    const normalisedId = customerId.trim().toUpperCase();
    if (!normalisedId) {
      setLookupError("Enter your customer ID to continue.");
      return;
    }
    const localMatches = findCustomerRecords(tasks, normalisedId);
    if (!localMatches.length && normalisedId !== "WW-2048-7319") {
      setLookupError("No records for this ID are saved on this device. You can add a letter with this customer ID, or try the fictional demo.");
      return;
    }
    setMatchedRecords(localMatches.length ? localMatches : demoCustomerTasks);
    setLookupError("");
    setLookupStage("results");
  }

  function importRecords() {
    setTasks((current) => {
      const existingIds = new Set(current.map(task => task.id));
      return [...matchedRecords.filter(task => !existingIds.has(task.id)), ...current];
    });
    setRecordOpen(false);
    navigate("home");
    resetLookup();
  }

  return (
    <main id="main-content" className="app-shell min-h-screen text-[#203d4a]">
      <a href="#workspace-content" className="skip-link">Skip to main content</a>
      <div className="min-h-screen lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="app-sidebar hidden px-5 py-8 lg:flex lg:flex-col">
          <Brand />
          <nav className="mt-10 space-y-1" aria-label="Main navigation">
            <p className="sidebar-label">YOUR WORKSPACE</p>
            <NavButton active={activeView === "home"} icon={<LayoutDashboard />} label="Overview" onClick={() => navigate("home")} />
            <NavButton active={activeView === "letters"} icon={<FileText />} label="My letters" count={allLetters.length} onClick={() => navigate("letters")} />
            <NavButton active={activeView === "planner"} icon={<CalendarDays />} label="My calendar" onClick={() => navigate("planner")} />
            <NavButton active={activeView === "community"} icon={<Leaf />} label="Community project" onClick={() => navigate("community")} />
            <p className="sidebar-label pt-7">A HELPING HAND</p>
            <NavButton active={activeView === "support"} icon={<Headphones />} label="Support centre" onClick={() => navigate("support")} />
          </nav>
          <div className="mt-auto pt-10">
            <div className="flex items-start gap-3 rounded-md bg-[#edf7f9] p-3 text-sm text-[#24505b]">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#007d8a]" />
              <div><p className="font-bold">A space you control</p><p className="mt-2 text-xs leading-5">Your plan stays in this browser. Photos are read on your device.</p></div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 pb-24 lg:pb-10">
          <header className="app-header sticky top-0 z-20 flex h-20 items-center justify-between gap-3 px-5 backdrop-blur md:px-8 lg:px-10">
            <div className="mobile-brand lg:hidden"><Brand compact /></div>
            <div className="hidden items-center gap-3 text-sm lg:flex"><span className="text-[#85969d]">My workspace</span><ChevronRight className="size-3 text-[#aab8bc]" /><span className="font-semibold">{({ home: "Overview", letters: "My letters", planner: "My calendar", support: "Support centre", community: "Community project" })[activeView]}</span></div>
            <div className="flex items-center gap-1 sm:gap-2"><QuickSearch tasks={allLetters} onSelect={setSelectedTask} /><ReminderInbox tasks={allLetters} onSelect={setSelectedTask} /><DisplaySettings /><Button onClick={() => setCaptureOpen(true)} className="h-11 rounded-xl bg-[#187b69] px-4 text-sm font-bold text-white hover:bg-[#126555]">
              <Camera className="size-5" /><span className="hidden sm:inline">Scan a letter</span><span className="sm:hidden">Scan</span>
            </Button></div>
          </header>
          <div className="mx-auto max-w-6xl px-5 pt-5 md:px-8 lg:px-10">
            <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-xs text-[#607e72]"><span className="size-1.5 rounded-full bg-[#4d9b7d]" />Personal workspace · {persistenceError ? "backup recommended" : "stored on this device"}</span><Button variant="outline" size="sm" className="rounded-lg" disabled={!ready} onClick={() => { setEditingTask(null); setEditorOpen(true); }}>+ Add action</Button></div>
            {persistenceError && <div role="alert" className="mt-3 rounded-xl border border-[#e2b17d] bg-[#fff5e8] p-4 text-sm leading-6 text-[#78521b]">{persistenceError}{recoveryCopy && <Button variant="outline" size="sm" className="mt-3 block" onClick={() => downloadFile("water-support-recovery.json", recoveryCopy, "application/json")}>Export original recovery copy</Button>}</div>}
            {notice && <div role="status" className="mt-3 flex items-center justify-between gap-3 rounded-md bg-[#e9f5f7] p-3 text-sm">{notice}<button aria-label="Dismiss message" onClick={() => setNotice("")}><X className="size-4" /></button></div>}
          </div>

          <IssueUpdates tasks={allLetters} onSelect={setSelectedTask} />
          <div id="workspace-content" tabIndex={-1}>
          {activeView === "home" && <Dashboard tasks={allLetters} onOpenCapture={() => setCaptureOpen(true)} onOpenRecords={() => setRecordOpen(true)} onSupport={() => navigate("support")} onPlanner={() => navigate("planner")} onSecurity={() => navigate("community")} onSelectTask={setSelectedTask} onComplete={markComplete} />}
          {activeView === "letters" && <CaseLibrary tasks={allLetters} onSelect={setSelectedTask} onUpdate={updateTask} />}
          {activeView === "planner" && <Planner tasks={allLetters} onSelect={setSelectedTask} />}
          {activeView === "community" && <CommunityProject />}
          {activeView === "support" && <SupportCentre onCreate={task => { setTasks(current => [task, ...current]); navigate("home"); setNotice("Support case saved. Open it to track your checklist and conversations."); }} />}
          </div>
          <details className="mx-auto max-w-6xl px-5 pb-6 md:px-8 lg:px-10"><summary className="cursor-pointer text-xs font-semibold text-[#71828b]">Manage workspace · backups, restore & demo data</summary><div className="mt-4"><PlanTools tasks={tasks} ready={ready} onAdd={() => { setEditingTask(null); setEditorOpen(true); }} onRestore={value => { storageBlocked.current = false; setPersistenceError(""); setTasks(value); setUndoTask(null); setNotice("Backup restored."); }} onClear={() => { storageBlocked.current = false; setPersistenceError(""); setTasks([]); setUndoTask(null); setNotice("Your plan is now empty. Add your own letters or restore a backup."); }} onDemo={() => { storageBlocked.current = false; setPersistenceError(""); setTasks(initialTasks); setUndoTask(null); setNotice("Demo plan loaded. These records are fictional."); }} /></div></details>
          <p className="mx-auto max-w-6xl px-5 pb-4 text-[11px] leading-5 text-[#81928b] md:px-8 lg:px-10">Independent support organiser · not connected to a water account. Account lookups use fictional demo records.</p>
        </section>
      </div>

      <nav className="mobile-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 bg-white px-2 pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Mobile navigation">
        <MobileNavButton active={activeView === "home"} icon={<Home />} label="Home" onClick={() => navigate("home")} />
        <MobileNavButton active={activeView === "letters"} icon={<FileText />} label="Letters" onClick={() => navigate("letters")} />
        <button type="button" onClick={() => setCaptureOpen(true)} className="relative flex flex-col items-center justify-center gap-1 text-sm font-semibold text-[#006f7b]">
          <span className="grid size-12 -translate-y-3 place-items-center rounded-full bg-[#006f7b] text-white shadow-lg shadow-[#006f7b]/20"><Camera className="size-6" /></span>
          <span className="absolute bottom-2">Scan</span>
        </button>
        <MobileNavButton active={activeView === "planner"} icon={<CalendarDays />} label="Calendar" onClick={() => navigate("planner")} />
        <MobileNavButton active={activeView === "community"} icon={<Leaf />} label="Community" onClick={() => navigate("community")} />
        <MobileNavButton active={activeView === "support"} icon={<Headphones />} label="Support" onClick={() => navigate("support")} />
      </nav>

      <Dialog open={captureOpen} onOpenChange={(open) => { setCaptureOpen(open); if (!open) resetCapture(); }}>
        <DialogContent className="max-h-[92vh] overflow-x-hidden overflow-y-auto border-0 p-0 sm:max-w-2xl">
          <ol className="capture-steps" aria-label="Letter review progress">{[{ stage: "capture", title: "Add letter" }, { stage: "processing", title: "Read text" }, { stage: "review", title: "Check & save" }].map((item, index) => <li key={item.stage} aria-current={captureStage === item.stage ? "step" : undefined}><span>{index + 1}</span>{item.title}</li>)}</ol>
          {captureStage !== "processing" && <label className="field-label mx-6 mt-5 block">Customer ID / account reference (optional)<input className="form-input mt-2" maxLength={80} autoComplete="off" autoCapitalize="characters" value={captureCustomerId} onChange={event => setCaptureCustomerId(event.target.value)} /><span className="mt-2 block text-xs font-normal leading-5">Link this letter to a reference for lookup on this device. This does not sign in to your provider account.</span></label>}
          <CaptureFlow stage={captureStage} photos={photos} progress={progress} showPhotoHelp={showPhotoHelp}
            uploadInputRef={uploadInputRef}
            sourceText={sourceText} setSourceText={setSourceText} error={captureError} summary={summary} setSummary={setSummary} nextStep={nextStep} setNextStep={setNextStep}
            setShowPhotoHelp={setShowPhotoHelp} fileInputRef={fileInputRef} onCaptureChange={handleCaptureChange}
            onUseSample={useSampleLetter} onAddPage={() => fileInputRef.current?.click()}
            onRemovePage={(index) => { const photo = photos[index]; if (photo.objectUrl) URL.revokeObjectURL(photo.src); setPhotos(current => current.filter((_, itemIndex) => itemIndex !== index)); }}
            onAnalyse={analyseLetter} organisation={organisation} setOrganisation={setOrganisation}
            actionTitle={actionTitle} setActionTitle={setActionTitle} deadline={deadline}
            setDeadline={(value) => { setDeadline(value); setDeadlineConfirmed(false); }}
            deadlineConfirmed={deadlineConfirmed} setDeadlineConfirmed={setDeadlineConfirmed}
            reminder={reminder} setReminder={setReminder} onSave={saveExtractedAction} />
        </DialogContent>
      </Dialog>

      <Dialog open={recordOpen} onOpenChange={(open) => { setRecordOpen(open); if (!open) resetLookup(); }}>
        <DialogContent className="max-h-[92vh] overflow-x-hidden overflow-y-auto border-0 p-0 sm:max-w-xl">
          <RecordLookup
            stage={lookupStage}
            customerId={customerId}
            setCustomerId={(value) => { setCustomerId(value); setLookupError(""); }}
            error={lookupError}
            onLookup={lookupRecords}
            onUseDemo={() => { setCustomerId("WW-2048-7319"); setLookupError(""); }}
            onImport={importRecords}
            records={matchedRecords}
            onPhoto={() => { setCaptureCustomerId(customerId.trim()); setRecordOpen(false); setCaptureOpen(true); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedTask)} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-h-[90vh] overflow-x-hidden overflow-y-auto sm:max-w-xl">
          {selectedTask && <TaskDetails task={selectedTask} onUpdate={updateTask} onComplete={() => markComplete(selectedTask.id)} onEdit={() => { setEditingTask(selectedTask); setSelectedTask(null); setEditorOpen(true); }} onDelete={() => { setUndoTask(selectedTask); setTasks(current => current.filter(task => task.id !== selectedTask.id)); setSelectedTask(null); setNotice("Action deleted. You can undo this change."); }} />}
        </DialogContent>
      </Dialog>
      {editorOpen && <ActionEditor open={editorOpen} task={editingTask} onClose={() => setEditorOpen(false)} onSave={task => { setTasks(current => editingTask ? current.map(item => item.id === task.id ? task : item) : [task, ...current]); setEditorOpen(false); setNotice("Action saved in this browser."); }} />}
      {undoTask && <div className="undo-toast" role="status"><CheckCircle2 className="size-5 text-[#258370]" /><span>Plan updated</span><button onClick={() => { setTasks(current => current.some(task => task.id === undoTask.id) ? current.map(task => task.id === undoTask.id ? undoTask : task) : [undoTask, ...current]); setSelectedTask(current => current?.id === undoTask.id ? undoTask : current); setUndoTask(null); }}>Undo</button><button aria-label="Dismiss undo" onClick={() => setUndoTask(null)}><X className="size-4" /></button></div>}
    </main>
  );
}

function RecordLookup({ stage, customerId, setCustomerId, error, onLookup, onUseDemo, onImport, records, onPhoto }: {
  records: SupportTask[];
  onPhoto: () => void;
  stage: "entry" | "searching" | "results";
  customerId: string;
  setCustomerId: (value: string) => void;
  error: string;
  onLookup: () => void;
  onUseDemo: () => void;
  onImport: () => void;
}) {
  if (stage === "searching") {
    return <div className="grid min-h-[380px] place-items-center p-8 text-center">
      <div>
        <span className="mx-auto grid size-16 place-items-center rounded-md bg-[#e8eef8] text-[#355b8c]"><LoaderCircle className="size-8 animate-spin" /></span>
        <DialogTitle className="mt-6 text-2xl text-[#173256]">Finding your records</DialogTitle>
        <DialogDescription className="mt-2 text-base leading-6">Checking deadlines, appointments, documents and recent updates.</DialogDescription>
      </div>
    </div>;
  }

  if (stage === "results") {
    const actionCount = records.filter((task) => task.status === "action").length;
    const isDemo = records.some(task => task.id.startsWith("record-"));
    return <div>
      <div className="border-b border-[#dbe4ea] bg-[#f4fafb] px-6 py-5 sm:px-7">
        <div className="flex items-center gap-3 text-[#147a43]"><BadgeCheck className="size-6" /><p className="font-bold">Customer ID matched</p></div>
        <DialogTitle className="mt-3 text-2xl text-[#173256]">{isDemo ? "Fictional demo records" : "Records saved on this device"}</DialogTitle>
        <DialogDescription className="mt-2 text-base">{isDemo ? "Demo customer · ID ending 7319" : "Personal records matched to your reference. No provider sign-in or identity verification."}</DialogDescription>
      </div>
      <div className="space-y-5 p-6 sm:p-7">
        <div className="grid grid-cols-3 divide-x divide-[#dbe4ea] rounded-md border border-[#dbe4ea] bg-white py-4 text-center">
          <div><strong className="block text-2xl text-[#b32634]">{actionCount}</strong><span className="text-xs font-semibold text-[#657589]">To do</span></div>
          <div><strong className="block text-2xl text-[#2873a5]">{records.filter(task => task.status === "waiting").length}</strong><span className="text-xs font-semibold text-[#657589]">Waiting</span></div>
          <div><strong className="block text-2xl text-[#2b8150]">{records.filter(task => task.status === "completed").length}</strong><span className="text-xs font-semibold text-[#657589]">Completed</span></div>
        </div>
        <section>
          <h3 className="font-bold text-[#173256]">Important records</h3>
          <div className="mt-3 overflow-hidden rounded-md border border-[#dbe4ea]">
            {records.map((task, index) => {
              const meta = statusMeta[task.status];
              return <div key={task.id} className={`flex items-center gap-3 bg-white p-4 ${index !== records.length - 1 ? "border-b border-[#e1e8ed]" : ""}`}>
                <span className={`status-dot ${meta.tone}`} />
                <div className="min-w-0 flex-1"><p className="font-bold leading-5 text-[#173256]">{task.title}</p>{task.dueLabel && <p className="mt-1 text-sm font-semibold text-[#7a4a00]">{task.dueLabel}</p>}</div>
                <span className={`hidden rounded-full px-2 py-1 text-xs font-bold sm:inline status-${meta.tone}`}>{meta.label}</span>
              </div>;
            })}
          </div>
        </section>
        <div className="rounded-md bg-[#eef4f7] p-4 text-sm leading-6 text-[#526578]">
          Nothing is changed on your account. These records are only added to your support plan.
        </div>
        <Button onClick={onImport} className="h-12 w-full whitespace-normal bg-[#006f7b] text-base text-white hover:bg-[#005b65]"><CheckCircle2 className="size-5" /> Add these records to my plan</Button>
        <Button variant="outline" onClick={onPhoto} className="h-12 w-full"><Camera className="size-5" /> Add a photo for this customer ID</Button>
      </div>
    </div>;
  }

  return <div>
    <div className="border-b border-[#dbe4ea] px-6 py-5 sm:px-7">
      <DialogHeader>
        <div className="flex items-center gap-3 pr-8">
          <span className="grid size-11 place-items-center rounded-md bg-[#e8eef8] text-[#355b8c]"><UserRound className="size-6" /></span>
          <div><DialogTitle className="text-xl text-[#173256]">Customer ID or a letter photo</DialogTitle><DialogDescription className="mt-1 text-sm">Find locally saved records, or add a letter using your camera.</DialogDescription></div>
        </div>
      </DialogHeader>
    </div>
    <div className="space-y-5 p-6 sm:p-7">
      <label className="block text-sm font-bold text-[#31475d]">Customer ID
        <input
          className={`form-input mt-2 ${error ? "border-[#b32634]" : ""}`}
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && onLookup()}
          placeholder="For example, WW-2048-7319"
          autoComplete="off"
          maxLength={80}
          autoCapitalize="characters"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "customer-id-error" : "customer-id-help"}
        />
      </label>
      {error ? <p id="customer-id-error" className="flex items-start gap-2 text-sm font-semibold text-[#a52230]"><AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}</p> : <p id="customer-id-help" className="text-sm leading-6 text-[#657589]">Your customer ID is usually shown near the top of your bill or letter.</p>}
      <Button onClick={onLookup} className="h-12 w-full bg-[#355b8c] text-base text-white hover:bg-[#294d79]"><Search className="size-5" /> Find my records</Button>
      <Button variant="outline" onClick={onPhoto} className="h-12 w-full whitespace-normal"><Camera className="size-5" /> Take a photo / upload a letter instead</Button>

      <div className="border-t border-[#dbe4ea] pt-5 text-center">
        <p className="text-sm text-[#657589]">Trying the prototype?</p>
        <Button variant="ghost" onClick={onUseDemo} className="mt-1 w-full text-[#355b8c] hover:bg-[#eef3fa]">Use demo ID: WW-2048-7319</Button>
      </div>

      <div className="flex items-start gap-3 rounded-md bg-[#f2f5f7] p-4 text-sm leading-6 text-[#526578]">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#006f7b]" />
        <p>Customer IDs find records saved on this device; the demo ID shows fictional records. A reference number alone cannot securely access a provider account. Keep this device private.</p>
      </div>
    </div>
  </div>;
}

function CaptureFlow({ stage, photos, progress, showPhotoHelp, setShowPhotoHelp, fileInputRef, onCaptureChange,
  uploadInputRef,
  sourceText, setSourceText, error, summary, setSummary, nextStep, setNextStep,
  onUseSample, onAddPage, onRemovePage, onAnalyse, organisation, setOrganisation, actionTitle,
  setActionTitle, deadline, setDeadline, deadlineConfirmed, setDeadlineConfirmed, reminder, setReminder, onSave,
}: {
  uploadInputRef: React.RefObject<HTMLInputElement | null>;
  sourceText: string; setSourceText: (value: string) => void; error: string; summary: string; setSummary: (value: string) => void; nextStep: string; setNextStep: (value: string) => void;
  stage: CaptureStage; photos: PagePhoto[]; progress: number; showPhotoHelp: boolean; setShowPhotoHelp: (value: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>; onCaptureChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUseSample: () => void; onAddPage: () => void; onRemovePage: (index: number) => void; onAnalyse: () => void;
  organisation: string; setOrganisation: (value: string) => void; actionTitle: string; setActionTitle: (value: string) => void;
  deadline: string; setDeadline: (value: string) => void; deadlineConfirmed: boolean; setDeadlineConfirmed: (value: boolean) => void;
  reminder: boolean; setReminder: (value: boolean) => void; onSave: () => void;
}) {
  if (stage === "processing") return <div className="grid min-h-[430px] place-items-center p-8 text-center"><div className="w-full max-w-md">
    <span className="mx-auto grid size-16 place-items-center rounded-md bg-[#e4f3f5] text-[#006f7b]"><LoaderCircle className="size-8 animate-spin" /></span>
    <DialogTitle className="mt-6 text-2xl text-[#173256]">Reading your letter</DialogTitle>
    <DialogDescription className="mt-2 text-base leading-6">Finding dates, actions and important information across {photos.length} {photos.length === 1 ? "page" : "pages"}.</DialogDescription>
    <Progress value={progress} className="mt-7 h-2.5 bg-[#dce8ec] [&_[data-slot=progress-indicator]]:bg-[#006f7b]" /><p className="mt-3 text-sm font-semibold text-[#617184]">{progress}% complete</p>
  </div></div>;

  if (stage === "review") return <div>
    <div className="border-b border-[#dbe4ea] bg-[#f4fafb] px-6 py-5 sm:px-7">
      <div className="flex items-center gap-3 text-[#006f7b]"><CheckCircle2 className="size-6" /><p className="font-bold">Text ready for your review</p></div>
      <DialogTitle className="mt-3 text-2xl text-[#173256]">Please check what we found</DialogTitle>
      <DialogDescription className="mt-2 text-base leading-6">Confirm the important details before we create reminders or save anything.</DialogDescription>
    </div>
    <div className="space-y-6 p-6 sm:p-7">
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="min-w-0 text-sm font-bold text-[#31475d]">Organisation<input className="form-input mt-2" maxLength={160} value={organisation} onChange={(event) => setOrganisation(event.target.value)} /></label>
        <label className="min-w-0 text-sm font-bold text-[#31475d]">Action<input className="form-input mt-2" maxLength={240} value={actionTitle} onChange={(event) => setActionTitle(event.target.value)} /></label>
      </div>
      <section className="rounded-md border-2 border-[#e0a72d] bg-[#fff9e9] p-4">
        <div className="flex items-start gap-3"><AlertCircle className="mt-0.5 size-5 shrink-0 text-[#9a5c00]" /><div className="min-w-0 flex-1">
          <h3 className="font-bold text-[#624100]">{deadline ? "Check the suggested deadline" : "No deadline found: add one only if your letter gives a date"}</h3>
          <label className="mt-3 block text-sm font-bold text-[#624100]">Closing date<input type="date" className="form-input mt-2 border-[#c89427] bg-white" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label>
          <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm font-semibold text-[#624100]"><Checkbox checked={deadlineConfirmed} onCheckedChange={(checked) => setDeadlineConfirmed(checked === true)} className="mt-0.5 border-[#9a6a05] data-[state=checked]:border-[#006f7b] data-[state=checked]:bg-[#006f7b]" />{deadline ? "I have checked this date against the letter" : "I have checked that this letter has no deadline"}</label>
        </div></div>
      </section>
      <label className="block font-bold text-[#173256]">Summary<textarea className="form-input mt-2" rows={3} maxLength={20000} value={summary} onChange={event => setSummary(event.target.value)} /></label>
      <label className="block font-bold text-[#173256]">Next step<textarea className="form-input mt-2" rows={2} maxLength={2000} value={nextStep} onChange={event => setNextStep(event.target.value)} /></label>
      <details className="rounded-md border p-4"><summary className="cursor-pointer font-semibold">Check original recognised text</summary><textarea aria-label="Recognised letter text" className="form-input mt-3" rows={8} value={sourceText} onChange={event => setSourceText(event.target.value)} maxLength={100000} /><p className="mt-2 text-xs text-[#607084]">Suggestions use simple text rules and may miss details. Compare every field with your letter.</p></details>
      <div className="flex items-center justify-between gap-5 border-y border-[#dbe4ea] py-4"><div><p className="font-bold text-[#173256]">Calendar reminder</p><p className="mt-1 text-sm text-[#657589]">Export this action to your calendar after saving to enable alerts.</p></div><Switch checked={reminder} onCheckedChange={setReminder} aria-label="Set a reminder" className="data-[state=checked]:bg-[#006f7b]" /></div>
      <Button disabled={!deadlineConfirmed || Boolean(deadline && !validDate(deadline)) || !organisation.trim() || !actionTitle.trim()} onClick={onSave} className="h-12 w-full whitespace-normal bg-[#006f7b] text-base leading-5 text-white hover:bg-[#005b65]"><ShieldCheck className="size-5" /> Confirm and create action plan</Button>
    </div>
  </div>;

  return <div>
    <div className="border-b border-[#dbe4ea] px-6 py-5 sm:px-7"><DialogHeader><div className="flex items-center gap-3 pr-8"><span className="grid size-11 place-items-center rounded-md bg-[#e4f3f5] text-[#006f7b]"><Camera className="size-6" /></span><div><DialogTitle className="text-xl text-[#173256]">Photograph your letter</DialogTitle><DialogDescription className="mt-1 text-sm">Add every page before you continue.</DialogDescription></div></div></DialogHeader></div>
    <div className="p-6 sm:p-7">
      <p className="mb-4 text-sm leading-6 text-[#607084]">Real text recognition runs in your browser. The first scan loads the bundled OCR engine and English language model from this app. Photos are not uploaded to a server. You can also paste text below.</p>
      {error && <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple onChange={onCaptureChange} className="sr-only" />
      <input ref={uploadInputRef} type="file" accept="image/*" multiple onChange={onCaptureChange} className="sr-only" aria-label="Upload letter images" />
      {photos.length === 0 ? <div className="grid gap-3 sm:grid-cols-2">
        <Button onClick={onAddPage} className="h-28 flex-col gap-3 bg-[#006f7b] text-base text-white hover:bg-[#005b65]"><Camera className="size-7" /> Take a photo</Button>
        <Button onClick={() => uploadInputRef.current?.click()} variant="outline" className="h-28 flex-col gap-3 border-[#b8c9d2] text-base text-[#24505b] hover:bg-[#edf7f9]"><Upload className="size-7" /> Upload from device</Button>
      </div> : <div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo, index) => <div key={`${photo.name}-${index}`} className="relative aspect-[4/5] overflow-hidden rounded-md border border-[#cbd8df] bg-[#eef3f6]"><Image src={photo.src} alt={`Page ${index + 1}`} fill unoptimized sizes="(max-width: 640px) 45vw, 200px" className="object-cover" /><span className="absolute bottom-2 left-2 rounded bg-[#173256] px-2 py-1 text-xs font-bold text-white">Page {index + 1}</span><button type="button" onClick={() => onRemovePage(index)} className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white text-[#8b2530] shadow" aria-label={`Remove page ${index + 1}`}><X className="size-4" /></button></div>)}
        <button type="button" onClick={onAddPage} className="flex aspect-[4/5] flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed border-[#9cb4bf] bg-[#f6fafb] text-sm font-bold text-[#31606a] hover:bg-[#edf7f9]"><ImagePlus className="size-7" /> Add another page</button>
      </div><p className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#31703f]"><CheckCircle2 className="size-4" /> {photos.length} {photos.length === 1 ? "page" : "pages"} ready</p></div>}
      <button type="button" onClick={() => setShowPhotoHelp(!showPhotoHelp)} className="mt-5 flex items-center gap-2 text-sm font-bold text-[#006f7b] hover:underline"><CircleHelp className="size-4" /> Help me take the photo</button>
      {showPhotoHelp && <div className="mt-3 rounded-md bg-[#eef4f7] p-4 text-sm leading-6 text-[#526578]"><ul className="grid gap-1 sm:grid-cols-2"><li>Place the whole letter inside the frame.</li><li>Use bright, even light.</li><li>Avoid shadows across the page.</li><li>Keep your phone still.</li></ul></div>}
      {photos.length === 0 && <div className="mt-6 border-t border-[#dbe4ea] pt-5 text-center"><p className="text-sm text-[#66778a]">No letter nearby?</p><Button variant="ghost" onClick={onUseSample} className="mt-1 w-full whitespace-normal text-[#006f7b] hover:bg-[#edf7f9]"><FileText className="size-4" /> Try the Wessex Water sample</Button></div>}
      <label className="mt-5 block text-sm font-bold text-[#31475d]">Or paste the text from your letter<textarea className="form-input mt-2" rows={4} maxLength={100000} value={sourceText} onChange={event => setSourceText(event.target.value)} placeholder="Paste your letter here if you have a digital copy or cannot use the camera." /></label>
      {(photos.length > 0 || sourceText.trim().length >= 20) && <Button onClick={onAnalyse} className="mt-6 h-12 w-full whitespace-normal bg-[#006f7b] text-base leading-5 text-white hover:bg-[#005b65]">Read my letter <ChevronRight className="size-5" /></Button>}
    </div>
  </div>;
}

function TaskDetails({ task, onComplete, onEdit, onDelete, onUpdate }: { task: SupportTask; onComplete: () => void; onEdit: () => void; onDelete: () => void; onUpdate: (task: SupportTask) => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reading, setReading] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const meta = statusMeta[task.status];
  const readAloudText = `${task.title}. ${task.summary} ${task.nextStep ?? ""} ${task.dueDate ? `Deadline: ${task.dueDate}.` : ""}`;
  useEffect(() => () => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);
  function readAloud() {
    if (!("speechSynthesis" in window)) { setSpeechError("Read-aloud is unavailable in this browser. Your device’s screen reader can still read this page."); return; }
    window.speechSynthesis.cancel();
    if (reading) { setReading(false); return; }
    setSpeechError("");
    const message = new SpeechSynthesisUtterance(readAloudText);
    message.lang = "en-GB"; message.rate = 0.92;
    message.onend = () => setReading(false);
    message.onerror = event => { setReading(false); if (event.error !== "canceled" && event.error !== "interrupted") setSpeechError("The voice could not start. Check your browser’s speech support."); };
    setReading(true); window.speechSynthesis.speak(message);
  }
  return <div>
    <DialogHeader className="pr-8"><span className={`mb-2 w-fit rounded-full px-3 py-1 text-xs font-bold status-${meta.tone}`}>{meta.label}</span><DialogTitle className="text-2xl leading-8 text-[#173256]">{task.title}</DialogTitle><DialogDescription className="text-base">{task.organisation}</DialogDescription></DialogHeader>
    <Button variant="outline" onClick={readAloud} className="mt-3 border-[#b8c9d2] text-[#24505b] hover:bg-[#edf7f9]"><Volume2 className="size-4" /> {reading ? "Stop reading" : "Read this to me"}</Button>
    {speechError && <p role="status" className="mt-2 text-sm text-[#71828b]">{speechError}</p>}
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={onEdit}>Edit action / notes</Button>{task.deadline && <Button variant="outline" onClick={() => downloadFile("support-deadline.ics", calendarEvent(task), "text/calendar")}>Add to calendar</Button>}<Button variant="outline" onClick={() => downloadFile("support-action.txt", `${task.title}\n${task.organisation}\n\n${task.summary}\n\nNext step: ${task.nextStep ?? ""}\nDeadline: ${task.deadline ?? "None"}\n\nNotes: ${task.notes ?? ""}`, "text/plain")}>Export action</Button></div>
      <section><h3 className="text-sm font-bold uppercase text-[#718094]">What this means</h3><p className="mt-2 text-base leading-7 text-[#465b6e]">{task.summary}</p></section>
      {task.nextStep && <section><h3 className="text-sm font-bold uppercase text-[#718094]">What you need to do</h3><p className="mt-2 font-bold leading-7 text-[#173256]">{task.nextStep}</p></section>}
      {task.dueDate && <section className="rounded-md bg-[#fff5f0] p-4"><h3 className="flex items-center gap-2 text-sm font-bold uppercase text-[#9f2e3a]"><CalendarDays className="size-4" /> Deadline</h3><p className="mt-2 text-lg font-bold text-[#6f2028]">{task.dueDate}</p>{task.dueLabel && <p className="mt-1 text-sm font-semibold text-[#9f2e3a]">{task.dueLabel}</p>}</section>}
      {task.documents && <section><h3 className="text-sm font-bold uppercase text-[#718094]">What you may need</h3><ul className="mt-3 space-y-2">{task.documents.map((document) => <li key={document} className="flex items-center gap-3 text-[#465b6e]"><FileText className="size-4 text-[#006f7b]" /> {document}</li>)}</ul></section>}
      {task.notes && <section><h3 className="font-bold">My notes</h3><p className="mt-2 whitespace-pre-wrap text-[#465b6e]">{task.notes}</p></section>}
      {task.sourceText && <details><summary className="cursor-pointer font-bold">Original letter text</summary><p className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm leading-6">{task.sourceText}</p></details>}
      <CaseWorkspace task={task} onUpdate={onUpdate} />
      {task.reminder && <p className="flex items-center gap-2 border-t border-[#dbe4ea] pt-4 text-sm font-semibold text-[#526578]"><Bell className="size-4 text-[#006f7b]" /> Calendar reminder included when exported</p>}
      {task.status === "action" && <Button onClick={onComplete} className="h-12 w-full bg-[#147a43] text-base text-white hover:bg-[#0e6336]"><Check className="size-5" /> I’ve done this</Button>}
      {task.status === "completed" && <p className="flex items-center justify-center gap-2 rounded-md bg-[#eaf6ee] p-4 font-bold text-[#23683c]"><CheckCircle2 className="size-5" /> Completed</p>}
      {confirmDelete ? <div className="rounded-md bg-red-50 p-4"><p className="text-sm">Delete this action permanently? Export it first if you need a copy.</p><div className="mt-3 flex gap-2"><Button variant="destructive" onClick={onDelete}>Delete action</Button><Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button></div></div> : <button className="text-sm font-semibold text-red-700 underline" onClick={() => setConfirmDelete(true)}>Delete action</button>}
    </div>
  </div>;
}
