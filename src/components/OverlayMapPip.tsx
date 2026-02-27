/**
 * OverlayMapPip — Auto-triggered compact map intel card.
 * Slides in when OCR detects a new map. Two modes:
 *   Auto (default): shows for ~8s then fades out
 *   Pinned: stays until dismissed or map changes
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MapIntel } from "../hooks/useMapDetection";
import { formatCountdown } from "../utils/format";
import { Colors } from "../theme";

const PIP_MODE_KEY = "@arcview/pip_mode";

type PipMode = "auto" | "pinned";

const THREAT_ORDER: Record<string, number> = {
  extreme: 0,
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
};

const THREAT_COLORS: Record<string, string> = {
  low: Colors.green,
  medium: Colors.amber,
  high: "#e74c3c",
  critical: "#e74c3c",
  extreme: "#c0392b",
};

interface Props {
  intel: MapIntel | null;
  onVisibilityChange?: (visible: boolean) => void;
}

export default function OverlayMapPip({ intel, onVisibilityChange }: Props) {
  const [mode, setMode] = useState<PipMode>("auto");
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const prevMapRef = useRef<string | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted mode
  useEffect(() => {
    AsyncStorage.getItem(PIP_MODE_KEY).then((val) => {
      if (val === "auto" || val === "pinned") setMode(val);
    }).catch(() => {});
  }, []);

  // Persist mode changes
  const toggleMode = useCallback((newMode: PipMode) => {
    setMode(newMode);
    AsyncStorage.setItem(PIP_MODE_KEY, newMode).catch(() => {});
  }, []);

  // Clear timers
  const clearTimers = useCallback(() => {
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }
    if (fadeTimerRef.current) { clearTimeout(fadeTimerRef.current); fadeTimerRef.current = null; }
  }, []);

  // Show pip when intel changes to a new map
  useEffect(() => {
    if (!intel) {
      clearTimers();
      setVisible(false);
      setFading(false);
      prevMapRef.current = null;
      return;
    }

    // New map detected
    if (intel.mapId !== prevMapRef.current) {
      prevMapRef.current = intel.mapId;
      clearTimers();
      setFading(false);
      setVisible(true);

      if (mode === "auto") {
        autoTimerRef.current = setTimeout(() => {
          setFading(true);
          fadeTimerRef.current = setTimeout(() => {
            setVisible(false);
            setFading(false);
          }, 500);
        }, 8000);
      }
    }
  }, [intel, intel?.mapId, mode, clearTimers]);

  // When mode switches, reset auto-dismiss behavior
  useEffect(() => {
    if (!visible || !intel) return;
    clearTimers();

    if (mode === "auto") {
      autoTimerRef.current = setTimeout(() => {
        setFading(true);
        fadeTimerRef.current = setTimeout(() => {
          setVisible(false);
          setFading(false);
        }, 500);
      }, 8000);
    }
    // pinned: no timers, stays until dismissed
  }, [mode]); // intentionally only mode

  // Notify parent of visibility changes
  useEffect(() => {
    onVisibilityChange?.(visible);
  }, [visible, onVisibilityChange]);

  // Tick for event countdowns
  useEffect(() => {
    if (!visible || !intel?.activeEvents.length) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [visible, intel?.activeEvents.length]);

  // Cleanup on unmount
  useEffect(() => clearTimers, [clearTimers]);

  const handleClose = useCallback(() => {
    clearTimers();
    setVisible(false);
    setFading(false);
  }, [clearTimers]);

  if (!visible || !intel) return null;

  // --- Data derivation ---
  const sortedEnemies = [...intel.enemies].sort(
    (a, b) => (THREAT_ORDER[a.threat.toLowerCase()] ?? 5) - (THREAT_ORDER[b.threat.toLowerCase()] ?? 5)
  );
  const top3Enemies = sortedEnemies.slice(0, 3);

  // Threat summary: count by level
  const threatCounts: Record<string, number> = {};
  for (const e of intel.enemies) {
    const level = e.threat.toLowerCase();
    threatCounts[level] = (threatCounts[level] || 0) + 1;
  }
  const threatSummary = Object.entries(threatCounts)
    .sort(([a], [b]) => (THREAT_ORDER[a] ?? 5) - (THREAT_ORDER[b] ?? 5))
    .map(([level, count]) => `${count} ${level}`)
    .join(" \u00B7 ");

  const top3Quests = intel.quests.slice(0, 3);
  const lootLine = intel.loot.slice(0, 6).join(", ");

  const animStyle: React.CSSProperties = fading
    ? { animation: "pipFadeOut 0.5s ease-in forwards" }
    : { animation: "pipSlideIn 0.3s ease-out" };

  return (
    <div style={animStyle}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.mapIcon}>{"\u2B21"}</Text>
            <Text style={styles.mapName}>{intel.mapName.toUpperCase()}</Text>
            {intel.source === "ocr" && <Text style={styles.sourceTag}>OCR</Text>}
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => toggleMode(mode === "auto" ? "pinned" : "auto")}
              style={styles.pinBtn}
            >
              <Text style={styles.pinIcon}>{mode === "pinned" ? "\u2611" : "\u2610"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>{"\u2715"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Threats */}
        {intel.enemies.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>THREATS</Text>
              <Text style={styles.sectionSummary}>{threatSummary}</Text>
            </View>
            {top3Enemies.map((enemy, i) => (
              <View key={i} style={styles.enemyRow}>
                <Text style={styles.enemyName} numberOfLines={1}>
                  {enemy.name}
                </Text>
                <Text style={[styles.threatTag, { color: THREAT_COLORS[enemy.threat.toLowerCase()] ?? Colors.textSecondary }]}>
                  ({enemy.threat.toLowerCase()})
                </Text>
                {enemy.weakness !== "None" && (
                  <Text style={styles.weakness}>{"\u2192"} {enemy.weakness}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Quests */}
        {intel.quests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>QUESTS</Text>
              <Text style={styles.sectionSummary}>{intel.quests.length} active</Text>
            </View>
            {top3Quests.map((quest) => (
              <View key={quest.id} style={styles.questRow}>
                <Text style={styles.questName} numberOfLines={1}>
                  {quest.name}
                </Text>
                {quest.trader && (
                  <Text style={styles.questTrader}>({quest.trader})</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Active events */}
        {intel.activeEvents.length > 0 && (
          <View style={styles.section}>
            {intel.activeEvents.map((ev, i) => {
              const remaining = ev.endTime - now;
              return (
                <View key={i} style={styles.eventRow}>
                  <Text style={styles.eventIcon}>{"\u26A1"}</Text>
                  <Text style={styles.eventName} numberOfLines={1}>{ev.name}</Text>
                  {remaining > 0 && (
                    <Text style={styles.eventCountdown}>{formatCountdown(remaining)}</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Loot */}
        {intel.loot.length > 0 && (
          <View style={styles.section}>
            <View style={styles.lootRow}>
              <Text style={styles.sectionLabel}>LOOT</Text>
              <Text style={styles.lootText} numberOfLines={1}>{lootLine}</Text>
            </View>
          </View>
        )}

        {/* Mode toggle */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "auto" && styles.modeBtnActive]}
            onPress={() => toggleMode("auto")}
          >
            <Text style={[styles.modeBtnText, mode === "auto" && styles.modeBtnTextActive]}>
              AUTO {mode === "auto" ? "\u25C9" : "\u25CB"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "pinned" && styles.modeBtnActive]}
            onPress={() => toggleMode("pinned")}
          >
            <Text style={[styles.modeBtnText, mode === "pinned" && styles.modeBtnTextActive]}>
              PINNED {mode === "pinned" ? "\u25C9" : "\u25CB"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </div>
  );
}

// ─── Inject CSS keyframes ────────────────────────────────────────

if (typeof document !== "undefined") {
  const styleId = "overlay-map-pip-keyframes";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes pipSlideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes pipFadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(10, 14, 18, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(0, 180, 216, 0.5)",
    borderRadius: 6,
    maxWidth: 400,
    marginTop: 4,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(42, 90, 106, 0.3)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mapIcon: {
    fontSize: 12,
    color: Colors.accent,
  },
  mapName: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: 0.8,
  },
  sourceTag: {
    fontSize: 7,
    fontWeight: "700",
    color: Colors.green,
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    letterSpacing: 0.5,
    overflow: "hidden",
  },
  pinBtn: {
    padding: 2,
  },
  pinIcon: {
    fontSize: 12,
    color: "rgba(107, 132, 152, 0.8)",
  },
  closeBtn: {
    padding: 2,
  },
  closeIcon: {
    fontSize: 10,
    color: "rgba(107, 132, 152, 0.8)",
  },
  section: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(42, 90, 106, 0.2)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.8)",
    letterSpacing: 1,
  },
  sectionSummary: {
    fontSize: 8,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  enemyRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 18,
    gap: 4,
    paddingLeft: 4,
  },
  enemyName: {
    fontSize: 9,
    fontWeight: "600",
    color: Colors.text,
  },
  threatTag: {
    fontSize: 8,
    fontWeight: "600",
  },
  weakness: {
    fontSize: 8,
    color: Colors.accent,
  },
  questRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 18,
    gap: 4,
    paddingLeft: 4,
  },
  questName: {
    fontSize: 9,
    fontWeight: "600",
    color: Colors.text,
  },
  questTrader: {
    fontSize: 8,
    color: Colors.accent,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 20,
  },
  eventIcon: {
    fontSize: 10,
    color: Colors.amber,
  },
  eventName: {
    fontSize: 9,
    fontWeight: "600",
    color: Colors.amber,
    flex: 1,
  },
  eventCountdown: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.text,
    fontVariant: ["tabular-nums"],
  },
  lootRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  lootText: {
    fontSize: 9,
    color: Colors.textSecondary,
    flex: 1,
  },
  modeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 5,
  },
  modeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 3,
    backgroundColor: "rgba(42, 90, 106, 0.15)",
  },
  modeBtnActive: {
    backgroundColor: "rgba(0, 180, 216, 0.2)",
  },
  modeBtnText: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.7)",
    letterSpacing: 0.5,
  },
  modeBtnTextActive: {
    color: Colors.accent,
  },
});
