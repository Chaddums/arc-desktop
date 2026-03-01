/**
 * OverlayBuilderScreen — Visual overlay customization with live preview.
 * 6th tab, flagship feature. Shows a screenshot background with scaled
 * overlay mockup + control panel for sections (reorder/lock/toggle),
 * appearance, position, and HUD color customization.
 */

import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  TextInput,
  useWindowDimensions,
} from "react-native";
import { Colors, fonts, spacing, fontSize, textPresets } from "../theme";
import { useColors } from "../theme/ThemeContext";
import { useOverlayConfig } from "../hooks/useOverlayConfig";
import type {
  OverlaySections,
  AnchorPosition,
  SectionId,
  SectionConfig,
  HudColorConfig,
} from "../hooks/useOverlayConfig";
import OverlayPreview from "../components/OverlayPreview";
import OverlayCornerPicker from "../components/OverlayCornerPicker";

// ─── Scene backgrounds (placeholder gradient until user provides screenshots) ─
const SCENES = [
  { id: "gameplay", label: "Gameplay" },
  { id: "inventory", label: "Inventory" },
  { id: "map", label: "Map View" },
];

const SECTION_LABELS: Record<SectionId, { label: string; desc: string }> = {
  eventFeed: { label: "Event Feed", desc: "Active & upcoming game events with countdowns" },
  activeQuests: { label: "Active Quests", desc: "Tracked quest progress from all traders" },
  squadLoadout: { label: "Squad Loadout", desc: "Teammate weapons, gear & online status" },
  mapBriefing: { label: "Map Briefing", desc: "Map intel, risk assessment & threat summary" },
};

const OPACITY_STEPS = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
const SCALE_STEPS = [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2];

// ─── HUD Color Presets ────────────────────────────────────────────
const COLOR_PRESETS: { name: string; colors: HudColorConfig }[] = [
  { name: "Default", colors: { accentColor: "#00b4d8", borderColor: "#2a5a6a", headerColor: "#6b8498" } },
  { name: "Teal", colors: { accentColor: "#00e5ff", borderColor: "#004d5a", headerColor: "#80cbc4" } },
  { name: "Amber", colors: { accentColor: "#ffab00", borderColor: "#5a4a2a", headerColor: "#c8a060" } },
  { name: "Red", colors: { accentColor: "#ff1744", borderColor: "#5a2a2a", headerColor: "#c86060" } },
  { name: "Green", colors: { accentColor: "#00e676", borderColor: "#2a5a2a", headerColor: "#60c880" } },
  { name: "Ice", colors: { accentColor: "#b0bec5", borderColor: "#37474f", headerColor: "#78909c" } },
];

