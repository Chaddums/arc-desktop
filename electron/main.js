const {
  app,
  BrowserWindow,
  dialog,
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
// Disable GPU to prevent DXGI_ERROR_DEVICE_REMOVED crashes in games
app.disableHardwareAcceleration();

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

  const onScreen = saved && isPositionOnScreen(saved.x, saved.y);

  mainWindow = new BrowserWindow({
    width: saved?.width ?? 900,
    height: saved?.height ?? 650,
    x: onScreen ? saved.x : undefined,
    y: onScreen ? saved.y : undefined,
    minWidth: 380,
    minHeight: 500,
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

  let shown = false;
  const showOnce = () => {
    if (shown || !mainWindow || mainWindow.isDestroyed()) return;
    shown = true;
    if (currentMode === "main") mainWindow.show();
  };
  mainWindow.once("ready-to-show", showOnce);
  setTimeout(showOnce, 5000); // fallback if content fails to load

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
      // Also hide overlay so it doesn't linger on screen
      if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.hide();
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
  // Prefer cursor position — user is likely looking at the game when pressing F9
  const cursorPoint = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursorPoint);
  const { x, y, width: dw, height: dh } = display.workArea;
  return {
    x: x + dw - width - OVERLAY_MARGIN,
    y: y + dh - height - OVERLAY_MARGIN,
  };
}

/**
 * Find the game window and position the overlay at its bottom-right,
 * aligned with the Steam overlay icon area.
 */
async function positionOverlayOnGame() {
  try {
    const { getWindowBounds } = require("./windowFinder");
    const gameBounds = await getWindowBounds("PioneerGame");
    if (gameBounds) {
      const initHeight = 200;
      saveOverlaySettings({
        x: gameBounds.x + gameBounds.width - OVERLAY_WIDTH - OVERLAY_MARGIN,
        y: gameBounds.y + gameBounds.height - initHeight - OVERLAY_MARGIN,
      });
      return;
    }
  } catch {}
  // Fallback: saved position or cursor-based default will be used
}

function createOverlayWindow(url) {
  const saved = loadOverlaySettings();
  const initHeight = 200;
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

  // "floating" stays above normal windows and most games without fighting
  // the GPU the way "screen-saver" does (avoids DXGI_ERROR_DEVICE_REMOVED)
  overlayWindow.setAlwaysOnTop(true, "floating");

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
      // Show once content is ready (toggleMode may have requested it before load)
      if (currentMode === "overlay") overlayWindow.show();
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
    // Hide main first, ensure it's gone before overlay appears
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide();
    }
    if (!overlayWindow || overlayWindow.isDestroyed()) {
      // Try to position on the game's display
      await positionOverlayOnGame();
      // First creation — ready-to-show handler will call .show()
      createOverlayWindow(serverUrl);
    } else {
      overlayWindow.show();
    }
  } else {
    currentMode = "main";
    // Hide overlay first
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.hide();
    }
    if (!mainWindow || mainWindow.isDestroyed()) {
      createMainWindow(serverUrl);
    } else {
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
    default: [900, 650],
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

  // Audio only — overlay toast handles the visual notification
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
  // Always forward so the renderer can detect hover on the lock button
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
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

// ─── Overlay Drag (IPC-based, works with setIgnoreMouseEvents) ───
let dragInterval = null;
let dragOffset = null;

ipcMain.on("overlay-start-drag", () => {
  if (!overlayWindow || overlayWindow.isDestroyed() || overlayLocked) return;
  const cursor = screen.getCursorScreenPoint();
  const bounds = overlayWindow.getBounds();
  dragOffset = { x: cursor.x - bounds.x, y: cursor.y - bounds.y };

  if (dragInterval) clearInterval(dragInterval);
  dragInterval = setInterval(() => {
    if (!overlayWindow || overlayWindow.isDestroyed() || !dragOffset) {
      clearInterval(dragInterval);
      dragInterval = null;
      return;
    }
    const pos = screen.getCursorScreenPoint();
    overlayWindow.setPosition(pos.x - dragOffset.x, pos.y - dragOffset.y);
  }, 16); // ~60fps
});

ipcMain.on("overlay-stop-drag", () => {
  if (dragInterval) {
    clearInterval(dragInterval);
    dragInterval = null;
  }
  dragOffset = null;
  // Save final position
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    const { x, y } = overlayWindow.getBounds();
    saveOverlaySettings({ x, y });
  }
});

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

// ─── Single Instance Lock ────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    // Focus existing window when user tries to launch again
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

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
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.destroy();
  if (gameDetector) gameDetector.stop();
  if (screenCapture) screenCapture.destroy();
});

app.on("window-all-closed", () => {
  // Keep running if tray exists
  if (!tray && process.platform !== "darwin") app.quit();
});

} // end single-instance else
