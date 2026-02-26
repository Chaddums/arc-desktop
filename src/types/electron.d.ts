/**
 * Type declarations for the Electron contextBridge API.
 * Available as `window.arcDesktop` when running inside arc-desktop.
 */

interface ArcDesktopAPI {
  /** True when this window was loaded with ?overlay=1 */
  isOverlay: boolean;

  /** Get current mode ("main" | "overlay") */
  getMode: () => Promise<string>;

  /** Listen for mode changes. Returns unsubscribe function. */
  onModeChange: (cb: (mode: string) => void) => () => void;

  /** Toggle click-through on the overlay window */
  setIgnoreMouseEvents: (ignore: boolean, opts?: { forward?: boolean }) => void;

  /** Listen for game running/stopped. Returns unsubscribe function. */
  onGameStatusChange: (cb: (running: boolean) => void) => () => void;

  /** Resize overlay window */
  resizeOverlay: (width: number, height: number) => void;

  /** Notify main that a game event started */
  notifyEventStarted: (event: { name: string; map: string }) => void;

  /** Update alert settings in main process */
  updateAlertSettings: (settings: {
    notifyOnEvent: boolean;
    audioAlerts: boolean;
    audioVolume: number;
  }) => void;

  /** Listen for play-alert-sound signal. Returns unsubscribe function. */
  onPlayAlertSound: (cb: () => void) => () => void;
}

declare global {
  interface Window {
    arcDesktop?: ArcDesktopAPI;
  }
}

export {};
