/**
 * ScreenCapture — Captures the game window via a persistent MediaStream,
 * crops to predefined zones, and dispatches cropped buffers to the OCR worker.
 *
 * Uses a hidden BrowserWindow + getDisplayMedia to maintain one persistent
 * DXGI output duplication session, instead of repeatedly calling
 * desktopCapturer.getSources() which cycles DXGI sessions and causes
 * GPU contention (mouse stuttering, DXGI_ERROR_DEVICE_REMOVED crashes).
 */

const {
  desktopCapturer,
  BrowserWindow,
  ipcMain,
  session,
} = require("electron");
const { Worker } = require("worker_threads");
const path = require("path");
const CAPTURE_ZONES = require("./captureZones");

const CAPTURE_PARTITION = "capture";

class ScreenCapture {
  constructor(onResult) {
    this._onResult = onResult;
    this._intervalMs = 1500;
    this._worker = null;
    this._activeZones = CAPTURE_ZONES.map((z) => z.id);
    this._workerReady = false;

    this._captureWindow = null;
    this._streamReady = false;
    this._scanning = false;
    this._recovering = false;
    this._initInProgress = false;
    this._streamReadyResolve = null;

    // Bound IPC handlers (stored for cleanup in destroy())
    this._boundOnZoneBuffer = this._onZoneBuffer.bind(this);
    this._boundOnStatus = this._onStatus.bind(this);
    ipcMain.on("capture:zone-buffer", this._boundOnZoneBuffer);
    ipcMain.on("capture:status", this._boundOnStatus);
  }

  get scanning() {
    return this._scanning;
  }

  get workerReady() {
    return this._workerReady;
  }

  updateSettings(settings) {
    if (settings.captureIntervalMs) {
      this._intervalMs = settings.captureIntervalMs;
    }
    if (settings.activeZones) {
      this._activeZones = settings.activeZones;
    }
    if (this._captureWindow && !this._captureWindow.isDestroyed()) {
      this._captureWindow.webContents.send("capture:update-settings", {
        zones: this._getActiveZones(),
        intervalMs: this._intervalMs,
      });
    }
  }

  async start() {
    if (this._scanning) return;
    this._scanning = true;
    this._ensureWorker();

    if (this._streamReady) {
      // Stream already alive (stop() pauses timer but keeps stream)
      if (this._captureWindow && !this._captureWindow.isDestroyed()) {
        this._captureWindow.webContents.send("capture:start");
      }
      return;
    }

    // Create stream — retries internally if game window isn't found yet
    this._tryConnect();
  }

  stop() {
    this._scanning = false;
    // Pause timer but keep stream alive — avoids recreating DXGI session
    if (this._captureWindow && !this._captureWindow.isDestroyed()) {
      this._captureWindow.webContents.send("capture:stop");
    }
  }

  destroy() {
    this.stop();
    this._destroyCaptureWindow();
    ipcMain.removeListener("capture:zone-buffer", this._boundOnZoneBuffer);
    ipcMain.removeListener("capture:status", this._boundOnStatus);
    if (this._worker) {
      this._worker.terminate().catch(() => {});
      this._worker = null;
      this._workerReady = false;
    }
  }

