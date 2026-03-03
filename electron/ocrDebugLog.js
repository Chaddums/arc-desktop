/**
 * ocrDebugLog — Rotating file logger for OCR results.
 * Writes every OCR result to a log file for debugging visibility.
 */

const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const MAX_SIZE = 500 * 1024; // 500KB
const KEEP_SIZE = 250 * 1024; // keep last ~250KB on rotation

let logPath = null;
/** In-memory ring buffer of recent entries for the debug panel */
const recentEntries = [];
const MAX_RECENT = 200;

function getLogPath() {
  if (!logPath) {
    logPath = path.join(app.getPath("userData"), "ocr-debug.log");
  }
  return logPath;
}

function formatTime(ts) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function logOCRResult(result) {
  const time = formatTime(result.timestamp || Date.now());
  const zone = result.zone || "unknown";
  const conf = result.confidence != null ? Math.round(result.confidence) : 0;
  const text = result.text || "";
  const line = `[${time}] [${zone}] (${conf}%) "${text}"`;

  // Push to in-memory buffer
  const entry = { time, zone, confidence: conf, text, empty: !text };
  recentEntries.push(entry);
  if (recentEntries.length > MAX_RECENT) {
    recentEntries.splice(0, recentEntries.length - MAX_RECENT);
  }

  // Append to file
  try {
    const filePath = getLogPath();
    fs.appendFileSync(filePath, line + "\n");

    // Auto-rotate if too large
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_SIZE) {
      const content = fs.readFileSync(filePath, "utf8");
      const trimmed = content.slice(content.length - KEEP_SIZE);
      // Cut at first newline to avoid partial line
      const firstNewline = trimmed.indexOf("\n");
      fs.writeFileSync(filePath, firstNewline >= 0 ? trimmed.slice(firstNewline + 1) : trimmed);
    }
  } catch {
    // Silent — logging should never break the app
  }
}

function getRecentEntries(count = 50) {
  const n = Math.min(count, recentEntries.length);
  return recentEntries.slice(-n).reverse();
}

function clearLog() {
  recentEntries.length = 0;
  try {
    fs.writeFileSync(getLogPath(), "");
  } catch {
    // ignore
  }
}

module.exports = { logOCRResult, getRecentEntries, clearLog, getLogPath };
