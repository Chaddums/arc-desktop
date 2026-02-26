const { app, BrowserWindow } = require("electron");
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
};

// Tiny static file server for dist/ — behaves like a normal web server
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

function createWindow(url) {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 380,
    minHeight: 600,
    backgroundColor: "#0a0e12",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false,
    },
  });

  win.once("ready-to-show", () => win.show());
  win.loadURL(url);
}

app.whenReady().then(async () => {
  let url;
  if (DEV) {
    url = "http://localhost:8081";
  } else {
    const port = await serve(DIST);
    url = `http://127.0.0.1:${port}`;
  }

  createWindow(url);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(url);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
