/**
 * ScreenCapture — Captures the game window, crops to predefined zones,
 * and dispatches cropped buffers to the OCR worker thread.
 */

const { desktopCapturer, nativeImage } = require("electron");
const { Worker } = require("worker_threads");
const path = require("path");
const CAPTURE_ZONES = require("./captureZones");

class ScreenCapture {
  constructor(onResult) {
    this._onResult = onResult;
    this._timer = null;
    this._intervalMs = 1500;
    this._worker = null;
    this._activeZones = CAPTURE_ZONES.map((z) => z.id);
    this._workerReady = false;
  }

  get scanning() {
    return this._timer !== null;
  }

  get workerReady() {
    return this._workerReady;
  }

  updateSettings(settings) {
    if (settings.captureIntervalMs) {
      this._intervalMs = settings.captureIntervalMs;
      // Restart loop with new interval if currently scanning
      if (this._timer) {
        this.stop();
        this.start();
      }
    }
    if (settings.activeZones) {
      this._activeZones = settings.activeZones;
    }
  }

  start() {
    if (this._timer) return;

    // Spin up worker
    if (!this._worker) {
      this._worker = new Worker(path.join(__dirname, "ocrWorker.js"));
      this._worker.on("message", (result) => {
        this._workerReady = true;
        if (this._onResult && result.text) {
          this._onResult(result);
        }
      });
      this._worker.on("error", (err) => {
        console.error("[ScreenCapture] Worker error:", err.message);
      });
    }

    this._capture(); // immediate first capture
    this._timer = setInterval(() => this._capture(), this._intervalMs);
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  destroy() {
    this.stop();
    if (this._worker) {
      this._worker.terminate().catch(() => {});
      this._worker = null;
      this._workerReady = false;
    }
  }

  async testCapture() {
    try {
      const image = await this._getScreenImage();
      if (!image) return null;

      const size = image.getSize();
      const zones = this._getActiveZones();
      const results = [];

      for (const zone of zones) {
        const crop = this._cropZone(image, size, zone);
        if (crop) {
          results.push({ zone: zone.id, width: crop.getSize().width, height: crop.getSize().height });
        }
      }

      return { screenWidth: size.width, screenHeight: size.height, zones: results };
    } catch {
      return null;
    }
  }

  async _capture() {
    try {
      const image = await this._getScreenImage();
      if (!image) return;

      const size = image.getSize();
      const zones = this._getActiveZones();
      const timestamp = Date.now();

      for (const zone of zones) {
        const crop = this._cropZone(image, size, zone);
        if (crop) {
          this._worker.postMessage({
            buffer: crop.toPNG(),
            zone: zone.id,
            timestamp,
          });
        }
      }
    } catch {
      // Silent — capture can fail if game window closes mid-capture
    }
  }

  async _getScreenImage() {
    const sources = await desktopCapturer.getSources({
      types: ["window"],
      thumbnailSize: { width: 1920, height: 1080 },
    });

    // Try to find the game window
    const gameSource = sources.find(
      (s) =>
        s.name.includes("ArcRaiders") ||
        s.name.includes("Arc Raiders") ||
        s.name.includes("UnrealWindow")
    );

    if (gameSource) return gameSource.thumbnail;

    // Fallback: capture primary screen
    const screenSources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1920, height: 1080 },
    });

    return screenSources[0]?.thumbnail || null;
  }

  _getActiveZones() {
    return CAPTURE_ZONES.filter((z) => this._activeZones.includes(z.id));
  }

  _cropZone(image, size, zone) {
    const x = Math.round(zone.x * size.width);
    const y = Math.round(zone.y * size.height);
    const width = Math.round(zone.width * size.width);
    const height = Math.round(zone.height * size.height);

    // Bounds check
    if (x + width > size.width || y + height > size.height) return null;
    if (width < 10 || height < 10) return null;

    return nativeImage.createFromBitmap(
      image.crop({ x, y, width, height }).toBitmap(),
      { width, height }
    );
  }
}

module.exports = ScreenCapture;
