/**
 * OverlayPreview — Draggable mockup of the overlay HUD for the builder screen.
 * Each section card can be grabbed and repositioned within the preview area.
 * Supports dynamic section ordering, HUD color overrides, and 4-slot squad gear.
 */

import React, { useRef, useCallback, useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, fonts } from "../theme";
import type { AnchorPosition, SectionConfig, HudColorConfig, SectionId, SectionPosition } from "../hooks/useOverlayConfig";

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
  let y = 28; // below compact HUD strip
  for (const cfg of sorted) {
    if (!cfg.enabled) continue;
    let pos: SectionPosition | null = null;
    if (cfg.position) {
      const dn = denormalize(cfg.position, cw, ch);
      if (dn.x >= 0 && dn.y >= 0) pos = dn;
    }
    positions[cfg.id] = pos ?? { x: 0, y };
    const CARD_HEIGHT = 56;
    const CARD_GAP = 4;
    const extra = cfg.id === "squadLoadout" ? 20 : 0;
    y += CARD_HEIGHT + extra + CARD_GAP;
  }
  return positions as Record<SectionId, SectionPosition>;
}

export default function OverlayPreview({ sectionConfigs, opacity, scale, anchor, hudColors, onSectionPositionChange, onSectionWidthChange }: Props) {
  const sorted = [...sectionConfigs].sort((a, b) => a.order - b.order);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure container for coordinate normalization
  const [containerSize, setContainerSize] = useState({ width: 700, height: 500 });
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

  // Local positions state (initialized from config, updated on drag)
  const [positions, setPositions] = useState<Record<string, SectionPosition>>(() =>
    getDefaultPositions(sorted, containerSize.width, containerSize.height),
  );

  // Sync positions and widths when configs or container size change
  useEffect(() => {
    setPositions(getDefaultPositions(sorted, containerSize.width, containerSize.height));
    const newWidths: Record<string, number> = {};
    for (const cfg of sectionConfigs) {
      if (cfg.width) {
        // Denormalize: if <= 1 it's a fraction, otherwise old pixel value
        newWidths[cfg.id] = cfg.width <= 1
          ? cfg.width * containerSize.width
          : cfg.width;
      }
    }
    setWidths(newWidths);
  }, [sectionConfigs, anchor, containerSize]);

  // Strip position (top-level HUD bar)
  const [stripPos, setStripPos] = useState<SectionPosition>({ x: 0, y: 0 });

  // Drag state — supports both section IDs and "strip"
  type DragId = SectionId | "strip";
  const dragRef = useRef<{
    id: DragId;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [draggingId, setDraggingId] = useState<DragId | null>(null);

  // ─── Resize state (widths declared before snap so getCardRect can access) ─
  const DEFAULT_WIDTH = 320;
  const MIN_WIDTH = 180;
  const MAX_WIDTH = 500;
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const cfg of sectionConfigs) {
      if (cfg.width) initial[cfg.id] = cfg.width;
    }
    return initial;
  });

  // ─── Snap-to-edge state ──────────────────────────────────────
  const SNAP_THRESHOLD = 10; // pixels
  const CARD_HEIGHT_EST = 56; // standard card height estimate
  const STRIP_WIDTH_EST = 240;
  const STRIP_HEIGHT = 22;

  interface SnapGuide { axis: "x" | "y"; pos: number }
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);

  /** Get the bounding rect {x, y, w, h} of a card/strip by its id */
  const getCardRect = useCallback((id: DragId, posOverride?: SectionPosition) => {
    if (id === "strip") {
      const p = posOverride ?? stripPos;
      return { x: p.x, y: p.y, w: STRIP_WIDTH_EST, h: STRIP_HEIGHT };
    }
    const p = posOverride ?? positions[id] ?? { x: 0, y: 0 };
    const w = widths[id] ?? DEFAULT_WIDTH;
    return { x: p.x, y: p.y, w, h: CARD_HEIGHT_EST };
  }, [positions, stripPos, widths]);

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
    const otherIds: DragId[] = ["strip"];
    for (const cfg of sorted) {
      if (cfg.enabled && cfg.id !== dragId) otherIds.push(cfg.id);
    }
    if (dragId === "strip") {
      // strip dragging — compare against section cards only
      otherIds.length = 0;
      for (const cfg of sorted) {
        if (cfg.enabled) otherIds.push(cfg.id);
      }
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
    if (id !== "strip") {
      const cfg = sectionConfigs.find((c) => c.id === id);
      if (cfg?.locked) return;
    }
    e.preventDefault();
    const pos = id === "strip" ? stripPos : (positions[id] ?? { x: 0, y: 0 });
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
    setDraggingId(id);
  }, [positions, stripPos, sectionConfigs]);

  // Store onSectionPositionChange in a ref to keep the effect stable
  const onPositionChangeRef = useRef(onSectionPositionChange);
  onPositionChangeRef.current = onSectionPositionChange;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { id, startX, startY, origX, origY } = dragRef.current;
      const dx = (e.clientX - startX) / scale;
      const dy = (e.clientY - startY) / scale;
      const rawPos = { x: origX + dx, y: origY + dy };

      // Apply snapping (call through ref to avoid stale closure)
      const { snapped, guides } = computeSnapRef.current(id, rawPos);
      setSnapGuides(guides);

      if (id === "strip") {
        setStripPos(snapped);
      } else {
        setPositions((prev) => ({ ...prev, [id]: snapped }));
      }
    };

    const handleMouseUp = () => {
      if (dragRef.current) {
        const { id } = dragRef.current;
        dragRef.current = null;
        setDraggingId(null);
        setSnapGuides([]);
        // Persist normalized position for sections
        if (id !== "strip") {
          setPositions((prev) => {
            const pos = prev[id];
            if (pos && onPositionChangeRef.current) {
              const el = containerRef.current;
              const cw = el?.clientWidth || containerSize.width;
              const ch = el?.clientHeight || containerSize.height;
              onPositionChangeRef.current(id as SectionId, normalize(pos, cw, ch));
            }
            return prev;
          });
        }
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
  } | null>(null);
  const [resizingId, setResizingId] = useState<DragId | null>(null);

  const handleResizeDown = useCallback((e: React.MouseEvent, id: DragId) => {
    e.preventDefault();
    e.stopPropagation();
    const currentWidth = widths[id] ?? DEFAULT_WIDTH;
    resizeRef.current = { id, startX: e.clientX, origWidth: currentWidth };
    setResizingId(id);
  }, [widths]);

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const { id, startX, origWidth } = resizeRef.current;
      const dx = (e.clientX - startX) / scale;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, origWidth + dx));
      setWidths((prev) => ({ ...prev, [id]: newWidth }));
    };

    const handleResizeUp = () => {
      if (resizeRef.current) {
        const { id } = resizeRef.current;
        resizeRef.current = null;
        setResizingId(null);
        // Persist normalized width (fraction of container width)
        if (id !== "strip" && onSectionWidthChange) {
          setWidths((prev) => {
            const w = prev[id];
            if (w != null) {
              const el = containerRef.current;
              const cw = el?.clientWidth || containerSize.width;
              onSectionWidthChange(id as SectionId, cw > 0 ? w / cw : w);
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
    eventFeed: {
      label: `EVENTS (${SAMPLE.events.length})`,
      rows: SAMPLE.events.slice(0, 2).map((e) => ({ left: e.name, right: e.time, dot: e.time === "NOW" ? Colors.green : undefined })),
    },
    activeQuests: {
      label: `QUESTS (${SAMPLE.quests.length})`,
      rows: SAMPLE.quests.slice(0, 2).map((q) => ({ left: q.name, right: q.progress })),
    },
    squadLoadout: {
      label: `SQUAD (${SAMPLE.squad.length})`,
      rows: SAMPLE.squad.slice(0, 2).map((m) => ({ left: m.name, right: m.weapon, dot: m.online ? Colors.green : Colors.textMuted })),
    },
    mapBriefing: {
      label: "MAP BRIEFING",
      rows: [
        { left: SAMPLE.mapName, right: `Risk: ${SAMPLE.riskLevel}` },
        { left: `${SAMPLE.threatCount} high-threat enemies`, muted: true },
      ],
    },
    questTracker: {
      label: "QUEST TRACKER (1/4)",
      rows: [
        { left: "Dam", right: "2 quests" },
        { left: "Recover Drives", right: "Elara" },
      ],
    },
    buildAdvice: {
      label: "BUILD ADVICE",
      rows: [
        { left: "Balanced loadout" },
        { left: "\u25B8 Cobra V3 Assault", right: "72" },
      ],
    },
    dailyQuests: {
      label: "DAILIES (1/3)",
      rows: [
        { left: "Complete 3 raids" },
        { left: "Sell 5 items", muted: true, strikethrough: true },
      ],
    },
    inventoryContext: {
      label: "INVENTORY INTEL",
      rows: [
        { left: "12 Keep \u2022 5 Sell \u2022 3 Recycle" },
        { left: "2 quest items needed", muted: true },
      ],
    },
    traderContext: {
      label: "TRADER INTEL",
      rows: [
        { left: "\u26A0 Check QUESTS tab!" },
        { left: "3 quests available", muted: true },
      ],
    },
    mapSelectorContext: {
      label: "MAP SELECT INTEL",
      rows: [
        { left: "Dam", right: "4 quests" },
        { left: "Spaceport", right: "2 quests" },
      ],
    },
    workshopContext: {
      label: "WORKSHOP GUIDE",
      rows: [
        { left: "Weapons Bench", right: "8 items" },
        { left: "Armor Bench", right: "5 items" },
      ],
    },
    mapInspectorContext: {
      label: "MAP OBJECTIVES",
      rows: [
        { left: "Find Data Drives" },
        { left: "Reach extraction point", muted: true },
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
      {/* HUD Strip — draggable + resizable */}
      <div
        data-preview-drag="section"
        onMouseDown={(e) => handleMouseDown(e, "strip")}
        style={{
          position: "absolute",
          left: stripPos.x,
          top: stripPos.y,
          opacity: draggingId === "strip" ? opacity * 0.8 : opacity,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: "auto",
          zIndex: draggingId === "strip" ? 100 : 2,
          transition: draggingId === "strip" ? "none" : "box-shadow 0.15s",
          boxShadow: draggingId === "strip" ? "0 4px 16px rgba(0,180,216,0.3)" : "none",
        }}
      >
        <View style={[styles.strip, borderColor ? { borderColor } : undefined]}>
          <Text style={styles.dragIcon}>{"\u2801"}</Text>
          <Text style={styles.weaponName} numberOfLines={1}>{SAMPLE.weapon}</Text>
          <Text style={[styles.buildTag, { color: Colors.red }]}>{SAMPLE.buildClass}</Text>
          <Text style={[styles.scoreText, accentColor ? { color: accentColor } : undefined]}>{SAMPLE.score}</Text>
          <View style={styles.separator} />
          <Text style={styles.stripLabel}>NEXT</Text>
          <Text style={[styles.stripValue, accentColor ? { color: accentColor } : undefined]}>{SAMPLE.countdown}</Text>
        </View>
      </div>

      {/* Draggable section cards */}
      {sorted.map((cfg) => {
        if (!cfg.enabled) return null;
        const pos = positions[cfg.id] ?? { x: 0, y: 44 };
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
            {/* Resize handle */}
            {!cfg.locked && (
              <div
                data-resize-handle
                onMouseDown={(e) => handleResizeDown(e, cfg.id)}
                style={resizeHandleStyle}
              />
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
  );
}

const resizeHandleStyle: React.CSSProperties = {
  position: "absolute",
  right: 0,
  bottom: 0,
  width: 12,
  height: 12,
  cursor: "nwse-resize",
  background: "linear-gradient(135deg, transparent 50%, rgba(0,180,216,0.4) 50%)",
  borderBottomRightRadius: 4,
};

const styles = StyleSheet.create({
  // ─── HUD Strip (single compact row) ─────────────────────
  strip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(10, 14, 18, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(42, 90, 106, 0.6)",
    borderRadius: 4,
    paddingHorizontal: 4,
    height: 22,
    gap: 4,
  },
  dragIcon: {
    fontSize: 8,
    color: "rgba(107, 132, 152, 0.5)",
  },
  separator: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(42, 90, 106, 0.4)",
  },
  weaponName: {
    fontSize: 7,
    fontWeight: "600",
    color: Colors.text,
    maxWidth: 80,
  },
  buildTag: {
    fontSize: 6,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  scoreText: {
    fontSize: 7,
    fontWeight: "700",
    color: Colors.accent,
    fontFamily: fonts.mono,
  },
  stripLabel: {
    fontSize: 5,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.7)",
    letterSpacing: 0.5,
  },
  stripValue: {
    fontSize: 7,
    fontWeight: "700",
    color: Colors.accent,
    fontFamily: fonts.mono,
  },
  // ─── Sections ─────────────────────────────────────────────
  section: {
    backgroundColor: "rgba(10, 14, 18, 0.90)",
    borderWidth: 1,
    borderColor: "rgba(42, 90, 106, 0.6)",
    borderRadius: 4,
  },
  sectionHeader: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(42, 90, 106, 0.3)",
  },
  sectionHeaderText: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.8)",
    letterSpacing: 1,
  },
  sectionBody: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    gap: 6,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  rowText: {
    fontSize: 8,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
  },
  rowMuted: {
    fontSize: 7,
    color: Colors.textSecondary,
  },
  rowAccent: {
    fontSize: 8,
    fontWeight: "700",
    color: Colors.accent,
    fontFamily: fonts.mono,
    fontVariant: ["tabular-nums"],
  },
});
