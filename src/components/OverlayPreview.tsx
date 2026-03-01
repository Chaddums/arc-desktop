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
    `;
    document.head.appendChild(style);
  }
}

interface Props {
  sectionConfigs: SectionConfig[];
  opacity: number;
  scale: number;
  anchor: AnchorPosition;
  hudColors: HudColorConfig | null;
  onSectionPositionChange?: (id: SectionId, position: SectionPosition) => void;
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

// Default stacked positions (relative to preview area, in px)
function getDefaultPositions(sorted: SectionConfig[], anchor: AnchorPosition): Record<SectionId, SectionPosition> {
  const positions: Record<string, SectionPosition> = {};
  let y = 44; // below HUD strip
  for (const cfg of sorted) {
    if (!cfg.enabled) continue;
    positions[cfg.id] = cfg.position ?? { x: 0, y };
    // Estimate section heights for stacking defaults
    if (!cfg.position) {
      switch (cfg.id) {
        case "eventFeed": y += 58; break;
        case "activeQuests": y += 72; break;
        case "squadLoadout": y += 82; break;
        case "mapBriefing": y += 48; break;
        default: y += 50;
      }
    }
  }
  return positions as Record<SectionId, SectionPosition>;
}

export default function OverlayPreview({ sectionConfigs, opacity, scale, anchor, hudColors, onSectionPositionChange }: Props) {
  const sorted = [...sectionConfigs].sort((a, b) => a.order - b.order);
  const containerRef = useRef<HTMLDivElement>(null);

  // Local positions state (initialized from config, updated on drag)
  const [positions, setPositions] = useState<Record<string, SectionPosition>>(() =>
    getDefaultPositions(sorted, anchor),
  );

  // Sync positions when configs change externally
  useEffect(() => {
    setPositions(getDefaultPositions(sorted, anchor));
  }, [sectionConfigs, anchor]);

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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { id, startX, startY, origX, origY } = dragRef.current;
      const dx = (e.clientX - startX) / scale;
      const dy = (e.clientY - startY) / scale;
      const newPos = { x: origX + dx, y: origY + dy };
      if (id === "strip") {
        setStripPos(newPos);
      } else {
        setPositions((prev) => ({ ...prev, [id]: newPos }));
      }
    };

    const handleMouseUp = () => {
      if (dragRef.current) {
        const { id } = dragRef.current;
        dragRef.current = null;
        setDraggingId(null);
        // Persist position for sections
        if (id !== "strip") {
          setPositions((prev) => {
            const pos = prev[id];
            if (pos && onSectionPositionChange) {
              onSectionPositionChange(id as SectionId, pos);
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
  }, [scale, onSectionPositionChange]);

  // ─── Resize state ───────────────────────────────────────────
  const DEFAULT_WIDTH = 320;
  const MIN_WIDTH = 180;
  const MAX_WIDTH = 500;
  const [widths, setWidths] = useState<Record<string, number>>({});
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
        resizeRef.current = null;
        setResizingId(null);
      }
    };

    window.addEventListener("mousemove", handleResizeMove);
    window.addEventListener("mouseup", handleResizeUp);
    return () => {
      window.removeEventListener("mousemove", handleResizeMove);
      window.removeEventListener("mouseup", handleResizeUp);
    };
  }, [scale]);

  const accentColor = hudColors?.accentColor;
  const borderColor = hudColors?.borderColor;
  const headerColor = hudColors?.headerColor;

  const sectionBorderStyle = borderColor ? { borderColor } : undefined;
  const headerTextStyle = headerColor ? { color: headerColor } : undefined;

  const renderSectionContent = (cfg: SectionConfig) => {
    switch (cfg.id) {
      case "eventFeed":
        return (
          <View style={[styles.section, sectionBorderStyle]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionHeaderText, headerTextStyle]}>
                {"\u25B4"} EVENTS ({SAMPLE.events.length})
              </Text>
            </View>
            <View style={styles.sectionBody}>
              {SAMPLE.events.map((evt, i) => (
                <View key={i} style={styles.row}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: evt.time === "NOW" ? Colors.green : (accentColor || Colors.accent) },
                    ]}
                  />
                  <Text style={styles.rowText} numberOfLines={1}>{evt.name}</Text>
                  <Text style={styles.rowMuted}>{evt.map}</Text>
                  <Text style={[styles.rowAccent, accentColor ? { color: accentColor } : undefined]}>
                    {evt.time}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );

      case "activeQuests":
        return (
          <View style={[styles.section, sectionBorderStyle]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionHeaderText, headerTextStyle]}>
                {"\u25B4"} QUESTS ({SAMPLE.quests.length})
              </Text>
            </View>
            <View style={styles.sectionBody}>
              {SAMPLE.quests.map((q, i) => (
                <View key={i} style={styles.row}>
                  <Text style={styles.rowText} numberOfLines={1}>{q.name}</Text>
                  <Text style={styles.rowMuted}>{q.trader}</Text>
                  <Text style={[styles.rowAccent, accentColor ? { color: accentColor } : undefined]}>
                    {q.progress}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );

      case "squadLoadout":
        return (
          <View style={[styles.section, sectionBorderStyle]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionHeaderText, headerTextStyle]}>
                {"\u25B4"} SQUAD ({SAMPLE.squad.length})
              </Text>
            </View>
            <View style={styles.sectionBody}>
              {SAMPLE.squad.map((m, i) => (
                <View key={i} style={styles.squadMember}>
                  <View style={styles.row}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: m.online ? Colors.green : Colors.textMuted },
                      ]}
                    />
                    <Text style={styles.rowText} numberOfLines={1}>{m.name}</Text>
                  </View>
                  <Text style={styles.gearLine} numberOfLines={1}>
                    {m.weapon} / {m.shield} / {m.backpack} / {m.explosive}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );

      case "mapBriefing":
        return (
          <View style={[styles.section, sectionBorderStyle]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionHeaderText, headerTextStyle]}>
                {"\u25B4"} MAP BRIEFING
              </Text>
            </View>
            <View style={styles.sectionBody}>
              <View style={styles.row}>
                <Text style={styles.rowText}>{SAMPLE.mapName}</Text>
                <Text style={[styles.rowAccent, { color: Colors.amber }]}>
                  Risk: {SAMPLE.riskLevel}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowMuted}>
                  {SAMPLE.threatCount} high-threat enemies
                </Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
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
          width: widths["strip"] ?? DEFAULT_WIDTH,
          zIndex: draggingId === "strip" ? 100 : 2,
          transition: draggingId === "strip" ? "none" : "box-shadow 0.15s",
          boxShadow: draggingId === "strip" ? "0 4px 16px rgba(0,180,216,0.3)" : "none",
        }}
      >
        <View style={[styles.strip, borderColor ? { borderColor } : undefined]}>
          <Text style={styles.dragIcon}>{"\u2801\u2801\u2801"}</Text>
          <View style={styles.segment}>
            <Text style={styles.weaponName} numberOfLines={1}>
              {SAMPLE.weapon}
            </Text>
            <View style={styles.buildRow}>
              <Text style={[styles.buildTag, { color: Colors.red }]}>
                {SAMPLE.buildClass}
              </Text>
              <Text style={[styles.scoreText, accentColor ? { color: accentColor } : undefined]}>
                {SAMPLE.score}
              </Text>
            </View>
          </View>
          <View style={styles.separator} />
          <View style={styles.segment}>
            <Text style={styles.segmentLabel}>NEXT</Text>
            <Text style={[styles.segmentValue, accentColor ? { color: accentColor } : undefined]}>
              {SAMPLE.countdown}
            </Text>
          </View>
          <View style={styles.separator} />
          <Text style={styles.lockIcon}>{"\uD83D\uDD13"}</Text>
        </View>
        {/* Resize handle */}
        <div
          data-resize-handle
          onMouseDown={(e) => handleResizeDown(e, "strip")}
          style={resizeHandleStyle}
        />
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
  // ─── HUD Strip ────────────────────────────────────────────
  strip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(10, 14, 18, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(42, 90, 106, 0.6)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    height: 40,
  },
  dragIcon: {
    fontSize: 12,
    color: "rgba(107, 132, 152, 0.6)",
    letterSpacing: 2,
    paddingHorizontal: 6,
  },
  segment: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  segmentLabel: {
    fontSize: 6,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.8)",
    letterSpacing: 1,
  },
  segmentValue: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.accent,
    fontFamily: fonts.mono,
    fontVariant: ["tabular-nums"],
  },
  separator: {
    width: 1,
    height: 22,
    backgroundColor: "rgba(42, 90, 106, 0.4)",
  },
  weaponName: {
    fontSize: 8,
    fontWeight: "600",
    color: Colors.text,
    maxWidth: 100,
  },
  buildRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
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
    fontVariant: ["tabular-nums"],
  },
  lockIcon: {
    fontSize: 11,
    color: "rgba(107, 132, 152, 0.6)",
    paddingHorizontal: 6,
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
  // ─── Squad 4-slot ─────────────────────────────────────────
  squadMember: {
    marginBottom: 2,
  },
  gearLine: {
    fontSize: 7,
    color: Colors.textSecondary,
    paddingLeft: 11,
    marginTop: -1,
  },
});
