// =============================================================================
// State Persistence — per-item JSON files + global scan state
// Zero dependencies — uses Node.js built-in fs
// =============================================================================

import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJsonSafe(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    console.error(`[State] Corrupted JSON: ${filePath}, backing up.`);
    try { fs.copyFileSync(filePath, filePath + ".bak"); } catch { /* best effort */ }
    return null;
  }
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Global scan state
// ---------------------------------------------------------------------------

export function loadScanState(stateDir) {
  return readJsonSafe(path.join(stateDir, "scan-state.json")) || {
    lastRun: new Date(0).toISOString(),
    passCount: 0,
    sprint: "",
    devName: "",
    devEmail: "",
  };
}

export function saveScanState(stateDir, state) {
  writeJson(path.join(stateDir, "scan-state.json"), state);
}

// ---------------------------------------------------------------------------
// Per-work-item state
// ---------------------------------------------------------------------------

export function loadWorkItemState(stateDir, id) {
  return readJsonSafe(path.join(stateDir, `wi-${id}.json`));
}

export function saveWorkItemState(stateDir, state) {
  writeJson(path.join(stateDir, `wi-${state.id}.json`), state);
}

export function removeWorkItemState(stateDir, id) {
  const p = path.join(stateDir, `wi-${id}.json`);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

export function listTrackedWorkItemIds(stateDir) {
  if (!fs.existsSync(stateDir)) return [];
  return fs.readdirSync(stateDir)
    .filter((f) => /^wi-\d+\.json$/.test(f))
    .map((f) => parseInt(f.replace("wi-", "").replace(".json", ""), 10))
    .filter((n) => !isNaN(n));
}

// ---------------------------------------------------------------------------
// Last scan result + activity log
// ---------------------------------------------------------------------------

export function saveLastScanResult(stateDir, result) {
  writeJson(path.join(stateDir, "last-scan.json"), result);
}

export function logActivity(stateDir, entry) {
  ensureDir(stateDir);
  try {
    fs.appendFileSync(
      path.join(stateDir, "activity.jsonl"),
      JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + "\n"
    );
  } catch { /* best effort */ }
}

// ---------------------------------------------------------------------------
// Timestamp-based skip
// ---------------------------------------------------------------------------

export function needsRescan(savedState, wiChangedDate) {
  if (!savedState) return true;
  return new Date(wiChangedDate) > new Date(savedState.lastScanAt);
}