  async testCapture() {
    // If stream isn't ready, try setting it up
    if (!this._streamReady) {
      const ok = await this._initCaptureWindow();
      if (!ok) return null;
    }

    if (!this._captureWindow || this._captureWindow.isDestroyed()) return null;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        cleanup();
        resolve(null);
      }, 3000);

      const handler = (event, result) => {
        if (
          !this._captureWindow ||
          event.sender !== this._captureWindow.webContents
        )
          return;
        cleanup();
        resolve(result);
      };

      const cleanup = () => {
        clearTimeout(timeout);
        ipcMain.removeListener("capture:test-result", handler);
      };

      ipcMain.on("capture:test-result", handler);
      this._captureWindow.webContents.send("capture:test");
    });
  }

  // ── Private ─────────────────────────────────────────────────

  _ensureWorker() {
    if (this._worker) return;
    this._worker = new Worker(path.join(__dirname, "ocrWorker.js"));
    this._worker.on("message", (result) => {
      this._workerReady = true;
      if (this._onResult) {
        if (!result.text) result.empty = true;
        this._onResult(result);
      }
    });
    this._worker.on("error", (err) => {
      console.error("[ScreenCapture] Worker error:", err.message);
    });
  }

  _onZoneBuffer(event, data) {
    if (
      !this._captureWindow ||
      event.sender !== this._captureWindow.webContents
    )
      return;
    if (!this._worker) return;
    this._worker.postMessage({
      buffer: Buffer.from(data.buffer),
      zone: data.zone,
      timestamp: data.timestamp,
    });
  }

  _onStatus(event, data) {
    if (
      !this._captureWindow ||
      event.sender !== this._captureWindow.webContents
    )
      return;

    if (data.type === "ready") {
      this._streamReady = true;
      console.log(
        `[ScreenCapture] Stream ready: ${data.width}x${data.height}`
      );
      if (this._streamReadyResolve) {
        this._streamReadyResolve(true);
        this._streamReadyResolve = null;
      }
      // If start() was called, begin capturing
      if (this._scanning && this._captureWindow) {
        this._captureWindow.webContents.send("capture:start");
      }
    } else if (data.type === "ended") {
      console.log("[ScreenCapture] Stream ended");
      this._streamReady = false;
      this._recover();
    } else if (data.type === "error") {
      console.error("[ScreenCapture] Stream error:", data.message);
      this._streamReady = false;
      if (this._streamReadyResolve) {
        this._streamReadyResolve(false);
        this._streamReadyResolve = null;
      }
      this._recover();
    }
  }

  async _findGameSource() {
    const sources = await desktopCapturer.getSources({
      types: ["window"],
      thumbnailSize: { width: 1, height: 1 },
    });

    const gameSource = sources.find(
      (s) =>
        s.name.includes("ArcRaiders") ||
        s.name.includes("Arc Raiders") ||
        s.name.includes("UnrealWindow")
    );

    if (gameSource) return gameSource;

    // Fallback: capture primary screen
    const screenSources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1, height: 1 },
    });

    return screenSources[0] || null;
  }

  async _tryConnect() {
    if (!this._scanning || this._streamReady) return;

    const ok = await this._initCaptureWindow();
    if (ok) return; // Stream ready, _onStatus already sent capture:start

    // Retry in 2s — game window might not be visible yet
    if (this._scanning) {
      setTimeout(() => this._tryConnect(), 2000);
    }
  }

  async _initCaptureWindow() {
    if (this._initInProgress) return false;
    this._initInProgress = true;

    try {
      const source = await this._findGameSource();
      if (!source) {
        console.log("[ScreenCapture] No capture source found");
        return false;
      }

      this._destroyCaptureWindow();

      // Configure isolated session to auto-grant display media with our source
      const ses = session.fromPartition(CAPTURE_PARTITION);
      ses.setDisplayMediaRequestHandler((_request, callback) => {
        callback({ video: source });
      });

      const captureWin = new BrowserWindow({
        show: false,
        width: 1,
        height: 1,
        skipTaskbar: true,
        webPreferences: {
          preload: path.join(__dirname, "capturePreload.js"),
          contextIsolation: true,
          nodeIntegration: false,
          session: ses,
        },
      });

      this._captureWindow = captureWin;

      // Guard: only clean up if this is still the current capture window
      captureWin.on("closed", () => {
        if (this._captureWindow === captureWin) {
          this._captureWindow = null;
          this._streamReady = false;
        }
      });

      await captureWin.loadFile(path.join(__dirname, "captureWindow.html"));

      // Tell the renderer to call getDisplayMedia and set up capture
      captureWin.webContents.send("capture:setup", {
        zones: this._getActiveZones(),
        intervalMs: this._intervalMs,
      });

      // Wait for stream to become ready (or fail/timeout)
      return await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          this._streamReadyResolve = null;
          resolve(false);
        }, 8000);

        this._streamReadyResolve = (ok) => {
          clearTimeout(timeout);
          resolve(ok);
        };
      });
    } catch (err) {
      console.error("[ScreenCapture] Init failed:", err.message);
      return false;
    } finally {
      this._initInProgress = false;
    }
  }

  _destroyCaptureWindow() {
    this._streamReady = false;
    if (this._streamReadyResolve) {
      this._streamReadyResolve(false);
      this._streamReadyResolve = null;
    }
    // Null the reference before destroying so the closed handler
    // doesn't accidentally null a newer window reference
    const win = this._captureWindow;
    this._captureWindow = null;
    if (win && !win.isDestroyed()) {
      win.destroy();
    }
  }

  async _recover() {
    if (this._recovering || !this._scanning) return;
    this._recovering = true;
    console.log("[ScreenCapture] Recovering in 2s...");

    await new Promise((r) => setTimeout(r, 2000));
    this._recovering = false;

    if (this._scanning) {
      this._tryConnect();
    }
  }

  _getActiveZones() {
    return CAPTURE_ZONES.filter((z) => this._activeZones.includes(z.id));
  }
}

module.exports = ScreenCapture;
