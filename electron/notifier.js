/**
 * EventNotifier — System notifications + audio alert signaling.
 * Runs in main process. Tracks notified events to avoid duplicates.
 */

const { Notification } = require("electron");

class EventNotifier {
  constructor() {
    this._settings = { notifyOnEvent: true, audioAlerts: true, audioVolume: 0.75 };
    this._notifiedKeys = new Set();
  }

  configure(settings) {
    this._settings = { ...this._settings, ...settings };
  }

  /**
   * Notify about a game event. Returns true if notification was sent.
   * @param {{ name: string, map: string }} event
   * @param {Function} broadcastFn - calls broadcast("play-alert-sound") to renderers
   */
  notify(event, broadcastFn) {
    if (!this._settings.notifyOnEvent) return false;

    const key = `${event.name}-${event.map}`;
    if (this._notifiedKeys.has(key)) return false;
    this._notifiedKeys.add(key);

    // Expire key after 10 minutes
    setTimeout(() => this._notifiedKeys.delete(key), 10 * 60 * 1000);

    if (Notification.isSupported()) {
      const notif = new Notification({
        title: "ARC View - Event Started",
        body: `${event.name} on ${event.map}`,
        silent: true,
      });
      notif.show();
    }

    if (this._settings.audioAlerts && broadcastFn) {
      broadcastFn();
    }

    return true;
  }
}

module.exports = EventNotifier;
