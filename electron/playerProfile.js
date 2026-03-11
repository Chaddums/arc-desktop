// playerProfile.js — Persistent local player profile built from OCR events and game file data.
// CommonJS module for Electron main process.

const fs = require("fs");
const path = require("path");

// ─── Constants ─────────────────────────────────────────
const SAVE_DEBOUNCE_MS = 2000;
const PICKUP_DEDUP_WINDOW_MS = 5000;
const MAX_PICKUPS_PER_ITEM = 50;
const MAX_SESSIONS = 20;

// ─── Helpers ───────────────────────────────────────────

/** Normalize an item/objective name for use as a dedup key. */
function normalize(text) {
  return (text || "").toLowerCase().trim().replace(/\s+/g, " ");
}

/** Generate a simple session ID from the current timestamp. */
function makeSessionId() {
  return `session-${Date.now()}`;
}

/** Return a fresh, empty profile data object. */
function emptyProfile() {
  return {
    playerId: null,
    lastUpdated: new Date().toISOString(),
    items: {},
    objectives: {},
    recipes: [],
    gameSettings: {},
    sessions: [],
    currentSession: null,
  };
}

// ─── PlayerProfile ─────────────────────────────────────

class PlayerProfile {
  /**
   * @param {string} filePath — Full absolute path to the profile JSON file,
   *   e.g. `path.join(app.getPath("userData"), "player-profile.json")`.
   */
  constructor(filePath) {
    this._filePath = filePath;
    this._saveTimer = null;
    this._data = emptyProfile();
    this._load();
  }

  // ─── Item Tracking ─────────────────────────────────

  /**
   * Record an item pickup detected via OCR.
   * Deduplicates if the same normalised item was recorded within the last 5 s.
   *
   * @param {string} itemName — Raw OCR text for the item name.
   * @param {number} quantity — How many were picked up (default 1).
   */
  recordItemPickup(itemName, quantity = 1) {
    const key = normalize(itemName);
    if (!key) return;

    const now = new Date().toISOString();
    const nowMs = Date.now();

    // Initialise entry if first time seeing this item.
    if (!this._data.items[key]) {
      this._data.items[key] = {
        name: itemName.trim(),
        totalPickedUp: 0,
        firstSeen: now,
        lastSeen: now,
        pickups: [],
      };
    }

    const item = this._data.items[key];

    // Dedup: skip if same item was recorded within the cooldown window.
    if (item.pickups.length > 0) {
      const lastPickup = item.pickups[item.pickups.length - 1];
      const lastMs = new Date(lastPickup.timestamp).getTime();
      if (nowMs - lastMs < PICKUP_DEDUP_WINDOW_MS) {
        return;
      }
    }

    // Keep the "best" display name — prefer longer strings (more complete OCR read).
    if (itemName.trim().length > item.name.length) {
      item.name = itemName.trim();
    }

    item.totalPickedUp += quantity;
    item.lastSeen = now;

    const sessionId = this._data.currentSession
      ? this._data.currentSession.id
      : null;

    item.pickups.push({ quantity, timestamp: now, sessionId });

    // Cap pickup history.
    if (item.pickups.length > MAX_PICKUPS_PER_ITEM) {
      item.pickups = item.pickups.slice(-MAX_PICKUPS_PER_ITEM);
    }

    // Update current session counter.
    if (this._data.currentSession) {
      this._data.currentSession.itemsCollected += quantity;
    }

    this._save();
  }

  /**
   * Get all tracked items.
   * @returns {{ name: string, totalPickedUp: number, lastSeen: string, sessions: string[] }[]}
   */
  getItems() {
    return Object.values(this._data.items).map((item) => {
      // Collect unique session IDs from pickup history.
      const sessions = [
        ...new Set(item.pickups.map((p) => p.sessionId).filter(Boolean)),
      ];
      return {
        name: item.name,
        totalPickedUp: item.totalPickedUp,
        lastSeen: item.lastSeen,
        sessions,
      };
    });
  }

  /**
   * Get items picked up in the current session only.
   * @returns {{ name: string, quantity: number }[]}
   */
  getSessionItems() {
    const session = this._data.currentSession;
    if (!session) return [];

    const results = [];
    for (const item of Object.values(this._data.items)) {
      const sessionPickups = item.pickups.filter(
        (p) => p.sessionId === session.id
      );
      if (sessionPickups.length > 0) {
        const quantity = sessionPickups.reduce((sum, p) => sum + p.quantity, 0);
        results.push({ name: item.name, quantity });
      }
    }
    return results;
  }

  // ─── Quest / Objective Tracking ────────────────────

  /**
   * Record an objective completion event detected via OCR.
   *
   * @param {string} objectiveText — The objective text as read by OCR.
   * @param {string} [zone]       — Optional zone/area name.
   */
  recordObjectiveComplete(objectiveText, zone) {
    const key = normalize(objectiveText);
    if (!key) return;

    const now = new Date().toISOString();

    if (!this._data.objectives[key]) {
      this._data.objectives[key] = {
        text: objectiveText.trim(),
        completedCount: 0,
        firstSeen: now,
        lastSeen: now,
        zone: zone || null,
        progress: null,
      };
    }

    const obj = this._data.objectives[key];
    obj.completedCount += 1;
    obj.lastSeen = now;
    if (zone) obj.zone = zone;

    // Prefer the longest OCR read as display text.
    if (objectiveText.trim().length > obj.text.length) {
      obj.text = objectiveText.trim();
    }

    // Update current session counter.
    if (this._data.currentSession) {
      this._data.currentSession.objectivesCompleted += 1;
    }

    this._save();
  }

