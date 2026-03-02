# ARC View — TODO

## Completed
- [x] CORS proxy (`crossFetch`) for web
- [x] API responses render correctly (MetaForge, RaidTheory, ardb)
- [x] Overlay HUD with event countdown + checklist
- [x] Game detection (ArcRaiders.exe polling)
- [x] System tray with mode toggle
- [x] OCR Auto Quest Tracker — tesseract.js worker, screen capture, fuzzy matching
- [x] Portable .exe build (electron-builder)

### P0 — Core UX ✓
- [x] Sidebar nav on wide viewports instead of bottom tabs
- [x] Reduce white space / padding throughout — tighter, denser information display
- [x] Toggle component with smooth slide animation (2-size)
- [x] Accordion/collapse with chevron rotation + accent left-border on expanded
- [x] Status badges with animated pulse (idle/active/cooldown/error states)
- [x] Monospace font for values/stats (JetBrains Mono / Fira Code / Cascadia Code)
- [x] Uppercase label style for section headers (10px, 700 weight, 0.1em letter-spacing)
- [x] Consistent font sizing hierarchy across all screens
- [x] Theme system with spacing, fontSize, textPresets, viewPresets

### P1 — Feature Upgrades ✓
- [x] Hero KPI cards with sparkline + percentage change (green/red)
- [x] Category filter pills for trader inventory
- [x] Striped table rows for inventory lists
- [x] Watchlist entries with trend arrows + percentage change
- [x] Crafting profit with cell-based Cost/Sell/Profit layout
- [x] Equipment slot grid visualization on item browser
- [x] Improved item compare with stat highlighting (better/worse)
- [x] Build classification tag (DPS / Tank / Support / Hybrid)
- [x] Mod quality indicators (color-coded: Excellent/Good/Average/Weak)
- [x] Upgrade priority ranking — items flagged for upgrade
- [x] Enemy threat cards with color-coded borders by threat level
- [x] Route planner with loot/minute KPI bar
- [x] Imminent event pulse — StatusBadge "ENDING SOON" on events within 30 min
- [x] Quest chain progress visualization (connected nodes with color-coded lines)
- [x] Shopping list with cost rollup KPI bar
- [x] Daily optimizer with priority sorting and badges

### P2 — Overlay & Desktop ✓
- [x] Tiered overlay borders (imminent=amber pulse, active=accent, default=dim)
- [x] Frameless window with custom title bar (minimize, maximize, close)
- [x] Window geometry persistence (save/restore position and size)
- [x] Window size presets (Default / Large / XL) in Settings
- [x] TitleBar component with ARC/VIEW branding
- [x] Configurable overlay panels — toggle which info strips are visible (OverlayBuilder + useOverlayConfig)

### P3 — Theming & Accessibility ✓
- [x] Dual theme system (Clean sci-fi + Tactical gritty variant)
- [x] Color presets: Default, Colorblind Safe, High Contrast
- [x] Export/import settings as JSON (clipboard-based)
- [x] Theme + preset persistence via AsyncStorage

---

## Remaining

### P0 — Still Open
- [ ] Multi-column grid layouts for cards/lists (CSS Grid, not single-column stack)
- [ ] Responsive zoom scaling (reference width 1100px, auto-scale up on wider screens)
- [ ] Tooltip component with smart positioning (above/below based on viewport)
- [ ] Modal/dialog pattern — backdrop, escape-to-close, click-outside-to-close, flyout animation
- [ ] Improved button states — hover/active/disabled with smooth transitions (0.15s ease)

### P1 — Still Open
- [ ] Interactive price charts (TradingView Lightweight Charts or similar)
- [ ] Time range toggles (7d / 14d / 30d)
- [ ] Watchlist inline editor toggle (tap edit → shows form, save/cancel)
- [ ] Force-refresh button with visual feedback
- [ ] Ctrl+click multi-select for comparing 2+ items

### P2 — Still Open
- [ ] Sheen sweep animation for premium visual polish
- [ ] Auto-hide timer (3s default, 30s while loading)
- [ ] Multi-monitor support — clamp overlay position to active monitor
- [ ] Edge-based resize handle
- [ ] Refine OCR capture zones after in-game testing
- [ ] Replace quest-complete.mp3 placeholder with final SFX
- [ ] Mobile ↔ Desktop pairing (WebSocket/REST sync)
- [ ] Auto-start on Windows login (registry HKCU\...\Run)
- [ ] Connection status in title bar

