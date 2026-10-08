"use client";

import { useEffect } from "react";

type PdfViewport = { width: number; height: number };
type PdfPage = {
  getViewport: (options: { scale: number }) => PdfViewport;
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: PdfViewport }) => { promise: Promise<void> };
};
type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
};
type PdfJs = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (options: { data: ArrayBuffer }) => { promise: Promise<PdfDocument> };
};

declare global {
  interface Window {
    pdfjsLib?: PdfJs;
    __pdfJsLoading?: Promise<PdfJs>;
  }
}

const PDF_JS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDF_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

function loadPdfJs(): Promise<PdfJs> {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
    return Promise.resolve(window.pdfjsLib);
  }
  if (window.__pdfJsLoading) return window.__pdfJsLoading;

  window.__pdfJsLoading = new Promise<PdfJs>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PDF_JS_URL}"]`);
    const script = existing ?? document.createElement("script");

    const finish = () => {
      if (!window.pdfjsLib) {
        reject(new Error("The PDF reader could not start."));
        return;
      }
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
      resolve(window.pdfjsLib);
    };

    if (existing) {
      if (window.pdfjsLib) finish();
      else {
        existing.addEventListener("load", finish, { once: true });
        existing.addEventListener("error", () => reject(new Error("The PDF reader could not be loaded.")), { once: true });
      }
      return;
    }

    script.src = PDF_JS_URL;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => reject(new Error("The PDF reader could not be loaded.")), { once: true });
    document.head.appendChild(script);
  });

  return window.__pdfJsLoading;
}

async function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("A PDF page could not be converted to an image."));
    }, "image/png");
  });
}

async function pdfToImages(file: File): Promise<File[]> {
  if (file.size > 20 * 1024 * 1024) throw new Error("Choose a PDF smaller than 20 MB.");

  const pdfjs = await loadPdfJs();
  const documentData = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: documentData }).promise;

  if (pdf.numPages > 8) throw new Error("Choose a PDF with no more than 8 pages.");

  const pages: File[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.6 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Your browser could not prepare this PDF page.");

    await page.render({ canvasContext: context, viewport }).promise;
    const blob = await canvasToPng(canvas);
    const base = file.name.replace(/\.pdf$/i, "");
    pages.push(new File([blob], `${base}-page-${pageNumber}.png`, { type: "image/png", lastModified: Date.now() }));
  }

  return pages;
}

function patchUploadInputs() {
  document.querySelectorAll<HTMLInputElement>('input[type="file"]').forEach((input) => {
    if (input.getAttribute("aria-label") === "Upload letter images") {
      input.accept = "image/*,application/pdf,.pdf";
      input.setAttribute("aria-label", "Upload letter images or PDF");
    }
  });
}

export function PdfUploadBridge() {
  useEffect(() => {
    patchUploadInputs();
    const observer = new MutationObserver(patchUploadInputs);
    observer.observe(document.body, { childList: true, subtree: true });

    const onChangeCapture = async (event: Event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== "file" || !input.files?.length) return;

      const selected = Array.from(input.files);
      const pdfFiles = selected.filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
      if (!pdfFiles.length) return;

      event.stopImmediatePropagation();

      try {
        const converted: File[] = [];
        for (const file of selected) {
          if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
            converted.push(...await pdfToImages(file));
          } else {
            converted.push(file);
          }
        }

        if (converted.length > 8) throw new Error("Choose files containing no more than 8 pages in total.");

        const transfer = new DataTransfer();
        converted.forEach((file) => transfer.items.add(file));
        input.files = transfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      } catch (error) {
        input.value = "";
        const message = error instanceof Error ? error.message : "This PDF could not be opened.";
        window.alert(`${message}\n\nYou can also upload a photo or paste the letter text.`);
      }
    };

    document.addEventListener("change", onChangeCapture, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("change", onChangeCapture, true);
    };
  }, []);

  return null;
}