  /**
   * Record quest progress (e.g., "3/5 collected").
   *
   * @param {string} questText — Quest or objective label.
   * @param {number} current   — Current progress count.
   * @param {number} total     — Total required.
   */
  recordQuestProgress(questText, current, total) {
    const key = normalize(questText);
    if (!key) return;

    const now = new Date().toISOString();

    if (!this._data.objectives[key]) {
      this._data.objectives[key] = {
        text: questText.trim(),
        completedCount: 0,
        firstSeen: now,
        lastSeen: now,
        zone: null,
        progress: null,
      };
    }

    const obj = this._data.objectives[key];
    obj.lastSeen = now;
    obj.progress = { current, total };

    if (questText.trim().length > obj.text.length) {
      obj.text = questText.trim();
    }

    this._save();
  }

  /**
   * Get all tracked objectives.
   * @returns {object[]}
   */
  getObjectives() {
    return Object.values(this._data.objectives);
  }

  // ─── Game Data (from save files) ───────────────────

  /**
   * Update tracked recipes from parsed GVAS RecipeTracker data.
   * Replaces the entire recipe list and extracts playerId from OwnerId.
   *
   * @param {{ sourceTypeId: string, sourceLookupId: string, ownerId: string }[]} recipes
   */
  updateRecipes(recipes) {
    if (!Array.isArray(recipes)) return;

    this._data.recipes = recipes;

    // Extract playerId from the first recipe's ownerId (UUID).
    if (recipes.length > 0 && recipes[0].ownerId) {
      this._data.playerId = recipes[0].ownerId;
    }

    this._save();
  }

  /**
   * Update game settings from parsed GVAS EmbarkOptionSaveGame.
   * Merges into existing settings (does not replace).
   *
   * @param {object} settings — Key-value pairs of game settings.
   */
  updateGameSettings(settings) {
    if (!settings || typeof settings !== "object") return;

    this._data.gameSettings = {
      ...this._data.gameSettings,
      ...settings,
    };

    this._save();
  }

  /**
   * Get game resolution from stored settings, useful for OCR zone calibration.
   * @returns {{ width: number, height: number } | null}
   */
  getGameResolution() {
    const s = this._data.gameSettings;
    if (s.resolutionWidth && s.resolutionHeight) {
      return {
        width: Number(s.resolutionWidth),
        height: Number(s.resolutionHeight),
      };
    }
    return null;
  }

  // ─── Session Management ────────────────────────────

  /**
   * Start a new gameplay session. Call when the game process starts.
   */
  startSession() {
    // End any lingering session first.
    if (this._data.currentSession) {
      this.endSession();
    }

    this._data.currentSession = {
      id: makeSessionId(),
      startTime: new Date().toISOString(),
      itemsCollected: 0,
      objectivesCompleted: 0,
    };

    this._save();
  }

  /**
   * End the current session. Call when the game process stops.
   */
  endSession() {
    const session = this._data.currentSession;
    if (!session) return;

    // Archive the session with an endTime.
    this._data.sessions.push({
      ...session,
      endTime: new Date().toISOString(),
    });

    // Cap session history.
    if (this._data.sessions.length > MAX_SESSIONS) {
      this._data.sessions = this._data.sessions.slice(-MAX_SESSIONS);
    }

    this._data.currentSession = null;
    this._save();
  }

  /**
   * Get archived session history (most recent last).
   * @returns {object[]}
   */
  getSessions() {
    return this._data.sessions;
  }

  // ─── Profile Summary ──────────────────────────────

  /**
   * Build a full profile summary suitable for sending to the renderer.
   */
  getSummary() {
    return {
      playerId: this._data.playerId,
      lastUpdated: this._data.lastUpdated,
      totalUniqueItems: Object.keys(this._data.items).length,
      totalItemsPickedUp: Object.values(this._data.items).reduce(
        (sum, i) => sum + i.totalPickedUp,
        0
      ),
      totalObjectives: Object.keys(this._data.objectives).length,
      totalRecipes: this._data.recipes.length,
      currentSession: this._data.currentSession,
      sessionCount: this._data.sessions.length,
      items: this.getItems(),
      objectives: this.getObjectives(),
      gameResolution: this.getGameResolution(),
    };
  }

  // ─── Persistence ───────────────────────────────────

  /**
   * Save profile data to disk. Debounced to avoid excessive writes
   * (e.g. rapid-fire OCR pickups).
   */
  _save() {
    this._data.lastUpdated = new Date().toISOString();

    // Clear any pending save timer and schedule a new one.
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
    }

    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this._writeToDisk();
    }, SAVE_DEBOUNCE_MS);
  }

  /** Immediate write — called by the debounced _save(). */
  _writeToDisk() {
    try {
      // Ensure the parent directory exists.
      const dir = path.dirname(this._filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        this._filePath,
        JSON.stringify(this._data, null, 2),
        "utf-8"
      );
    } catch (err) {
      console.error("[PlayerProfile] Failed to save profile:", err.message);
    }
  }

  /**
   * Load profile data from disk. Handles missing or corrupt files gracefully
   * by falling back to an empty profile.
   */
  _load() {
    try {
      if (!fs.existsSync(this._filePath)) {
        return; // First run — keep the empty profile from constructor.
      }

      const raw = fs.readFileSync(this._filePath, "utf-8");
      const parsed = JSON.parse(raw);

      // Merge with defaults so newly added fields are always present.
      this._data = {
        ...emptyProfile(),
        ...parsed,
        items: parsed.items || {},
        objectives: parsed.objectives || {},
        recipes: parsed.recipes || [],
        gameSettings: parsed.gameSettings || {},
        sessions: parsed.sessions || [],
        currentSession: parsed.currentSession || null,
      };
    } catch (err) {
      console.error(
        "[PlayerProfile] Failed to load profile (starting fresh):",
        err.message
      );
      this._data = emptyProfile();
    }
  }
}

module.exports = { PlayerProfile };
