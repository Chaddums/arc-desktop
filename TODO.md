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
- [ ] Configurable overlay panels — toggle which info strips are visible
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

## Data / API
- [ ] Verify actual API response shapes match types (some APIs may have changed)
- [ ] Adaptive rate limiting — parse API response headers, self-throttle at 80% of limit
- [ ] Query fingerprinting for smarter cache keys (include filters, not just endpoint)
