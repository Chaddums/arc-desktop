/**
 * Preload script — contextBridge API for ARC View Desktop overlay.
 * Exposes `window.arcDesktop` to renderer processes.
 */

const { contextBridge, ipcRenderer } = require("electron");

const isOverlay = new URLSearchParams(window.location.search).has("overlay");

contextBridge.exposeInMainWorld("arcDesktop", {
  /** True when this window was loaded with ?overlay=1 */
  isOverlay,

  /** Get current mode ("main" | "overlay") */
  getMode: () => ipcRenderer.invoke("get-mode"),

  // ─── Window Controls (frameless title bar) ──────────────────
  windowMinimize: () => ipcRenderer.send("window-minimize"),
  windowMaximize: () => ipcRenderer.send("window-maximize"),
  windowClose: () => ipcRenderer.send("window-close"),
  windowIsMaximized: () => ipcRenderer.invoke("window-is-maximized"),
  windowSetSize: (preset) => ipcRenderer.send("window-set-size", preset),

  /** Listen for mode changes */
  onModeChange: (cb) => {
    const handler = (_event, mode) => cb(mode);
    ipcRenderer.on("mode-changed", handler);
    return () => ipcRenderer.removeListener("mode-changed", handler);
  },

  /** Toggle click-through on the overlay window */
  setIgnoreMouseEvents: (ignore, opts) => {
    ipcRenderer.send("set-ignore-mouse-events", ignore, opts || {});
  },

  /** Listen for game running/stopped status */
  onGameStatusChange: (cb) => {
    const handler = (_event, running) => cb(running);
    ipcRenderer.on("game-status", handler);
    return () => ipcRenderer.removeListener("game-status", handler);
  },

  /** Resize overlay window (used by checklist) */
  resizeOverlay: (width, height) => {
    ipcRenderer.send("overlay-resize", width, height);
  },

  /** Notify main process that an event started */
  notifyEventStarted: (event) => {
    ipcRenderer.send("event-started", event);
  },

  /** Update alert settings in main process */
  updateAlertSettings: (settings) => {
    ipcRenderer.send("update-alert-settings", settings);
  },

  /** Listen for play-alert-sound signal */
  onPlayAlertSound: (cb) => {
    const handler = (_event) => cb();
    ipcRenderer.on("play-alert-sound", handler);
    return () => ipcRenderer.removeListener("play-alert-sound", handler);
  },

  // ─── OCR ──────────────────────────────────────────────────────

  /** Start OCR scanning */
  startOCR: () => ipcRenderer.send("start-ocr"),

  /** Stop OCR scanning */
  stopOCR: () => ipcRenderer.send("stop-ocr"),

  /** Listen for OCR results */
  onOCRResult: (cb) => {
    const handler = (_event, result) => cb(result);
    ipcRenderer.on("ocr-result", handler);
    return () => ipcRenderer.removeListener("ocr-result", handler);
  },

  /** Update OCR settings in main process */
  updateOCRSettings: (settings) => {
    ipcRenderer.send("update-ocr-settings", settings);
  },

  /** Get current OCR scanning status */
  getOCRStatus: () => ipcRenderer.invoke("get-ocr-status"),

  /** Run a test capture and return zone info */
  testOCRCapture: () => ipcRenderer.invoke("test-ocr-capture"),

  /** Restart the app */
  restartApp: () => ipcRenderer.send("restart-app"),
});
