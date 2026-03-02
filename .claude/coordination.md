# Session Coordination

## Session A
- Status: idle (completed)
- Last work: Overlay config persistence fixes, Frank mascot, dev launcher simplification
- Last check-in: 2026-03-02

## Session B
- Status: active
- Working on: mouse stutter & game crash investigation (bugs)
- Last check-in: 2026-03-01

## Recent Changes (Session A — 2026-03-02)
- Fixed overlay config not loading on mount (sections reset on F9)
- Fixed disabled sections still rendering in HUD
- Fixed position picker UX (nullable anchor, deselection, gated on all enabled)
- Fixed z-fighting in builder preview (CSS background-image)
- Fixed stale drag positions hiding event feed card
- Added Frank mascot: taskbar/tray icon (ARC teal), Intel header
- Removed Metro dev server dependency — dev mode loads from built dist
- Added arc_view.bat/vbs launcher (silent, no console), replaces arc-dev.vbs
- Added app reset (--reset flag + IPC handler)

## Claimed Files
No files currently claimed — Session A complete.

## Notes
- Dev workflow: double-click `arc_view.bat` (builds + launches, no server needed)
- Reset: `.\arc_view.bat --reset` or `window.arcDesktop.resetApp()` from app
- `eng.traineddata` is untracked Tesseract OCR data (don't commit)
