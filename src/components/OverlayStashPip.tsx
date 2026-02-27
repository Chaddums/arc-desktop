/**
 * OverlayStashPip — Compact overlay stash quick-reference card.
 * Shows verdict breakdown + top crafting materials + best sells.
 * Same auto/pinned pattern as OverlayMapPip.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "../theme";
import type { StashVerdict } from "../types";
import type { StashStats } from "../hooks/useStashOrganizer";

const PIP_MODE_KEY = "@arcview/stash_pip_mode";
const AUTO_DISMISS_MS = 10_000;

type PipMode = "auto" | "pinned";

interface Props {
  verdicts: StashVerdict[];
  stats: StashStats;
  loading: boolean;
}

export default function OverlayStashPip({ verdicts, stats, loading }: Props) {
  const [mode, setMode] = useState<PipMode>("auto");
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const prevCountRef = useRef(0);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted mode
  useEffect(() => {
    AsyncStorage.getItem(PIP_MODE_KEY)
      .then((val) => {
        if (val === "auto" || val === "pinned") setMode(val);
      })
      .catch(() => {});
  }, []);

  // Persist mode changes
  const toggleMode = useCallback((newMode: PipMode) => {
    setMode(newMode);
    AsyncStorage.setItem(PIP_MODE_KEY, newMode).catch(() => {});
  }, []);

  // Clear timers
  const clearTimers = useCallback(() => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  // Show pip when verdicts load or refresh
  useEffect(() => {
    if (verdicts.length === 0) return;

    // Only trigger on new data (count change)
    if (verdicts.length === prevCountRef.current) return;
    prevCountRef.current = verdicts.length;

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
      }, AUTO_DISMISS_MS);
    }
  }, [verdicts.length, mode, clearTimers]);

  // Reset auto-dismiss when mode changes
  useEffect(() => {
    if (!visible) return;
    clearTimers();

    if (mode === "auto") {
      autoTimerRef.current = setTimeout(() => {
        setFading(true);
        fadeTimerRef.current = setTimeout(() => {
          setVisible(false);
          setFading(false);
        }, 500);
      }, AUTO_DISMISS_MS);
    }
  }, [mode]); // intentionally only mode

  // Cleanup on unmount
  useEffect(() => clearTimers, [clearTimers]);

  const handleClose = useCallback(() => {
    clearTimers();
    setVisible(false);
    setFading(false);
  }, [clearTimers]);

  if (!visible || verdicts.length === 0) return null;

  // Derive top items
  const keepItems = verdicts
    .filter((v) => v.verdict === "keep")
    .sort((a, b) => b.craftingUses.length - a.craftingUses.length)
    .slice(0, 5);

  const sellItems = verdicts
    .filter((v) => v.verdict === "sell")
    .sort((a, b) => b.sellValue - a.sellValue)
    .slice(0, 5);

  const animStyle: React.CSSProperties = fading
    ? { animation: "pipFadeOut 0.5s ease-in forwards" }
    : { animation: "pipSlideIn 0.3s ease-out" };

  return (
    <div style={animStyle}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerIcon}>{"\u2726"}</Text>
            <Text style={styles.headerTitle}>STASH GUIDE</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => toggleMode(mode === "auto" ? "pinned" : "auto")}
              style={styles.pinBtn}
            >
              <Text style={styles.pinIcon}>
                {mode === "pinned" ? "\u2611" : "\u2610"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>{"\u2715"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Verdict summary bar */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryCell}>
            <Text style={[styles.summaryValue, { color: Colors.verdictKeep }]}>
              KEEP {stats.keepCount}
            </Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryCell}>
            <Text style={[styles.summaryValue, { color: Colors.verdictSell }]}>
              SELL {stats.sellCount}
            </Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryCell}>
            <Text
              style={[styles.summaryValue, { color: Colors.verdictRecycle }]}
            >
              REC {stats.recycleCount}
            </Text>
          </View>
        </View>

        {/* Top crafting materials */}
        {keepItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>TOP CRAFTING MATERIALS</Text>
            {keepItems.map((sv) => (
              <View key={sv.item.id} style={styles.itemRow}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {sv.item.name}
                </Text>
                <Text style={styles.itemDetail}>
                  {sv.craftingUses.length} recipe
                  {sv.craftingUses.length !== 1 ? "s" : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Best sells */}
        {sellItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>BEST SELLS</Text>
            {sellItems.map((sv) => (
              <View key={sv.item.id} style={styles.itemRow}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {sv.item.name}
                </Text>
                <Text style={styles.itemDetail}>{sv.sellValue} value</Text>
              </View>
            ))}
          </View>
        )}

        {/* Mode toggle */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "auto" && styles.modeBtnActive]}
            onPress={() => toggleMode("auto")}
          >
            <Text
              style={[
                styles.modeBtnText,
                mode === "auto" && styles.modeBtnTextActive,
              ]}
            >
              AUTO {mode === "auto" ? "\u25C9" : "\u25CB"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "pinned" && styles.modeBtnActive]}
            onPress={() => toggleMode("pinned")}
          >
            <Text
              style={[
                styles.modeBtnText,
                mode === "pinned" && styles.modeBtnTextActive,
              ]}
            >
              PINNED {mode === "pinned" ? "\u25C9" : "\u25CB"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </div>
  );
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
  headerIcon: {
    fontSize: 12,
    color: Colors.accent,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: 0.8,
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
  summaryBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(42, 90, 106, 0.2)",
  },
  summaryCell: {
    flex: 1,
    alignItems: "center",
  },
  summarySep: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(42, 90, 106, 0.4)",
  },
  summaryValue: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(42, 90, 106, 0.2)",
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.8)",
    letterSpacing: 1,
    marginBottom: 2,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 18,
    paddingLeft: 4,
  },
  itemName: {
    fontSize: 9,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
  },
  itemDetail: {
    fontSize: 8,
    color: Colors.textSecondary,
    marginLeft: 6,
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
