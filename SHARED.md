# Shared Code — ARC View ↔ LAMA Mobile

Both apps by Couloir, same Expo/React Native stack. This documents which files mirror the LAMA Mobile codebase.

| File | Status | LAMA Source |
|------|--------|-------------|
| `tsconfig.json`, `babel.config.js` | Identical | Same files |
| `src/components/Sparkline.tsx` | Identical | Same component |
| `src/components/Panel.tsx` | Adapted | Teal corners vs gold |
| `src/components/Divider.tsx` | Adapted | From `GoldDivider.tsx` |
| `src/theme/index.ts` | Same structure | Different palette (sci-fi vs POE2) |
| `src/hooks/useSettings.ts` | Same pattern | Different storage key (`@arcview/`) |
| `src/utils/format.ts` | Same pattern | Different formatters |
| Service cache pattern | Same pattern | `CacheEntry`/`getCached`/`setCache` |

## When updating shared patterns

If you change any "Same pattern" file in one repo, consider whether the change applies to both. "Adapted" files share structure but differ in specifics (colors, keys).
