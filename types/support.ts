
export type TaskStatus = "action" | "waiting" | "completed";
export type SupportView = "home" | "letters" | "planner" | "support" | "community";

export type SupportTask = {
    id: string;
    title: string;
    organisation: string;
    customerId?: string;
    status: TaskStatus;
    urgency?: "urgent" | "soon" | "normal";
    dueLabel?: string;
    dueDate?: string;
    summary: string;
    nextStep?: string;
    documents?: string[];
    reminder?: boolean;
    deadline?: string;
    notes?: string;
    sourceText?: string;
    createdAt?: string;
    checklist?: { id: string; title: string; done: boolean }[];
    activity?: { id: string; at: string; kind: "note" | "call" | "email" | "webchat" | "letter" | "status"; text: string }[];
    category?: "billing" | "service" | "accessibility" | "complaint";
    resolution?: string;
};

export type LetterDocument = {
    id: string;
    userId: string;
    organisation: string;
    originalFileName: string;
    uploadedAt: string;
    pageCount: number;
    processingStatus: "uploaded" | "processing" | "needs-review" | "complete" | "failed";
    storageKey?: string;
};

export type DocumentPage = {
    id: string;
    documentId:string;
    pageNumber: number;
    imageStorageKey: string;
    qualityStatus: "unchecked" | "clear" | "blurry" | "too-dark" | "cropped";
    ocrText?:string;
    ocrConfidence?:number;
};

export type ExtractedInformation = {
    documentId: string;
    organisation?: string;
    letterDate?: string;
    deadlines: string[];
    actions: string[];
    requiredDocuments: string[];
    appointments: string[];
    importantInformation: string[];
    plainEnglishSummary: string;
    confidence: number;
    confirmationState: "pending" | "confirmed" | "edited";
};
