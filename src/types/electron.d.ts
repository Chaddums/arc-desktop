/**
 * Type declarations for the Electron contextBridge API.
 * Available as `window.arcDesktop` when running inside arc-desktop.
 */

interface OCRResult {
  text: string;
  zone: string;
  confidence: number;
  timestamp: number;
  error?: string;
}

interface OCRSettings {
  enabled: boolean;
  captureIntervalMs: number;
  matchThreshold: number;
  activeZones: string[];
}

interface OCRStatus {
  scanning: boolean;
  workerReady: boolean;
}

interface OCRTestResult {
  screenWidth: number;
  screenHeight: number;
  zones: { zone: string; width: number; height: number }[];
}

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

  // ─── OCR ──────────────────────────────────────────────────────

  /** Start OCR scanning */
  startOCR: () => void;

  /** Stop OCR scanning */
  stopOCR: () => void;

  /** Listen for OCR results. Returns unsubscribe function. */
  onOCRResult: (cb: (result: OCRResult) => void) => () => void;

  /** Update OCR settings in main process */
  updateOCRSettings: (settings: Partial<OCRSettings>) => void;

  /** Get current OCR scanning status */
  getOCRStatus: () => Promise<OCRStatus>;

  /** Run a test capture and return zone info */
  testOCRCapture: () => Promise<OCRTestResult | null>;

  // ─── Window Controls (frameless title bar) ──────────────────

  /** Minimize the window */
  windowMinimize: () => void;

  /** Toggle maximize/unmaximize */
  windowMaximize: () => void;

  /** Close the window */
  windowClose: () => void;

  /** Check if window is maximized */
  windowIsMaximized: () => Promise<boolean>;

  /** Set window to a size preset */
  windowSetSize: (preset: "default" | "large" | "xl") => void;
}

declare global {
  interface Window {
    arcDesktop?: ArcDesktopAPI;
  }
}

export {};
