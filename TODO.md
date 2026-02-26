# ARC View — TODO

## Visual / Layout
- [ ] Reduce white space throughout (too much padding/margins)
- [ ] Ensure visual parity between mobile and PC
- [ ] PC web version should feel native to desktop, not mobile-emulated
  - Responsive layouts (wider content areas, multi-column on large screens)
  - Consider sidebar nav instead of bottom tabs on desktop
  - Proper use of horizontal space on wide viewports

## Data / Functionality
- [x] ~~None of the tabs are pulling data~~ — Fixed: CORS proxy (`crossFetch`) for web; mobile unaffected
- [x] ~~Confirm API responses render correctly~~ — MetaForge, RaidTheory, ardb all route through `crossFetch`
- [ ] Verify actual API response shapes match types (some APIs may have changed)

## Platform
- [ ] Mobile: visual polish pass
- [ ] PC/Web: desktop-native UX pass