### P3 — Still Open
- [ ] NUX guided tour for first-time users
- [ ] Tooltip hints on key features
- [ ] Bug reporter modal with auto-attach logs
- [ ] Auto-scroll log panel for desktop debug console
- [ ] Splash screen with fade-out on load
- [ ] Telemetry opt-in with session counter

---

## Bugs

- [ ] **Mouse cursor performance hit in main menu** — Severe mouse snapping/stuttering in the game main menu. Persists even after killing the app, but clears after screens go black and relaunch. May be an interaction with our overlay or a lingering process. Investigate what we're doing that could cause input lag even after exit.
- [ ] **F9 overlay pips disappear** — When hitting F9 with in-game pips visible, they all vanish after a few seconds. Requires full app restart to get them back. Likely a timer or visibility state bug in the pip lifecycle.
- [ ] **Game crashes (possible silent process)** — Frequent ARC Raiders crashes that weren't happening before. Last crash also killed arc-viewer and caused black screens. Suspect a behind-the-scenes process (screen capture? OCR polling?) is destabilizing the game. Previously investigated but not resolved.

---

## New Features — In-Game Overlay Intelligence

Reference screenshots: `Compare/`
Reference overlay assets: `Compare/Areas_To_Add_Overlay_Info/`

- [ ] **Inventory item info overlay** — Add subtle overlay info on items in player inventory and stash inventory showing quick-glance data players don't get natively (needed for quests, sell value, recycle info, etc.). See: `Areas_To_Add_Overlay_Info/In_game_inventory.png`
- [ ] **In-game quest/resource tracker overlay** — Two parts: 1) An overlay that mimics in-game objectives style — shows tracked quest items as a checklist with checkboxes that auto-complete as you collect them. 2) Smart quest/resource picker in the app that recommends which quests and resources to track together based on shared maps and efficiency (great for new players). See: `Compare/In_Game_Logbook.png`
- [ ] **Workshop bench summaries** — When player highlights a workbench, show a small summary list of what it crafts, OR place persistent pips above each workbench telling players what each bench is roughly for. See: `Compare/In_game_player_workshop.png`
- [ ] **Skill tree build advisor** — In-game menu or in-app system for the skill tree that helps players understand which skills complement each other and can be taken together to maximize playstyle AND current loadout. Leverage LAMA Desktop build analyzer tech if possible. See: `Compare/In_game_skilltree.png`, `Compare/Perk_Tree_Overwolf.png`
- [ ] **Trader info pips** — Small information pips next to traders showing what they sell and/or what quests they offer, so players don't need to enter each trader menu to find out. See: `Compare/In_Game_Traders.png`
- [ ] **Hidden quest menu highlight** — Add an additional highlight/indicator when a player has an available quest inside the trader menu, since the quests sub-menu is super hidden and easy to miss for new players.
- [ ] **Daily quests overlay** — Show daily quests in the overlay. Once all dailies are completed for the day, auto-minimize the section. See: `Compare/In_Game_Decks_Daily_Quests.png`
- [ ] **Lobby map selector intel** — When using the in-game lobby map selector, show info about key things to look for in each map, OR point players to which map best matches their active quests and hunt targets. See: `Compare/In_Game_Map_Selector_Inspection.png`, `Areas_To_Add_Overlay_Info/In_Game_Map_Selector.png`
- [ ] **Enhanced map inspector** — When using the map inspector, show additional intel similar to the Overwolf map (loot locations, points of interest) but filtered/focused — highlight things the player is actively hunting for and where to find them, rather than dumping everything. See: `Areas_To_Add_Overlay_Info/In_game_map.png`, `Compare/Dam_Battleground_overwofl.png`, `Compare/Stella_Montis_Overwolf.png`, `Compare/The_Blue_Gate_Overwolf.png`, `Compare/Space_port_overwolf.png`

---

## Data / API
- [ ] Verify actual API response shapes match types (some APIs may have changed)
- [ ] Adaptive rate limiting — parse API response headers, self-throttle at 80% of limit
- [ ] Query fingerprinting for smarter cache keys (include filters, not just endpoint)
