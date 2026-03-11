/**
 * gameFileWatcher — Watches ARC Raiders local save files for changes
 * and parses them to extract player data (tracked recipes, game settings).
 *
 * Save files location: %LOCALAPPDATA%/PioneerGame/Saved/SaveGames/
 * Format: GVAS (Unreal Engine binary save format)
 */

const fs = require("fs");
const path = require("path");
const { parseGVAS } = require("./gvasParser");

// ARC Raiders stores saves under this path (Embark's internal name is "PioneerGame")
const SAVE_DIR = path.join(
  process.env.LOCALAPPDATA || "",
  "PioneerGame",
  "Saved",
  "SaveGames"
);

const CONFIG_DIR = path.join(
  process.env.LOCALAPPDATA || "",
  "PioneerGame",
  "Saved",
  "Config",
  "WindowsClient"
);

/** Files we care about and what they contain */
const WATCHED_FILES = {
  recipeTracker: {
    pattern: /^RecipeTracker_.*\.sav$/,
    parse: parseRecipeTracker,
  },
  options: {
    pattern: /^EmbarkOptionSaveGame\.sav$/,
    parse: parseGameOptions,
  },
};

class GameFileWatcher {
  /**
   * @param {function} onChange - Called with { type, data } when a watched file changes
   */
  constructor(onChange) {
    this._onChange = onChange;
    this._watchers = [];
    this._debounceTimers = {};
    this._lastData = {};
  }

  /** Start watching game save directory */
  start() {
    if (!fs.existsSync(SAVE_DIR)) {
      console.log("[gameFiles] Save directory not found:", SAVE_DIR);
      return false;
    }

    console.log("[gameFiles] Watching:", SAVE_DIR);

    // Do an initial scan of all files
    this._scanAll();

    // Watch save directory for changes
    try {
      const watcher = fs.watch(SAVE_DIR, (eventType, filename) => {
        if (!filename) return;
        this._onFileChange(SAVE_DIR, filename);
      });
      this._watchers.push(watcher);
    } catch (err) {
      console.error("[gameFiles] Watch error:", err.message);
    }

    // Also watch GameUserSettings.ini for resolution changes
    if (fs.existsSync(CONFIG_DIR)) {
      try {
        const cfgWatcher = fs.watch(CONFIG_DIR, (eventType, filename) => {
          if (filename === "GameUserSettings.ini") {
            this._debounceParse("gameUserSettings", () => {
              this._parseGameUserSettings();
            });
          }
        });
        this._watchers.push(cfgWatcher);
      } catch (err) {
        console.error("[gameFiles] Config watch error:", err.message);
      }
      // Initial parse
      this._parseGameUserSettings();
    }

    return true;
  }

  /** Stop all watchers */
  stop() {
    for (const w of this._watchers) {
      try { w.close(); } catch { /* ignore */ }
    }
    this._watchers = [];
    for (const t of Object.values(this._debounceTimers)) {
      clearTimeout(t);
    }
    this._debounceTimers = {};
  }

  /** Get the last parsed data for a type */
  getLastData(type) {
    return this._lastData[type] || null;
  }

  /** Force a re-scan of all files */
  rescan() {
    this._scanAll();
  }

  // ─── Internal ──────────────────────────────────────────────────

  _scanAll() {
    try {
      const files = fs.readdirSync(SAVE_DIR);
      for (const file of files) {
        this._onFileChange(SAVE_DIR, file);
      }
    } catch (err) {
      console.error("[gameFiles] Scan error:", err.message);
    }
  }

  _onFileChange(dir, filename) {
    for (const [type, spec] of Object.entries(WATCHED_FILES)) {
      if (spec.pattern.test(filename)) {
        this._debounceParse(type, () => {
          const filePath = path.join(dir, filename);
          this._parseFile(type, filePath, spec.parse);
        });
        break;
      }
    }
  }

  _debounceParse(key, fn) {
    clearTimeout(this._debounceTimers[key]);
    this._debounceTimers[key] = setTimeout(fn, 500);
  }

  _parseFile(type, filePath, parseFn) {
    try {
      if (!fs.existsSync(filePath)) return;
      const buffer = fs.readFileSync(filePath);
      const gvas = parseGVAS(buffer);
      if (!gvas) {
        console.log(`[gameFiles] Failed to parse ${type}: null result`);
        return;
      }
      const data = parseFn(gvas);
      if (data) {
        this._lastData[type] = data;
        this._onChange({ type, data });
        console.log(`[gameFiles] Parsed ${type}:`, JSON.stringify(data).slice(0, 200));
      }
    } catch (err) {
      console.error(`[gameFiles] Parse error (${type}):`, err.message);
    }
  }

  _parseGameUserSettings() {
    try {
      const filePath = path.join(CONFIG_DIR, "GameUserSettings.ini");
      if (!fs.existsSync(filePath)) return;
      const content = fs.readFileSync(filePath, "utf8");
      const settings = parseIni(content);
      const data = {
        resolutionX: parseInt(settings["ResolutionSizeX"]) || null,
        resolutionY: parseInt(settings["ResolutionSizeY"]) || null,
        windowedResX: parseInt(settings["WindowedResolutionSizeX"]) || null,
        windowedResY: parseInt(settings["WindowedResolutionSizeY"]) || null,
        fullscreenMode: parseInt(settings["FullscreenMode"]) ?? null,
        vsync: settings["bUseVSync"] === "True",
        frameRateLimit: parseFloat(settings["FrameRateLimit"]) || 0,
      };
      this._lastData["resolution"] = data;
      this._onChange({ type: "resolution", data });
      console.log(`[gameFiles] Game resolution: ${data.resolutionX}x${data.resolutionY}`);
    } catch (err) {
      console.error("[gameFiles] INI parse error:", err.message);
    }
  }
}

// ─── File Parsers ──────────────────────────────────────────────────

/** Extract tracked recipes from RecipeTracker save */
function parseRecipeTracker(gvas) {
  const props = gvas.properties;
  if (!props) return null;

  const descriptors = props.RecipeDescriptors;
  if (!Array.isArray(descriptors)) return null;

  const recipes = [];
  let ownerId = null;

  for (const entry of descriptors) {
    const recipe = {
      sourceTypeId: entry.SourceTypeId ?? null,
      sourceLookupId: entry.SourceLookupId ?? null,
      ownerId: entry.OwnerId ?? null,
    };
    if (recipe.ownerId && !ownerId) ownerId = recipe.ownerId;
    recipes.push(recipe);
  }

  return { ownerId, recipes };
}

/** Extract game options from EmbarkOptionSaveGame */
function parseGameOptions(gvas) {
  const props = gvas.properties;
  if (!props) return null;

  const optionsMap = props.Properties;
  if (!optionsMap || typeof optionsMap !== "object") return null;

  // MapProperty returns { _mapKeyType, _mapValueType, entries, map }
  // Use the .map sub-object for convenient string key access
  const rawMap = optionsMap.map || optionsMap;

  const settings = {};
  for (const [key, value] of Object.entries(rawMap)) {
    // Skip internal metadata keys
    if (key.startsWith("_map")) continue;
    settings[key] = typeof value === "string" ? value : String(value);
  }

  return { version: props.Version ?? null, settings };
}

/** Simple INI parser — extract key=value pairs (ignores sections) */
function parseIni(content) {
  const result = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("[") || trimmed.startsWith(";")) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      result[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
    }
  }
  return result;
}

module.exports = GameFileWatcher;
