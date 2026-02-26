const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  Notification,
} = require("electron");
const http = require("http");
const path = require("path");
const fs = require("fs");

const DEV = process.argv.includes("--dev");
const DIST = path.join(__dirname, "..", "dist");

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
};

// ─── State ──────────────────────────────────────────────────────
let mainWindow = null;
let overlayWindow = null;
let tray = null;
let currentMode = "main"; // "main" | "overlay"
let serverUrl = null;
let gameDetector = null;

// ─── Alert settings ─────────────────────────────────────────────
let alertSettings = { notifyOnEvent: true, audioAlerts: true, audioVolume: 0.75 };
const notifiedEvents = new Set();

// ─── Static file server ─────────────────────────────────────────
function serve(dir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      let filePath = path.join(dir, pathname);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
        fs.createReadStream(filePath).pipe(res);
      } else {
        // SPA fallback
        res.writeHead(200, { "Content-Type": "text/html" });
        fs.createReadStream(path.join(dir, "index.html")).pipe(res);
      }
    });

    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

// ─── Windows ────────────────────────────────────────────────────
function createMainWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 380,
    minHeight: 600,
    backgroundColor: "#0a0e12",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      webSecurity: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    if (currentMode === "main") mainWindow.show();
  });

  mainWindow.on("close", (e) => {
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

function createOverlayWindow(url) {
  overlayWindow = new BrowserWindow({
    width: 420,
    height: 64,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      webSecurity: false,
    },
  });

  overlayWindow.setAlwaysOnTop(true, "screen-saver");

  overlayWindow.on("closed", () => {
    overlayWindow = null;
  });

  const separator = url.includes("?") ? "&" : "?";
  overlayWindow.loadURL(url + separator + "overlay=1");
}

// ─── Mode Toggle ────────────────────────────────────────────────
function toggleMode() {
  if (currentMode === "main") {
    currentMode = "overlay";
    if (mainWindow) mainWindow.hide();
    if (!overlayWindow) createOverlayWindow(serverUrl);
    if (overlayWindow) overlayWindow.show();
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

  const contextMenu = Menu.buildFromTemplate([
    { label: modeLabel, click: toggleMode },
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

ipcMain.on("set-ignore-mouse-events", (event, ignore, opts) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setIgnoreMouseEvents(ignore, opts);
  }
});

ipcMain.on("overlay-resize", (_event, width, height) => {
  if (overlayWindow) {
    overlayWindow.setSize(Math.round(width), Math.round(height));
  }
});

ipcMain.on("event-started", (_event, eventData) => {
  if (!alertSettings.notifyOnEvent) return;

  const key = `${eventData.name}-${eventData.map}`;
  if (notifiedEvents.has(key)) return;
  notifiedEvents.add(key);
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

// ─── App Lifecycle ──────────────────────────────────────────────
app.whenReady().then(async () => {
  if (DEV) {
    serverUrl = "http://localhost:8081";
  } else {
    const port = await serve(DIST);
    serverUrl = `http://127.0.0.1:${port}`;
  }

  createMainWindow(serverUrl);
  createOverlayWindow(serverUrl);
  createTray();

  // Game detection
  try {
    const GameDetector = require("./gameDetector");
    gameDetector = new GameDetector();
    gameDetector.onChange((running) => {
      broadcast("game-status", running);
      updateTrayMenu();
      if (running && currentMode === "main") {
        toggleMode();
      } else if (!running && currentMode === "overlay") {
        toggleMode();
      }
    });
    gameDetector.start();
  } catch {
    // gameDetector.js not available
  }

  // F9 = toggle overlay
  globalShortcut.register("F9", toggleMode);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow(serverUrl);
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  if (gameDetector) gameDetector.stop();
});

app.on("window-all-closed", () => {
  if (!tray && process.platform !== "darwin") app.quit();
});
