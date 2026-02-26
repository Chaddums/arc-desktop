# ARC View — TODO

## Visual / Layout
- [ ] Reduce white space throughout (too much padding/margins)
- [ ] Ensure visual parity between mobile and PC (arc-view ↔ arc-desktop)
- [ ] PC web version should feel native to desktop, not mobile-emulated
  - Responsive layouts (wider content areas, multi-column on large screens)
  - Consider sidebar nav instead of bottom tabs on desktop
  - Proper use of horizontal space on wide viewports

## Data / Functionality
- [x] ~~None of the tabs are pulling data~~ — Fixed: CORS proxy (`crossFetch`) for web; mobile unaffected
- [x] ~~Confirm API responses render correctly~~ — MetaForge, RaidTheory, ardb all route through `crossFetch`
- [ ] Verify actual API response shapes match types (some APIs may have changed)

## Desktop Features (arc-desktop)
- [x] Overlay HUD with event countdown + checklist
- [x] Game detection (ArcRaiders.exe polling)
- [x] System tray with mode toggle
- [x] OCR Auto Quest Tracker (Phase 5) — tesseract.js worker, screen capture, fuzzy matching
- [ ] Refine OCR capture zones after in-game testing (placeholder coords)
- [ ] Replace quest-complete.mp3 placeholder with final SFX
- [ ] Mobile ↔ Desktop pairing (WebSocket/REST, like LAMA)

## Platform
- [ ] Mobile (arc-view): visual polish pass
- [ ] PC (arc-desktop): desktop-native UX pass
