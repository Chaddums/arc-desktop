/**
 * OverlayStatusStrip — Loadout + next event status card.
 * Standard section card following the same pattern as all other overlay cards.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatCountdown } from "../utils/format";
import { Colors, fonts } from "../theme";

const BUILD_CLASS_COLORS: Record<string, string> = {
  DPS: Colors.red,
  Tank: Colors.accent,
  Support: Colors.green,
  Hybrid: Colors.amber,
};

interface Props {
  weaponName: string | null;
  buildClass: string;
  overallScore: number;
  countdown: number | null;
  isImminent: boolean;
  hasActive: boolean;
  headerColor?: string;
  borderColor?: string;
}

export default function OverlayStatusStrip({
  weaponName,
  buildClass,
  overallScore,
  countdown,
  isImminent,
  hasActive,
  headerColor,
  borderColor,
}: Props) {
  const buildClassColor = BUILD_CLASS_COLORS[buildClass] ?? Colors.textMuted;

  const countdownText =
    countdown != null && countdown > 0
      ? formatCountdown(countdown)
      : hasActive
      ? "NOW"
      : "--:--";

  return (
    <View style={[styles.container, borderColor ? { borderColor } : undefined]}>
      <View style={styles.header}>
        <Text style={[styles.headerText, headerColor ? { color: headerColor } : undefined]}>
          STATUS
        </Text>
      </View>

      {/* Loadout row */}
      <View style={styles.row}>
        <Text style={styles.label}>LOADOUT</Text>
        {weaponName ? (
          <View style={styles.valueGroup}>
            <Text style={styles.valuePrimary} numberOfLines={1}>{weaponName}</Text>
            <Text style={[styles.badge, { color: buildClassColor }]}>{buildClass}</Text>
            <Text style={styles.score}>{overallScore}</Text>
          </View>
        ) : (
          <Text style={styles.valueDim}>--</Text>
        )}
      </View>

      {/* Next event row */}
      <View style={styles.row}>
        <Text style={styles.label}>NEXT EVENT</Text>
        <Text style={[
          styles.countdown,
          isImminent && styles.countdownImminent,
          hasActive && !isImminent && styles.countdownActive,
        ]}>
          {countdownText}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(10, 14, 18, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(42, 90, 106, 0.6)",
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  header: {
    marginBottom: 4,
  },
  headerText: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.8)",
    letterSpacing: 1.2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 20,
  },
  label: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.6)",
    letterSpacing: 0.8,
  },
  valueGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  valuePrimary: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.text,
    maxWidth: 100,
  },
  valueDim: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  badge: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  score: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.accent,
    fontFamily: fonts.mono,
    fontVariant: ["tabular-nums"],
  },
  countdown: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.accent,
    fontFamily: fonts.mono,
    fontVariant: ["tabular-nums"],
  },
  countdownImminent: {
    color: Colors.amber,
  },
  countdownActive: {
    color: Colors.green,
  },
});
