const {
  app,
  BrowserWindow,
  protocol,
  net,
  globalShortcut,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  Notification,
  screen,
} = require("electron");
const { pathToFileURL } = require("url");
const path = require("path");
const fs = require("fs");
const DEV = process.argv.includes("--dev");
const DIST = path.join(__dirname, "..", "dist");
const GEOMETRY_FILE = path.join(app.getPath("userData"), "window-geometry.json");
const OVERLAY_SETTINGS_FILE = path.join(app.getPath("userData"), "overlay-settings.json");

// ─── Window Geometry Persistence ─────────────────────────────────
function loadGeometry() {
  try {
    if (fs.existsSync(GEOMETRY_FILE)) {
      return JSON.parse(fs.readFileSync(GEOMETRY_FILE, "utf8"));
    }
  } catch { /* ignore */ }
  return null;
}

function saveGeometry(win) {
  if (!win || win.isDestroyed()) return;
  try {
    const bounds = win.getBounds();
    const isMaximized = win.isMaximized();
    fs.writeFileSync(GEOMETRY_FILE, JSON.stringify({ ...bounds, isMaximized }));
  } catch { /* ignore */ }
}

// ─── State ──────────────────────────────────────────────────────
let mainWindow = null;
let overlayWindow = null;
let tray = null;
let currentMode = "main"; // "main" | "overlay"
let serverUrl = DEV ? "http://localhost:8081" : "app://dist/index.html";
let gameDetector = null;
let screenCapture = null;

// ─── Alert settings ─────────────────────────────────────────────
let alertSettings = { notifyOnEvent: true, audioAlerts: true, audioVolume: 0.75 };
const notifiedEvents = new Set();

// ─── OCR settings ───────────────────────────────────────────────
let ocrSettings = {
  enabled: true,
  captureIntervalMs: 1500,
  matchThreshold: 0.7,
  activeZones: ["objectiveComplete", "itemPickup", "killFeed", "centerPopup"],
};

// ─── Windows ────────────────────────────────────────────────────
function createMainWindow(url) {
  const saved = loadGeometry();

  mainWindow = new BrowserWindow({
    width: saved?.width ?? 1200,
    height: saved?.height ?? 800,
    x: saved?.x,
    y: saved?.y,
    minWidth: 380,
    minHeight: 600,
    backgroundColor: "#0a0e12",
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: "hidden",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      webSecurity: false,
    },
  });

  if (saved?.isMaximized) mainWindow.maximize();

  mainWindow.once("ready-to-show", () => {
    if (currentMode === "main") mainWindow.show();
  });

  // Save geometry on move/resize (debounced)
  let geoTimer = null;
  const debounceSaveGeo = () => {
    clearTimeout(geoTimer);
    geoTimer = setTimeout(() => saveGeometry(mainWindow), 500);
  };
  mainWindow.on("move", debounceSaveGeo);
  mainWindow.on("resize", debounceSaveGeo);

  mainWindow.on("close", (e) => {
    saveGeometry(mainWindow);
    // If tray exists, hide to tray instead of quitting
    if (tray && !app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.loadURL(url);

  if (DEV) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

const OVERLAY_WIDTH = 420;
const OVERLAY_MARGIN = 12;

let overlayLocked = false;

// ─── Overlay Settings Persistence ────────────────────────────────
function loadOverlaySettings() {
  try {
    if (fs.existsSync(OVERLAY_SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(OVERLAY_SETTINGS_FILE, "utf8"));
    }
  } catch { /* ignore */ }
  return null;
}

function saveOverlaySettings(settings) {
  try {
    const current = loadOverlaySettings() || {};
    fs.writeFileSync(OVERLAY_SETTINGS_FILE, JSON.stringify({ ...current, ...settings }));
  } catch { /* ignore */ }
}

function isPositionOnScreen(x, y) {
  const displays = screen.getAllDisplays();
  return displays.some((d) => {
    const { x: dx, y: dy, width: dw, height: dh } = d.workArea;
    return x >= dx && x < dx + dw && y >= dy && y < dy + dh;
  });
}

function getDefaultOverlayPosition(width, height) {
  const display = mainWindow && !mainWindow.isDestroyed()
    ? screen.getDisplayMatching(mainWindow.getBounds())
    : screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const { x, y, width: dw, height: dh } = display.workArea;
  return {
    x: x + OVERLAY_MARGIN,
    y: y + dh - height - OVERLAY_MARGIN,
  };
}

function createOverlayWindow(url) {
  const saved = loadOverlaySettings();
  const initHeight = 64;
  const startPos = (saved && isPositionOnScreen(saved.x, saved.y))
    ? { x: saved.x, y: saved.y }
    : getDefaultOverlayPosition(OVERLAY_WIDTH, initHeight);

  overlayLocked = !!(saved && saved.locked);

  overlayWindow = new BrowserWindow({
    width: OVERLAY_WIDTH,
    height: initHeight,
    x: startPos.x,
    y: startPos.y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: !overlayLocked,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      webSecurity: false,
    },
  });

  // Set always-on-top level for in-game overlay
  overlayWindow.setAlwaysOnTop(true, "screen-saver");

  // Persist position on drag (debounced)
  let overlayMoveTimer = null;
  overlayWindow.on("move", () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    clearTimeout(overlayMoveTimer);
    overlayMoveTimer = setTimeout(() => {
      if (!overlayWindow || overlayWindow.isDestroyed()) return;
      const { x, y } = overlayWindow.getBounds();
      saveOverlaySettings({ x, y });
    }, 500);
  });

  overlayWindow.once("ready-to-show", () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      applyOverlayLockState();
      overlayWindow.webContents.send("overlay-lock-changed", overlayLocked);
    }
  });

  overlayWindow.on("closed", () => {
    overlayWindow = null;
  });

  const separator = url.includes("?") ? "&" : "?";
  overlayWindow.loadURL(url + separator + "overlay=1");
}

