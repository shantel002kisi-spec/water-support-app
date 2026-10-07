import { copyFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const target = path.join(root, "public", "ocr");
await mkdir(target, { recursive: true });
await copyFile(path.join(root, "node_modules/tesseract.js/dist/worker.min.js"), path.join(target, "worker.min.js"));
await copyFile(path.join(root, "node_modules/tesseract.js/dist/worker.min.js.LICENSE.txt"), path.join(target, "worker.LICENSE.txt"));
const core = path.join(root, "node_modules/tesseract.js-core");
for (const name of await readdir(core)) {
  if (name.endsWith(".wasm.js") || name.endsWith(".wasm") || name === "LICENSE") await copyFile(path.join(core, name), path.join(target, name));
}
await copyFile(path.join(root, "node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz"), path.join(target, "eng.traineddata.gz"));
console.log("Local OCR worker, WebAssembly cores and English model prepared.");
