import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";

const root = fileURLToPath(new URL("../", import.meta.url));
async function isApp(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return response.ok && (await response.text()).includes("Personal support workspace");
  } catch { return false; }
}
async function available(port) {
  return new Promise(resolve => {
    const probe = createServer();
    probe.once("error", () => resolve(false));
    probe.listen(port, "localhost", () => probe.close(() => resolve(true)));
  });
}
function openBrowser(url) {
  const command = process.platform === "win32" ? "powershell.exe" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["-NoProfile", "-Command", `Start-Process '${url}'`] : [url];
  const browser = spawn(command, args, { windowsHide: true, stdio: "ignore" });
  browser.on("error", () => console.log(`Open this address in your browser: ${url}`));
}

let port;
for (let candidate = 5173; candidate <= 5183; candidate++) {
  const url = `http://localhost:${candidate}`;
  if (await isApp(url)) {
    console.log(`Water Support is ready: ${url}`);
    openBrowser(url);
    process.exit(0);
  }
  if (port === undefined && await available(candidate)) port = candidate;
}
if (port === undefined) throw new Error("Ports 5173–5183 are busy. Close an old preview and try again.");

console.log("Starting Water Support. Keep this window open while using the app.");
const prepare = spawn(process.execPath, ["scripts/prepare-ocr.mjs"], { cwd: root, stdio: "inherit" });
const prepared = await new Promise(resolve => { prepare.once("exit", resolve); prepare.once("error", () => resolve(1)); });
if (prepared !== 0) throw new Error("Dependencies are missing. Run npm.cmd ci in the app folder first.");
const server = spawn(process.execPath, ["scripts/run-framework.mjs", "dev", "--port", String(port)], { cwd: root, stdio: "inherit" });
server.on("error", error => { console.error(error.message); process.exitCode = 1; });
process.on("SIGINT", () => { server.kill(); process.exit(0); });
const url = `http://localhost:${port}`;
let opened = false;
for (let attempt = 0; attempt < 90; attempt++) {
  if (server.exitCode !== null) break;
  if (await isApp(url)) { console.log(`Water Support is ready: ${url}`); openBrowser(url); opened = true; break; }
  await new Promise(resolve => setTimeout(resolve, 1000));
}
if (!opened) { server.kill(); console.error("The app did not start. Check the error above; do not use a folder preview server."); process.exitCode = 1; }
