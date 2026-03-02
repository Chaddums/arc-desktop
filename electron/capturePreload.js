/**
 * capturePreload — Minimal contextBridge for the hidden capture window.
 * All channels prefixed `capture:` to avoid collisions with the main app.
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("captureIPC", {
  // Main → Capture window
  onSetup: (cb) => ipcRenderer.on("capture:setup", (_e, data) => cb(data)),
  onStart: (cb) => ipcRenderer.on("capture:start", () => cb()),
  onStop: (cb) => ipcRenderer.on("capture:stop", () => cb()),
  onUpdateSettings: (cb) =>
    ipcRenderer.on("capture:update-settings", (_e, data) => cb(data)),
  onTestCapture: (cb) => ipcRenderer.on("capture:test", () => cb()),

  // Capture window → Main
  sendZoneBuffer: (data) => ipcRenderer.send("capture:zone-buffer", data),
  sendStatus: (data) => ipcRenderer.send("capture:status", data),
  sendTestResult: (data) => ipcRenderer.send("capture:test-result", data),
});
