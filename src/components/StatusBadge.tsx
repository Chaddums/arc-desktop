/**
 * StatusBadge — Compact status indicator with label and optional countdown.
 * States: idle, active, cooldown, error, disabled.
 */

import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, ViewStyle } from "react-native";
import { Colors, spacing, fontSize } from "../theme";

type BadgeStatus = "idle" | "active" | "cooldown" | "error" | "disabled";

interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
  countdown?: string;
  style?: ViewStyle;
}

const STATUS_CONFIG: Record<BadgeStatus, { bg: string; text: string; pulse: boolean }> = {
  idle:     { bg: Colors.border, text: Colors.textSecondary, pulse: false },
  active:   { bg: Colors.accent, text: "#fff", pulse: true },
  cooldown: { bg: "rgba(0, 180, 216, 0.2)", text: Colors.accent, pulse: false },
  error:    { bg: "rgba(192, 57, 43, 0.2)", text: Colors.red, pulse: false },
  disabled: { bg: Colors.bgDeep, text: Colors.textMuted, pulse: false },
};

export default function StatusBadge({ status, label, countdown, style }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (config.pulse) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [config.pulse]);

  const displayLabel =
    label ?? (status === "idle" ? "IDLE" : status === "active" ? "ACTIVE" : status === "cooldown" ? "COOLDOWN" : status === "error" ? "ERROR" : "OFF");

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, style]}>
      <Animated.View style={[styles.dot, { backgroundColor: config.text, opacity: pulseAnim }]} />
      <Text style={[styles.label, { color: config.text }]}>{displayLabel}</Text>
      {countdown && <Text style={[styles.countdown, { color: config.text }]}>{countdown}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  countdown: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});
