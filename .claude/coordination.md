# Session Coordination

## Session A (this session)
- Status: active
- Working on: persistent MediaStream capture (replacing desktopCapturer polling to fix stutter)
- Last check-in: 2026-03-01

## Session B
- Status: active
- Working on: mouse stutter & game crash investigation (bugs)
- Last check-in: 2026-03-01

## Claimed Files
- src/types/index.ts (Session A)
- src/hooks/useSquad.ts (Session A)
- src/hooks/useOverlaySections.ts (Session A — new)
- src/components/OverlayEventFeed.tsx (Session A — new)
- src/components/OverlayActiveQuests.tsx (Session A — new)
- src/components/OverlaySquadLoadout.tsx (Session A — new)
- src/components/OverlayMapBriefing.tsx (Session A — new)
- src/components/OverlayChecklist.tsx (Session A)
- src/components/OverlayHUD.tsx (Session A)
- electron/main.js (Session A)
- electron/screenCapture.js (Session A — rewriting)
- electron/capturePreload.js (Session A — new)
- electron/captureWindow.html (Session A — new)

## Notes
- Session A is replacing desktopCapturer.getSources() polling with persistent MediaStream to fix mouse stutter/DXGI crashes
