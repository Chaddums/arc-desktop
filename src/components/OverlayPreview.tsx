/**
 * OverlayPreview — Draggable mockup of the overlay HUD for the builder screen.
 * Each section card can be grabbed and repositioned within the preview area.
 * Supports dynamic section ordering, HUD color overrides, and 4-slot squad gear.
 *
 * Renders at full game resolution internally (e.g. 1920x1080) and CSS-scales
 * down to fit the preview pane — so card proportions match exactly what
 * appears when the overlay is active in-game.
 */

import React, { useRef, useCallback, useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, fonts } from "../theme";
import type { AnchorPosition, SectionConfig, HudColorConfig, SectionId, SectionPosition, GameResolution } from "../hooks/useOverlayConfig";

// Inject CSS for drag cursors
if (typeof document !== "undefined") {
  const styleId = "overlay-preview-drag-css";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      [data-preview-drag] { cursor: grab !important; user-select: none !important; -webkit-user-select: none !important; }
      [data-preview-drag] * { cursor: inherit !important; user-select: none !important; -webkit-user-select: none !important; }
      [data-preview-drag]:active { cursor: grabbing !important; }
      [data-preview-drag="locked"] { cursor: default !important; }
      [data-preview-drag="locked"] * { cursor: default !important; }
      [data-resize-handle] { cursor: nwse-resize !important; }
      [data-resize-handle-left] { cursor: nesw-resize !important; }
      [data-snap-guide] {
        pointer-events: none;
      }
      [data-snap-guide="x"] {
        background: repeating-linear-gradient(
          180deg,
          rgba(0, 180, 216, 0.6) 0px,
          rgba(0, 180, 216, 0.6) 4px,
          transparent 4px,
          transparent 8px
        );
      }
      [data-snap-guide="y"] {
        background: repeating-linear-gradient(
          90deg,
          rgba(0, 180, 216, 0.6) 0px,
          rgba(0, 180, 216, 0.6) 4px,
          transparent 4px,
          transparent 8px
        );
      }
    `;
    document.head.appendChild(style);
  }
}

interface Props {
  sectionConfigs: SectionConfig[];
  opacity: number;
  scale: number;
  anchor: AnchorPosition | null;
  hudColors: HudColorConfig | null;
  gameResolution: GameResolution;
  onSectionPositionChange?: (id: SectionId, position: SectionPosition) => void;
  onSectionWidthChange?: (id: SectionId, width: number) => void;
}

// Sample data for preview
const SAMPLE = {
  weapon: "Cobra V3 Assault",
  buildClass: "DPS",
  score: 72,
  countdown: "12:34",
  events: [
    { name: "Turbine Storm", map: "Spaceport", time: "NOW" },
    { name: "Cargo Drop", map: "Dam", time: "04:21" },
  ],
  quests: [
    { name: "Recover Data Drives", trader: "Elara", progress: "2/5" },
    { name: "Clear Hostile Zone", trader: "Bishop", progress: "1/3" },
    { name: "Deliver Samples", trader: "Kira", progress: "0/2" },
  ],
  squad: [
    { name: "PlayerTwo", weapon: "AR-9", shield: "MK2 Shield", backpack: "Lrg Backpack", explosive: "Frag Nade", online: true },
    { name: "GhostRecon", weapon: "Marksman-7", shield: "--", backpack: "Med Backpack", explosive: "Smoke", online: true },
    { name: "TankMain", weapon: "Nova LMG", shield: "Heavy Shield", backpack: "Lrg Backpack", explosive: "--", online: false },
  ],
  mapName: "Spaceport",
  riskLevel: "Medium",
  threatCount: 4,
};

// ─── Game-resolution constants ──────────────────────────────────
const CARD_HEIGHT_EST = 120;
const SNAP_THRESHOLD = 20;
const MIN_WIDTH = 280;
const MAX_WIDTH = 800;

/** Denormalize a 0-1 position to pixel coordinates in the container */
function denormalize(pos: SectionPosition, cw: number, ch: number): SectionPosition {
  // Migration: if values > 1, they're old pixel format — treat as no saved position
  if (pos.x > 1 || pos.y > 1) return { x: -1, y: -1 }; // sentinel for "no position"
  return { x: pos.x * cw, y: pos.y * ch };
}

/** Normalize pixel coordinates to 0-1 fractions of the container */
function normalize(pos: SectionPosition, cw: number, ch: number): SectionPosition {
  if (cw === 0 || ch === 0) return { x: 0, y: 0 };
  return { x: pos.x / cw, y: pos.y / ch };
}

/** Build pixel positions for all enabled sections, denormalizing saved config */
function getDefaultPositions(
  sorted: SectionConfig[],
  cw: number,
  ch: number,
): Record<SectionId, SectionPosition> {
  const positions: Record<string, SectionPosition> = {};
  const MARGIN = 6;
  const CARD_HEIGHT = 120;
  const CARD_GAP = 6;
  const DEFAULT_COL_WIDTH = 0.2 * cw + CARD_GAP;
  let y = MARGIN;
  let col = 0;
  for (const cfg of sorted) {
    if (!cfg.enabled) continue;
    let pos: SectionPosition | null = null;
    if (cfg.position) {
      const dn = denormalize(cfg.position, cw, ch);
      if (dn.x >= 0 && dn.y >= 0) pos = dn;
    }
    const extra = cfg.id === "squadLoadout" ? 40 : 0;
    if (!pos) {
      // Wrap to next column if card would exceed screen height
      if (y + CARD_HEIGHT + extra > ch - MARGIN) {
        col++;
        y = MARGIN;
      }
      pos = { x: MARGIN + col * DEFAULT_COL_WIDTH, y };
    }
    positions[cfg.id] = pos;
    y += CARD_HEIGHT + extra + CARD_GAP;
  }
  return positions as Record<SectionId, SectionPosition>;
}

export default function OverlayPreview({ sectionConfigs, opacity, scale, anchor, hudColors, gameResolution, onSectionPositionChange, onSectionWidthChange }: Props) {
  const sorted = [...sectionConfigs].sort((a, b) => a.order - b.order);
  const containerRef = useRef<HTMLDivElement>(null);

  // Game resolution dimensions
  const gw = gameResolution.width;
  const gh = gameResolution.height;

  // Measure container for preview scaling
  const [containerSize, setContainerSize] = useState({ width: 700, height: 500 });
  const previewRatio = containerSize.width / gw;

  // Refs for use inside drag/resize event handlers (avoids stale closures)
  const previewRatioRef = useRef(previewRatio);
  previewRatioRef.current = previewRatio;
  const gwRef = useRef(gw);
  gwRef.current = gw;
  const ghRef = useRef(gh);
  ghRef.current = gh;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setContainerSize({ width: w, height: h });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Computed default width (20% of game resolution, matching OverlayHUD's DEFAULT_CARD_FRAC)
  const DEFAULT_WIDTH = 0.2 * gw;

  // Local positions state (initialized from config, updated on drag)
  const [positions, setPositions] = useState<Record<string, SectionPosition>>(() =>
    getDefaultPositions(sorted, gw, gh),
  );

  // Sync positions and widths when configs or container size change
  useEffect(() => {
    setPositions(getDefaultPositions(sorted, gw, gh));
    const newWidths: Record<string, number> = {};
    for (const cfg of sectionConfigs) {
      if (cfg.width) {
        // Denormalize: if <= 1 it's a fraction, otherwise old pixel value
        newWidths[cfg.id] = cfg.width <= 1
          ? cfg.width * gw
          : cfg.width;
      }
    }
    setWidths(newWidths);
  }, [sectionConfigs, anchor, containerSize, gw, gh]);

  type DragId = SectionId;
  const dragRef = useRef<{
    id: DragId;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [draggingId, setDraggingId] = useState<DragId | null>(null);

  // ─── Resize state (widths declared before snap so getCardRect can access) ─
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const cfg of sectionConfigs) {
      if (cfg.width) initial[cfg.id] = cfg.width;
    }
    return initial;
  });

  // ─── Snap-to-edge state ──────────────────────────────────────
  interface SnapGuide { axis: "x" | "y"; pos: number }
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);

  /** Get the bounding rect {x, y, w, h} of a card by its id */
  const getCardRect = useCallback((id: DragId, posOverride?: SectionPosition) => {
    const p = posOverride ?? positions[id] ?? { x: 0, y: 0 };
    const w = widths[id] ?? DEFAULT_WIDTH;
    return { x: p.x, y: p.y, w, h: CARD_HEIGHT_EST };
  }, [positions, widths, DEFAULT_WIDTH]);

  /** Compute snap-adjusted position + guides for a dragged card.
   *  Stored in a ref so the drag useEffect doesn't re-subscribe on every position change. */
  const computeSnapRef = useRef<(dragId: DragId, rawPos: SectionPosition) => { snapped: SectionPosition; guides: SnapGuide[] }>(null!);
  computeSnapRef.current = (dragId: DragId, rawPos: SectionPosition) => {
    const dragRect = getCardRect(dragId, rawPos);
    const guides: SnapGuide[] = [];
    let sx = rawPos.x;
    let sy = rawPos.y;
    let snappedX = false;
    let snappedY = false;

    // Collect all other card rects
    const otherIds: DragId[] = [];
    for (const cfg of sorted) {
      if (cfg.enabled && cfg.id !== dragId) otherIds.push(cfg.id);
    }

    for (const otherId of otherIds) {
      const other = getCardRect(otherId);

      // Horizontal edge snapping (left-left, right-right, left-right, right-left)
      const dragEdges = [dragRect.x, dragRect.x + dragRect.w];
      const otherEdges = [other.x, other.x + other.w];
      if (!snappedX) {
        for (const de of dragEdges) {
          for (const oe of otherEdges) {
            if (Math.abs(de - oe) < SNAP_THRESHOLD) {
              sx = rawPos.x + (oe - de);
              guides.push({ axis: "x", pos: oe });
              snappedX = true;
              break;
            }
          }
          if (snappedX) break;
        }
      }

      // Vertical edge snapping (top-top, bottom-bottom, top-bottom, bottom-top)
      const dragVEdges = [dragRect.y, dragRect.y + dragRect.h];
      const otherVEdges = [other.y, other.y + other.h];
      if (!snappedY) {
        for (const de of dragVEdges) {
          for (const oe of otherVEdges) {
            if (Math.abs(de - oe) < SNAP_THRESHOLD) {
              sy = rawPos.y + (oe - de);
              guides.push({ axis: "y", pos: oe });
              snappedY = true;
              break;
            }
          }
          if (snappedY) break;
        }
      }

      if (snappedX && snappedY) break;
    }

    return { snapped: { x: sx, y: sy }, guides };
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, id: DragId) => {
    const cfg = sectionConfigs.find((c) => c.id === id);
    if (cfg?.locked) return;
    e.preventDefault();
    const pos = positions[id] ?? { x: 0, y: 0 };
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
    setDraggingId(id);
  }, [positions, sectionConfigs]);

  // Store onSectionPositionChange in a ref to keep the effect stable
  const onPositionChangeRef = useRef(onSectionPositionChange);
  onPositionChangeRef.current = onSectionPositionChange;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { id, startX, startY, origX, origY } = dragRef.current;
      // Mouse deltas are in screen pixels; divide by previewRatio to convert to game-res pixels
      const dx = (e.clientX - startX) / (scale * previewRatioRef.current);
      const dy = (e.clientY - startY) / (scale * previewRatioRef.current);
      const rawPos = { x: origX + dx, y: origY + dy };

      // Apply snapping (call through ref to avoid stale closure)
      const { snapped, guides } = computeSnapRef.current(id, rawPos);
      setSnapGuides(guides);

      setPositions((prev) => ({ ...prev, [id]: snapped }));
    };

    const handleMouseUp = () => {
      if (dragRef.current) {
        const { id } = dragRef.current;
        dragRef.current = null;
        setDraggingId(null);
        setSnapGuides([]);
        // Persist normalized position (normalize against game resolution)
        setPositions((prev) => {
          const pos = prev[id];
          if (pos && onPositionChangeRef.current) {
            onPositionChangeRef.current(id as SectionId, normalize(pos, gwRef.current, ghRef.current));
          }
          return prev;
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [scale]);

  // ─── Resize state (continued) ─────────────────────────────
  const resizeRef = useRef<{
    id: DragId;
    startX: number;
    origWidth: number;
    origX: number;
    side: "right" | "left";
  } | null>(null);
  const [resizingId, setResizingId] = useState<DragId | null>(null);

  const handleResizeDown = useCallback((e: React.MouseEvent, id: DragId, side: "right" | "left" = "right") => {
    e.preventDefault();
    e.stopPropagation();
    const currentWidth = widths[id] ?? DEFAULT_WIDTH;
    const currentX = positions[id]?.x ?? 0;
    resizeRef.current = { id, startX: e.clientX, origWidth: currentWidth, origX: currentX, side };
    setResizingId(id);
  }, [widths, DEFAULT_WIDTH, positions]);

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const { id, startX, origWidth, origX, side } = resizeRef.current;
      // Mouse deltas are in screen pixels; divide by previewRatio to convert to game-res pixels
      const dx = (e.clientX - startX) / (scale * previewRatioRef.current);
      if (side === "right") {
        const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, origWidth + dx));
        setWidths((prev) => ({ ...prev, [id]: newWidth }));
      } else {
        // Left handle: grow width leftward, shift position left
        const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, origWidth - dx));
        const newX = origX + (origWidth - newWidth);
        setWidths((prev) => ({ ...prev, [id]: newWidth }));
        setPositions((prev) => ({ ...prev, [id]: { x: newX, y: prev[id]?.y ?? 0 } }));
      }
    };

    const handleResizeUp = () => {
      if (resizeRef.current) {
        const { id, side } = resizeRef.current;
        resizeRef.current = null;
        setResizingId(null);
        // Persist normalized width (fraction of game resolution width)
        if (onSectionWidthChange) {
          setWidths((prev) => {
            const w = prev[id];
            if (w != null) {
              const gameW = gwRef.current;
              onSectionWidthChange(id as SectionId, gameW > 0 ? w / gameW : w);
            }
            return prev;
          });
        }
        // Persist position if left-side resize shifted it
        if (side === "left" && onPositionChangeRef.current) {
          setPositions((prev) => {
            const pos = prev[id];
            if (pos) {
              onPositionChangeRef.current!(id as SectionId, normalize(pos, gwRef.current, ghRef.current));
            }
            return prev;
          });
        }
      }
    };

    window.addEventListener("mousemove", handleResizeMove);
    window.addEventListener("mouseup", handleResizeUp);
    return () => {
      window.removeEventListener("mousemove", handleResizeMove);
      window.removeEventListener("mouseup", handleResizeUp);
    };
  }, [scale, onSectionWidthChange]);

  const accentColor = hudColors?.accentColor;
  const borderColor = hudColors?.borderColor;
  const headerColor = hudColors?.headerColor;

  const sectionBorderStyle = borderColor ? { borderColor } : undefined;
  const headerTextStyle = headerColor ? { color: headerColor } : undefined;

  // ─── Section preview data & labels ─────────────────────────
  const SECTION_PREVIEWS: Record<string, { label: string; rows: { left: string; right?: string; dot?: string; muted?: boolean; strikethrough?: boolean }[] }> = {
    statusStrip: {
      label: "STATUS",
      rows: [
        { left: "LOADOUT", right: `${SAMPLE.weapon}  ${SAMPLE.buildClass}  ${SAMPLE.score}` },
        { left: "NEXT EVENT", right: SAMPLE.countdown },
      ],
    },
    eventFeed: {
      label: `EVENTS (6)`,
      rows: [
        { left: "Turbine Storm", right: "NOW", dot: Colors.green },
        { left: "Cargo Drop", right: "04:21" },
        { left: "Sandstorm Warning", right: "12:05" },
        { left: "Supply Convoy", right: "18:30" },
        { left: "Extraction Window", right: "25:10", muted: true },
        { left: "Reactor Meltdown", right: "41:22", muted: true },
      ],
    },
    activeQuests: {
      label: `QUESTS (5)`,
      rows: [
        { left: "Recover Data Drives", right: "2/5" },
        { left: "Clear Hostile Zone", right: "1/3" },
        { left: "Deliver Samples", right: "0/2" },
        { left: "Scout Relay Tower", right: "0/1" },
        { left: "Extract Cargo Pod", right: "1/1", muted: true, strikethrough: true },
      ],
    },
    squadLoadout: {
      label: `SQUAD (${SAMPLE.squad.length})`,
      rows: SAMPLE.squad.map((m) => ({ left: m.name, right: m.weapon, dot: m.online ? Colors.green : Colors.textMuted })),
    },
    mapBriefing: {
      label: "MAP BRIEFING",
      rows: [
        { left: SAMPLE.mapName, right: `Risk: ${SAMPLE.riskLevel}` },
        { left: `${SAMPLE.threatCount} high-threat enemies` },
        { left: "Weakness: Fire", muted: true },
        { left: "Loadout fit: 72%", muted: true },
        { left: "Bring fire weapons, avoid open areas", muted: true },
      ],
    },
    questTracker: {
      label: "QUEST TRACKER (2/6)",
      rows: [
        { left: "Dam", right: "3 quests" },
        { left: "\u2610 Recover Drives", right: "Elara" },
        { left: "\u2610 Clear Zone Bravo", right: "Bishop" },
        { left: "\u2611 Deliver Samples", right: "Kira", muted: true, strikethrough: true },
        { left: "Spaceport", right: "2 quests" },
        { left: "\u2610 Scout Relay Tower", right: "Elara" },
      ],
    },
    buildAdvice: {
      label: "BUILD ADVICE",
      rows: [
        { left: "Balanced loadout" },
        { left: "\u25B8 Cobra V3 Assault", right: "72" },
        { left: "\u25B8 MK2 Shield", right: "65" },
        { left: "\u25B8 Large Backpack", right: "58" },
        { left: "\u2B50 Armor Mastery", right: "+2pt", muted: true },
      ],
    },
    dailyQuests: {
      label: "DAILIES (1/4)",
      rows: [
        { left: "Complete 3 raids" },
        { left: "Sell 5 items" },
        { left: "Extract with full backpack" },
        { left: "Kill 10 enemies", muted: true, strikethrough: true },
      ],
    },
    inventoryContext: {
      label: "INVENTORY INTEL",
      rows: [
        { left: "12 Keep \u2022 5 Sell \u2022 3 Recycle" },
        { left: "Total sell value: 14,200", muted: true },
        { left: "QUEST ITEMS NEEDED", muted: true },
        { left: "\u25B8 Data Drive \u00D72", right: "Elara" },
        { left: "\u25B8 Plasma Cell \u00D73", right: "Bishop" },
        { left: "\u25B8 Samples \u00D72", right: "Kira" },
      ],
    },
    traderContext: {
      label: "TRADER INTEL",
      rows: [
        { left: "\u26A0 Check QUESTS tab!" },
        { left: "Elara", right: "4 avail" },
        { left: "Bishop", right: "2 avail" },
        { left: "Kira", right: "1 avail" },
        { left: "7 total quests available", muted: true },
      ],
    },
    mapSelectorContext: {
      label: "MAP SELECT INTEL",
      rows: [
        { left: "\u2605 Dam (recommended)", right: "4q" },
        { left: "Spaceport", right: "2q" },
        { left: "Buried City", right: "1q" },
        { left: "Blue Gate", right: "0q", muted: true },
        { left: "\u25CF Turbine Storm active on Dam", muted: true },
      ],
    },
    workshopContext: {
      label: "WORKSHOP GUIDE",
      rows: [
        { left: "Weapons Bench", right: "8 items" },
        { left: "Armor Bench", right: "5 items" },
        { left: "Backpack Bench", right: "4 items" },
        { left: "Ammo Bench", right: "6 items" },
        { left: "Explosives Bench", right: "3 items" },
      ],
    },
    mapInspectorContext: {
      label: "MAP OBJECTIVES",
      rows: [
        { left: "Find Data Drives" },
        { left: "  Recover Drives \u2022 Elara", muted: true },
        { left: "Locate Relay Tower" },
        { left: "  Scout Relay Tower \u2022 Bishop", muted: true },
        { left: "Reach Extraction Point" },
        { left: "  Clear Zone Bravo \u2022 Bishop", muted: true },
      ],
    },
  };

  const renderSectionContent = (cfg: SectionConfig) => {
    const preview = SECTION_PREVIEWS[cfg.id];
    if (!preview) return null;

    return (
      <View style={[styles.section, sectionBorderStyle]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionHeaderText, headerTextStyle]}>
            {"\u25B4"} {preview.label}
          </Text>
        </View>
        <View style={styles.sectionBody}>
          {preview.rows.map((row, i) => (
            <View key={i} style={styles.row}>
              {row.dot && <View style={[styles.statusDot, { backgroundColor: row.dot }]} />}
              <Text
                style={[
                  row.muted ? styles.rowMuted : styles.rowText,
                  row.strikethrough ? { textDecorationLine: "line-through" as const } : undefined,
                ]}
                numberOfLines={1}
              >
                {row.left}
              </Text>
              {row.right && (
                <Text style={[styles.rowAccent, accentColor ? { color: accentColor } : undefined]}>
                  {row.right}
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
      }}
    >
      {/* Inner game canvas — rendered at actual game resolution, CSS-scaled to fit */}
      <div
        style={{
          width: gw,
          height: gh,
          transform: `scale(${previewRatio})`,
          transformOrigin: "top left",
          position: "relative",
        }}
      >
        {/* Draggable section cards */}
        {sorted.map((cfg) => {
          if (!cfg.enabled) return null;
          const pos = positions[cfg.id] ?? { x: 0, y: 0 };
          const isDragging = draggingId === cfg.id;
          return (
            <div
              key={cfg.id}
              data-preview-drag={cfg.locked ? "locked" : "section"}
              onMouseDown={(e) => handleMouseDown(e, cfg.id)}
              style={{
                position: "absolute",
                left: pos.x,
                top: pos.y,
                opacity: isDragging ? opacity * 0.8 : opacity,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                width: widths[cfg.id] ?? DEFAULT_WIDTH,
                zIndex: isDragging ? 100 : 1,
                transition: isDragging ? "none" : "box-shadow 0.15s",
                boxShadow: isDragging ? "0 4px 16px rgba(0,180,216,0.3)" : "none",
              }}
            >
              {renderSectionContent(cfg)}
              {/* Resize handles — bottom-left and bottom-right */}
              {!cfg.locked && (
                <>
                  <div
                    data-resize-handle-left
                    onMouseDown={(e) => handleResizeDown(e, cfg.id, "left")}
                    style={resizeHandleLeftStyle}
                  />
                  <div
                    data-resize-handle
                    onMouseDown={(e) => handleResizeDown(e, cfg.id, "right")}
                    style={resizeHandleStyle}
                  />
                </>
              )}
            </div>
          );
        })}

        {/* Snap guide lines (dashed) */}
        {snapGuides.map((guide, i) =>
          guide.axis === "x" ? (
            <div
              key={`snap-${i}`}
              data-snap-guide="x"
              style={{
                position: "absolute",
                left: guide.pos,
                top: 0,
                width: 1,
                height: "100%",
                pointerEvents: "none",
                zIndex: 200,
              }}
            />
          ) : (
            <div
              key={`snap-${i}`}
              data-snap-guide="y"
              style={{
                position: "absolute",
                left: 0,
                top: guide.pos,
                width: "100%",
                height: 1,
                pointerEvents: "none",
                zIndex: 200,
              }}
            />
          ),
        )}
      </div>
    </div>
  );
}

const resizeHandleStyle: React.CSSProperties = {
  position: "absolute",
  right: 0,
  bottom: 0,
  width: 20,
  height: 20,
  cursor: "nwse-resize",
  background: "linear-gradient(135deg, transparent 50%, rgba(0,180,216,0.4) 50%)",
  borderBottomRightRadius: 6,
};

const resizeHandleLeftStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  bottom: 0,
  width: 20,
  height: 20,
  cursor: "nesw-resize",
  background: "linear-gradient(225deg, transparent 50%, rgba(0,180,216,0.4) 50%)",
  borderBottomLeftRadius: 6,
};

const styles = StyleSheet.create({
  // ─── Sections ─────────────────────────────────────────────
  section: {
    backgroundColor: "rgba(10, 14, 18, 0.90)",
    borderWidth: 1,
    borderColor: "rgba(42, 90, 106, 0.6)",
    borderRadius: 6,
  },
  sectionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(42, 90, 106, 0.3)",
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.8)",
    letterSpacing: 1.2,
  },
  sectionBody: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    gap: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rowText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
  },
  rowMuted: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  rowAccent: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.accent,
    fontFamily: fonts.mono,
    fontVariant: ["tabular-nums"],
  },
});