// ─── Mode Toggle ────────────────────────────────────────────────
async function toggleMode() {
  if (currentMode === "main") {
    currentMode = "overlay";
    if (mainWindow) mainWindow.hide();
    if (!overlayWindow) createOverlayWindow(serverUrl);
    if (overlayWindow) {
      overlayWindow.show();
    }
  } else {
    currentMode = "main";
    if (overlayWindow) overlayWindow.hide();
    if (!mainWindow) createMainWindow(serverUrl);
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  }
  broadcast("mode-changed", currentMode);
  updateTrayMenu();
}

function broadcast(channel, ...args) {
  if (mainWindow) mainWindow.webContents.send(channel, ...args);
  if (overlayWindow) overlayWindow.webContents.send(channel, ...args);
}

// ─── Tray ───────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, "..", "assets", "tray-icon.png");
  let icon;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath).resize({ width: 32, height: 32 });
  } else {
    // Fallback: use app icon or create empty
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip("ARC View");
  updateTrayMenu();

  tray.on("click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function updateTrayMenu() {
  if (!tray) return;

  const gameRunning = gameDetector ? gameDetector.isRunning : false;
  const modeLabel = currentMode === "main" ? "Switch to Overlay" : "Switch to Desktop";

  const lockLabel = overlayLocked ? "Unlock Overlay (Shift+F9)" : "Lock Overlay (Shift+F9)";

  const contextMenu = Menu.buildFromTemplate([
    { label: modeLabel, click: toggleMode },
    {
      label: lockLabel,
      enabled: currentMode === "overlay",
      click: () => setOverlayLock(!overlayLocked),
    },
    { type: "separator" },
    {
      label: mainWindow && mainWindow.isVisible() ? "Hide Window" : "Show Window",
      click: () => {
        if (mainWindow && mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          if (!mainWindow) createMainWindow(serverUrl);
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: "separator" },
    {
      label: gameRunning ? "Arc Raiders: Running" : "Arc Raiders: Not Detected",
      enabled: false,
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

// ─── IPC Handlers ───────────────────────────────────────────────
ipcMain.handle("get-mode", () => currentMode);

// Restart app
ipcMain.on("restart-app", () => {
  app.relaunch();
  app.exit(0);
});

// Window controls (frameless title bar)
ipcMain.on("window-minimize", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});
ipcMain.on("window-maximize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.isMaximized() ? win.unmaximize() : win.maximize();
});
ipcMain.on("window-close", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});
ipcMain.handle("window-is-maximized", (event) => {
  return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
});

// Window size presets
ipcMain.on("window-set-size", (_event, preset) => {
  if (!mainWindow) return;
  const sizes = {
    default: [1200, 800],
    large: [1440, 900],
    xl: [1680, 1050],
  };
  const [w, h] = sizes[preset] || sizes.default;
  mainWindow.unmaximize();
  mainWindow.setSize(w, h);
  mainWindow.center();
});

ipcMain.on("set-ignore-mouse-events", (event, ignore, opts) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setIgnoreMouseEvents(ignore, opts);
  }
});

ipcMain.on("overlay-resize", (_event, width, height) => {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  const bounds = overlayWindow.getBounds();
  let newY = bounds.y;
  // If bottom edge would exceed screen, push y upward (overlay grows up from bottom)
  const display = screen.getDisplayMatching(bounds);
  const screenBottom = display.workArea.y + display.workArea.height;
  if (newY + height > screenBottom) {
    newY = screenBottom - height;
  }
  overlayWindow.setBounds({ x: bounds.x, y: newY, width: Math.round(width), height: Math.round(height) });
});

ipcMain.on("event-started", (_event, eventData) => {
  if (!alertSettings.notifyOnEvent) return;

  const key = `${eventData.name}-${eventData.map}`;
  if (notifiedEvents.has(key)) return;
  notifiedEvents.add(key);

  // Clear from set after 10 minutes to allow re-notification
  setTimeout(() => notifiedEvents.delete(key), 10 * 60 * 1000);

  if (Notification.isSupported()) {
    const notif = new Notification({
      title: "ARC View - Event Started",
      body: `${eventData.name} on ${eventData.map}`,
      silent: true,
    });
    notif.show();
  }

  if (alertSettings.audioAlerts) {
    broadcast("play-alert-sound");
  }
});

ipcMain.on("update-alert-settings", (_event, settings) => {
  alertSettings = { ...alertSettings, ...settings };
});

// ─── Overlay Lock ───────────────────────────────────────────────
function applyOverlayLockState() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  overlayWindow.setMovable(!overlayLocked);
  if (overlayLocked) {
    overlayWindow.setIgnoreMouseEvents(true, { forward: false });
  } else {
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  }
}

function setOverlayLock(locked) {
  overlayLocked = locked;
  applyOverlayLockState();
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send("overlay-lock-changed", overlayLocked);
  }
  saveOverlaySettings({ locked: overlayLocked });
  updateTrayMenu();
}

