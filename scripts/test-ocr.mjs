import { createWorker } from "tesseract.js";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = fileURLToPath(new URL("../", import.meta.url));
const worker = await createWorker("eng", 1, { langPath: `${root}/public/ocr`, cachePath: `${root}/.sites-runtime/ocr-cache` });
try {
  const result = await worker.recognize(`${root}/public/sample-community-fund.png`);
  assert.ok(result.data.text.length > 100, "Sample should produce readable text");
  assert.match(result.data.text, /community|fund/i);
  console.log(`Real sample OCR passed (${result.data.text.length} characters, confidence ${result.data.confidence}).`);
} finally { await worker.terminate(); }
