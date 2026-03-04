# Session Coordination

## Session A
- Status: active
- Working on: (awaiting task)
- Last check-in: 2026-03-03

## Session B
- Status: active
- Working on: mouse stutter & game crash investigation (bugs)
- Last check-in: 2026-03-01

## Recent Changes (Session A — 2026-03-02)
- **Skill Tree Build Advisor** — replaced keyword-matching skill recommendations with attribute-based scoring
- New `src/data/skillNodeAttributes.ts` — 43-node static mapping (dps/tank/support/stealth scores + tags)
- New `src/components/OverlaySkillTreeContext.tsx` — context overlay panel for skill tree menu
- Dead perk detection: cross-references allocated perks with equipped gear (shield_synergy, stealth, melee, looting, team_support, downed)
- Added `skill_tree` MenuState, `skillTreeContext` SectionId across overlay config/sections/builder
- Added skill tree OCR pattern to useMenuDetection
- Fixed OverlayHUD section migration (new sections now appear without config reset)
- Added SkillNode.description, impactedSkill, iconName fields to types
- Previous session: overlay config fixes, Frank mascot, dev launcher, app reset

## Claimed Files (Session A)
- src/data/skillNodeAttributes.ts (NEW)
- src/components/OverlaySkillTreeContext.tsx (NEW)
- src/hooks/useBuildAdvisor.ts
- src/hooks/useOverlayConfig.ts
- src/hooks/useOverlaySections.ts
- src/hooks/useMenuDetection.ts
- src/components/OverlayHUD.tsx
- src/screens/LoadoutScreen.tsx
- src/screens/OverlayBuilderScreen.tsx
- src/types/index.ts

## Notes
- Dev workflow: double-click `arc_view.bat` (builds + launches, no server needed)
- **NO dev server / Metro server** — removed `expo start` scripts from package.json. Build is static-only (`expo export`). Do NOT add dev server scripts back.
- Valid npm scripts: `build:web`, `electron`, `electron-dev`, `dist`, `typecheck`
- Reset: `.\arc_view.bat --reset` or `window.arcDesktop.resetApp()` from app
- `eng.traineddata` is untracked Tesseract OCR data (don't commit)
