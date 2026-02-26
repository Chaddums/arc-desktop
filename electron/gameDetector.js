/**
 * GameDetector — Polls for ArcRaiders.exe via tasklist.
 * No injection, no native deps, fully EAC-safe.
 */

const { execFile } = require("child_process");

class GameDetector {
  constructor(intervalMs = 5000) {
    this._interval = intervalMs;
    this._timer = null;
    this._running = false;
    this._listeners = [];
  }

  get isRunning() {
    return this._running;
  }

  onChange(cb) {
    this._listeners.push(cb);
  }

  start() {
    if (this._timer) return;
    this._poll();
    this._timer = setInterval(() => this._poll(), this._interval);
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  _poll() {
    execFile(
      "tasklist",
      ["/FI", "IMAGENAME eq ArcRaiders.exe", "/NH", "/FO", "CSV"],
      { windowsHide: true },
      (err, stdout) => {
        if (err) return;
        const found = stdout.includes("ArcRaiders.exe");
        if (found !== this._running) {
          this._running = found;
          for (const cb of this._listeners) {
            try { cb(found); } catch {}
          }
        }
      }
    );
  }
}

module.exports = GameDetector;