// Inject CSS for drag cursor (RN Web child elements override inline cursor)
if (typeof document !== "undefined") {
  const styleId = "overlay-builder-drag-css";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      [data-drag-section="draggable"] {
        cursor: grab !important;
        -webkit-user-select: none !important;
        user-select: none !important;
        -webkit-user-drag: element !important;
      }
      [data-drag-section="draggable"]:active { cursor: grabbing !important; }
      [data-drag-section="draggable"] * {
        cursor: inherit !important;
        -webkit-user-select: none !important;
        user-select: none !important;
      }
      [data-drag-section="locked"] { cursor: default !important; }
      [data-drag-section="locked"] * { cursor: default !important; }
    `;
    document.head.appendChild(style);
  }
}

export default function OverlayBuilderScreen() {
  const C = useColors();
  const { width } = useWindowDimensions();
  const {
    config,
    updateSection,
    updateAppearance,
    updateAnchor,
    reorderSections,
    toggleSectionLock,
    updateSectionPosition,
    updateHudColors,
    resetToDefaults,
  } = useOverlayConfig();
  const [activeScene, setActiveScene] = useState("gameplay");

  const isWide = width >= 860;

  // Sorted section configs for display
  const sortedConfigs = [...config.sectionConfigs].sort((a, b) => a.order - b.order);
  const orderedIds = sortedConfigs.map((c) => c.id);

  // ─── Reorder handlers ────────────────────────────────────────
  const moveSection = useCallback(
    (id: SectionId, direction: "up" | "down") => {
      const ids = [...orderedIds];
      const idx = ids.indexOf(id);
      if (direction === "up" && idx > 0) {
        [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
      } else if (direction === "down" && idx < ids.length - 1) {
        [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
      }
      reorderSections(ids);
    },
    [orderedIds, reorderSections],
  );

  // ─── Drag-and-drop reorder ───────────────────────────────────
  const dragItemRef = useRef<SectionId | null>(null);
  const [dragOverId, setDragOverId] = useState<SectionId | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, id: SectionId) => {
    dragItemRef.current = id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: SectionId) => {
    e.preventDefault();
    setDragOverId(id);
  }, []);

  const handleDrop = useCallback(
    (targetId: SectionId) => {
      const dragId = dragItemRef.current;
      if (!dragId || dragId === targetId) {
        dragItemRef.current = null;
        setDragOverId(null);
        return;
      }
      // Check if dragged item is locked
      const dragCfg = config.sectionConfigs.find((c) => c.id === dragId);
      if (dragCfg?.locked) {
        dragItemRef.current = null;
        setDragOverId(null);
        return;
      }
      const ids = [...orderedIds];
      const fromIdx = ids.indexOf(dragId);
      const toIdx = ids.indexOf(targetId);
      ids.splice(fromIdx, 1);
      ids.splice(toIdx, 0, dragId);
      reorderSections(ids);
      dragItemRef.current = null;
      setDragOverId(null);
    },
    [orderedIds, reorderSections, config.sectionConfigs],
  );

  const handleDragEnd = useCallback(() => {
    dragItemRef.current = null;
    setDragOverId(null);
  }, []);

  // ─── HUD Color handlers ─────────────────────────────────────
  const currentColors = config.hudColors ?? COLOR_PRESETS[0].colors;

  const setColorField = useCallback(
    (field: keyof HudColorConfig, value: string) => {
      updateHudColors({ ...currentColors, [field]: value });
    },
    [currentColors, updateHudColors],
  );

  // ─── Apply to Overlay ────────────────────────────────────────
  const handleApply = () => {
    if (window.arcDesktop?.setOverlayPosition) {
      window.arcDesktop.setOverlayPosition(config.anchor);
    }
    if (window.arcDesktop?.setOverlayAppearance) {
      window.arcDesktop.setOverlayAppearance({
        opacity: config.opacity,
        scale: config.scale,
      });
    }
    if (window.arcDesktop?.setOverlayConfig) {
      window.arcDesktop.setOverlayConfig({
        sectionConfigs: config.sectionConfigs,
        hudColors: config.hudColors,
        sections: config.sections,
      });
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.bg }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <Text style={[textPresets.screenHeader, { color: C.text }]}>
        Overlay Builder
      </Text>
      <Text style={[styles.subtitle, { color: C.textSecondary }]}>
        Customize how the in-game overlay appears over your gameplay
      </Text>

      {/* Scene Picker */}
      <View style={styles.scenePicker}>
        {SCENES.map((scene) => (
          <TouchableOpacity
            key={scene.id}
            onPress={() => setActiveScene(scene.id)}
            style={[
              styles.sceneTab,
              { borderColor: C.border },
              activeScene === scene.id && {
                borderColor: C.accent,
                backgroundColor: C.accentBg,
              },
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.sceneTabText,
                { color: C.textSecondary },
                activeScene === scene.id && { color: C.accent },
              ]}
            >
              {scene.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main layout: preview + controls */}
      <View style={[styles.mainLayout, !isWide && styles.mainLayoutStacked]}>
        {/* Preview Pane */}
        <View
          style={[
            styles.previewPane,
            {
              backgroundColor: C.bgDeep,
              borderColor: C.border,
            },
            !isWide && styles.previewPaneStacked,
          ]}
        >
          {/* Screenshot placeholder */}
          <View style={styles.screenshotBg}>
            <ScenePlaceholder scene={activeScene} />
            <OverlayPreview
              sectionConfigs={config.sectionConfigs}
              opacity={config.opacity}
              scale={config.scale}
              anchor={config.anchor}
              hudColors={config.hudColors}
              onSectionPositionChange={updateSectionPosition}
            />
          </View>
        </View>

        {/* Control Panel */}
        <View style={[styles.controlPanel, !isWide && styles.controlPanelStacked]}>
          {/* Section Reorder + Toggle */}
          <View style={[styles.controlSection, { borderColor: C.border }]}>
            <Text style={[styles.controlTitle, { color: C.textSecondary }]}>
              OVERLAY SECTIONS
            </Text>
            {sortedConfigs.map((cfg, idx) => {
              const info = SECTION_LABELS[cfg.id];
              const isFirst = idx === 0;
              const isLast = idx === sortedConfigs.length - 1;
              const isDragOver = dragOverId === cfg.id;
              return (
                <div
                  key={cfg.id}
                  draggable={!cfg.locked}
                  data-drag-section={cfg.locked ? "locked" : "draggable"}
                  onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, cfg.id)}
                  onDragOver={(e) => handleDragOver(e, cfg.id)}
                  onDrop={() => handleDrop(cfg.id)}
                  onDragEnd={handleDragEnd}
                  style={{
                    opacity: dragItemRef.current === cfg.id ? 0.5 : 1,
                    borderLeft: isDragOver ? `2px solid ${C.accent}` : "2px solid transparent",
                  }}
                >
                  <View style={[styles.sectionRow, { borderBottomColor: C.border }]}>
                    {/* Drag grip handle */}
                    {!cfg.locked && (
                      <Text style={[styles.gripHandle, { color: C.textMuted }]}>{"\u2807"}</Text>
                    )}
                    {/* Reorder buttons */}
                    <View style={styles.reorderBtns}>
                      <TouchableOpacity
                        onPress={() => moveSection(cfg.id, "up")}
                        disabled={isFirst || cfg.locked}
                        activeOpacity={0.6}
                        style={styles.arrowBtn}
                      >
                        <Text style={[
                          styles.arrowText,
                          { color: (isFirst || cfg.locked) ? C.textMuted : C.textSecondary },
                        ]}>
                          {"\u25B2"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => moveSection(cfg.id, "down")}
                        disabled={isLast || cfg.locked}
                        activeOpacity={0.6}
                        style={styles.arrowBtn}
                      >
                        <Text style={[
                          styles.arrowText,
                          { color: (isLast || cfg.locked) ? C.textMuted : C.textSecondary },
                        ]}>
                          {"\u25BC"}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Lock button */}
                    <TouchableOpacity
                      onPress={() => toggleSectionLock(cfg.id)}
                      activeOpacity={0.6}
                      style={styles.lockBtn}
                    >
                      <Text style={[styles.lockText, { color: cfg.locked ? C.accent : C.textMuted }]}>
                        {cfg.locked ? "\uD83D\uDD12" : "\uD83D\uDD13"}
                      </Text>
                    </TouchableOpacity>

                    {/* Label */}
                    <View style={styles.toggleInfo}>
                      <Text style={[styles.toggleLabel, { color: C.text }]}>{info.label}</Text>
                      <Text style={[styles.toggleDesc, { color: C.textMuted }]}>{info.desc}</Text>
                    </View>

                    {/* Toggle */}
                    <Switch
                      value={cfg.enabled}
                      onValueChange={() => updateSection(cfg.id)}
                      trackColor={{ false: C.border, true: C.accentDim }}
                      thumbColor={cfg.enabled ? C.accent : C.textMuted}
                    />
                  </View>
                </div>
              );
            })}
          </View>

          {/* Appearance */}
          <View style={[styles.controlSection, { borderColor: C.border }]}>
            <Text style={[styles.controlTitle, { color: C.textSecondary }]}>
              APPEARANCE
            </Text>

            {/* Opacity */}
            <View style={styles.sliderSection}>
              <View style={styles.sliderHeader}>
                <Text style={[styles.sliderLabel, { color: C.text }]}>Opacity</Text>
                <Text style={[styles.sliderValue, { color: C.accent }]}>
                  {Math.round(config.opacity * 100)}%
                </Text>
              </View>
              <View style={styles.stepRow}>
                {OPACITY_STEPS.map((val) => (
                  <TouchableOpacity
                    key={val}
                    onPress={() => updateAppearance({ opacity: val })}
                    style={[
                      styles.stepBtn,
                      { borderColor: C.border },
                      config.opacity === val && {
                        borderColor: C.accent,
                        backgroundColor: C.accentBg,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.stepText,
                        { color: C.textSecondary },
                        config.opacity === val && { color: C.accent },
                      ]}
                    >
                      {Math.round(val * 100)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Scale */}
            <View style={styles.sliderSection}>
              <View style={styles.sliderHeader}>
                <Text style={[styles.sliderLabel, { color: C.text }]}>Scale</Text>
                <Text style={[styles.sliderValue, { color: C.accent }]}>
                  {Math.round(config.scale * 100)}%
                </Text>
              </View>
              <View style={styles.stepRow}>
                {SCALE_STEPS.map((val) => (
                  <TouchableOpacity
                    key={val}
                    onPress={() => updateAppearance({ scale: val })}
                    style={[
                      styles.stepBtn,
                      { borderColor: C.border },
                      config.scale === val && {
                        borderColor: C.accent,
                        backgroundColor: C.accentBg,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.stepText,
                        { color: C.textSecondary },
                        config.scale === val && { color: C.accent },
                      ]}
                    >
                      {Math.round(val * 100)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* HUD Colors */}
          <View style={[styles.controlSection, { borderColor: C.border }]}>
            <Text style={[styles.controlTitle, { color: C.textSecondary }]}>
              HUD COLORS
            </Text>

            {/* Color fields */}
            <ColorRow
              label="Accent Color"
              value={currentColors.accentColor}
              onChange={(v) => setColorField("accentColor", v)}
              C={C}
            />
            <ColorRow
              label="Border Color"
              value={currentColors.borderColor}
              onChange={(v) => setColorField("borderColor", v)}
              C={C}
            />
            <ColorRow
              label="Header Color"
              value={currentColors.headerColor}
              onChange={(v) => setColorField("headerColor", v)}
              C={C}
            />

            {/* Presets */}
            <Text style={[styles.presetLabel, { color: C.textSecondary }]}>Presets</Text>
            <View style={styles.presetRow}>
              {COLOR_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.name}
                  onPress={() => updateHudColors(preset.colors)}
                  style={[
                    styles.presetBtn,
                    { borderColor: C.border },
                    currentColors.accentColor === preset.colors.accentColor &&
                    currentColors.borderColor === preset.colors.borderColor && {
                      borderColor: C.accent,
                      backgroundColor: C.accentBg,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.presetSwatch, { backgroundColor: preset.colors.accentColor }]} />
                  <Text style={[styles.presetName, { color: C.textSecondary }]}>
                    {preset.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Reset to theme defaults */}
            <TouchableOpacity
              onPress={() => updateHudColors(null)}
              style={[styles.resetColorsBtn, { borderColor: C.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.resetColorsBtnText, { color: C.textSecondary }]}>
                Reset to Theme Defaults
              </Text>
            </TouchableOpacity>
          </View>

          {/* Position */}
          <View style={[styles.controlSection, { borderColor: C.border }]}>
            <Text style={[styles.controlTitle, { color: C.textSecondary }]}>
              POSITION
            </Text>
            <Text style={[styles.positionHint, { color: C.textMuted }]}>
              Choose which corner of the screen the overlay anchors to
            </Text>
            <OverlayCornerPicker value={config.anchor} onChange={updateAnchor} />
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={handleApply}
              style={[styles.applyBtn, { backgroundColor: C.accentBg, borderColor: C.accent }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.applyBtnText, { color: C.accent }]}>
                Apply to Overlay
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={resetToDefaults}
              style={[styles.resetBtn, { borderColor: C.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.resetBtnText, { color: C.textSecondary }]}>
                Reset Defaults
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Color Row Component ────────────────────────────────────────
function ColorRow({
  label,
  value,
  onChange,
  C,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  C: ReturnType<typeof useColors>;
}) {
  return (
    <View style={colorStyles.row}>
      <Text style={[colorStyles.label, { color: C.text }]}>{label}</Text>
      <View style={colorStyles.inputGroup}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 28, height: 28, border: "none", padding: 0, cursor: "pointer", backgroundColor: "transparent" }}
        />
        <TextInput
          value={value}
          onChangeText={(text) => {
            if (/^#[0-9a-fA-F]{0,6}$/.test(text)) onChange(text);
          }}
          style={[
            colorStyles.hexInput,
            { color: C.text, borderColor: C.border },
          ]}
          maxLength={7}
          placeholder="#000000"
          placeholderTextColor={C.textMuted}
        />
      </View>
    </View>
  );
}

const colorStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  hexInput: {
    fontSize: fontSize.xs,
    fontFamily: fonts.mono,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    width: 72,
  },
});

/** Dark gradient placeholder for game screenshots */
function ScenePlaceholder({ scene }: { scene: string }) {
  const labels: Record<string, string> = {
    gameplay: "GAMEPLAY VIEW",
    inventory: "INVENTORY SCREEN",
    map: "MAP VIEW",
  };

  return (
    <View style={placeholderStyles.container}>
      <View style={placeholderStyles.gridOverlay}>
        {/* Scanline effect */}
        {Array.from({ length: 8 }).map((_, i) => (
          <View
            key={i}
            style={[
              placeholderStyles.scanline,
              { top: `${(i + 1) * 12}%` },
            ]}
          />
        ))}
      </View>
      <Text style={placeholderStyles.label}>{labels[scene] ?? "GAME VIEW"}</Text>
      <Text style={placeholderStyles.hint}>Screenshot will be placed here</Text>
    </View>
  );
}

const placeholderStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#080c10",
    alignItems: "center",
    justifyContent: "center",
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  scanline: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(0, 180, 216, 0.04)",
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 4,
    color: "rgba(107, 132, 152, 0.3)",
  },
  hint: {
    fontSize: 10,
    color: "rgba(107, 132, 152, 0.2)",
    marginTop: 6,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  subtitle: {
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  // ─── Scene Picker ──────────────────────────────────────────
  scenePicker: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sceneTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 4,
  },
  sceneTabText: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  // ─── Main Layout ──────────────────────────────────────────
  mainLayout: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: 12,
  },
  mainLayoutStacked: {
    flexDirection: "column",
  },
  // ─── Preview Pane ─────────────────────────────────────────
  previewPane: {
    flex: 3,
    borderWidth: 1,
    borderRadius: 6,
    overflow: "hidden",
    minHeight: 400,
    position: "relative",
  },
  previewPaneStacked: {
    minHeight: 320,
    marginBottom: 12,
  },
  screenshotBg: {
    flex: 1,
    position: "relative",
  },
  // ─── Control Panel ────────────────────────────────────────
  controlPanel: {
    flex: 2,
    gap: 10,
  },
  controlPanelStacked: {
    flex: undefined,
  },
  controlSection: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
  },
  controlTitle: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  // ─── Section Reorder Rows ──────────────────────────────────
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  gripHandle: {
    fontSize: 16,
    marginRight: 2,
    opacity: 0.5,
    userSelect: "none",
  },
  reorderBtns: {
    flexDirection: "column",
    alignItems: "center",
    marginRight: 4,
    gap: 0,
  },
  arrowBtn: {
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  arrowText: {
    fontSize: 8,
  },
  lockBtn: {
    paddingHorizontal: 6,
  },
  lockText: {
    fontSize: 12,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 8,
  },
  toggleLabel: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  toggleDesc: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  // ─── Slider / Step Controls ───────────────────────────────
  sliderSection: {
    marginBottom: 10,
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  sliderLabel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  sliderValue: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    fontFamily: fonts.mono,
    fontVariant: ["tabular-nums"],
  },
  stepRow: {
    flexDirection: "row",
    gap: 4,
    flexWrap: "wrap",
  },
  stepBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 4,
    minWidth: 36,
    alignItems: "center",
  },
  stepText: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    fontFamily: fonts.mono,
  },
  // ─── HUD Colors ────────────────────────────────────────────
  presetLabel: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 6,
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  presetBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 4,
    gap: 4,
  },
  presetSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  presetName: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  resetColorsBtn: {
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 6,
    alignItems: "center",
  },
  resetColorsBtnText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  // ─── Position ─────────────────────────────────────────────
  positionHint: {
    fontSize: fontSize.xs,
    marginBottom: 4,
  },
  // ─── Actions ──────────────────────────────────────────────
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: "center",
  },
  applyBtnText: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  resetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: "center",
  },
  resetBtnText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
});