ipcMain.on("overlay-set-locked", (_event, locked) => {
  setOverlayLock(!!locked);
});

ipcMain.handle("overlay-get-locked", () => overlayLocked);

// ─── OCR IPC Handlers ───────────────────────────────────────────
ipcMain.on("start-ocr", () => {
  if (screenCapture && ocrSettings.enabled) screenCapture.start();
});

ipcMain.on("stop-ocr", () => {
  if (screenCapture) screenCapture.stop();
});

ipcMain.on("update-ocr-settings", (_event, settings) => {
  ocrSettings = { ...ocrSettings, ...settings };
  if (screenCapture) {
    screenCapture.updateSettings(ocrSettings);
    if (!ocrSettings.enabled) screenCapture.stop();
  }
});

ipcMain.handle("get-ocr-status", () => ({
  scanning: screenCapture ? screenCapture.scanning : false,
  workerReady: screenCapture ? screenCapture.workerReady : false,
}));

ipcMain.handle("test-ocr-capture", async () => {
  if (!screenCapture) return null;
  return screenCapture.testCapture();
});

// ─── Custom Protocol ────────────────────────────────────────────
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

// ─── App Lifecycle ──────────────────────────────────────────────
app.whenReady().then(() => {
  // protocol.handle is the modern API (Electron 25+)
  protocol.handle("app", (request) => {
    const { pathname } = new URL(request.url);
    const filePath = path.join(DIST, decodeURIComponent(pathname));

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return net.fetch(pathToFileURL(filePath).href);
    }
    // SPA fallback
    return net.fetch(pathToFileURL(path.join(DIST, "index.html")).href);
  });

  createMainWindow(serverUrl);
  createOverlayWindow(serverUrl);
  createTray();

  // Screen capture for OCR
  try {
    const ScreenCapture = require("./screenCapture");
    screenCapture = new ScreenCapture((result) => {
      broadcast("ocr-result", result);
    });
    screenCapture.updateSettings(ocrSettings);
  } catch {
    // screenCapture deps not available
  }

  // Game detection (lazy-loaded)
  try {
    const GameDetector = require("./gameDetector");
    gameDetector = new GameDetector();
    gameDetector.onChange((running) => {
      broadcast("game-status", running);
      updateTrayMenu();

      // Auto-switch: game starts → overlay, game stops → main
      if (running && currentMode === "main") {
        toggleMode();
      } else if (!running && currentMode === "overlay") {
        toggleMode();
      }

      // OCR: start scanning when game runs, stop when it exits
      if (screenCapture && ocrSettings.enabled) {
        if (running) {
          screenCapture.start();
        } else {
          screenCapture.stop();
        }
      }
    });
    gameDetector.start();
  } catch {
    // gameDetector.js not yet created — Phase 2
  }

  // F9 = toggle overlay, Shift+F9 = toggle overlay lock
  globalShortcut.register("F9", toggleMode);
  globalShortcut.register("Shift+F9", () => setOverlayLock(!overlayLocked));

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow(serverUrl);
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  if (gameDetector) gameDetector.stop();
  if (screenCapture) screenCapture.destroy();
});

app.on("window-all-closed", () => {
  // Keep running if tray exists
  if (!tray && process.platform !== "darwin") app.quit();
});
