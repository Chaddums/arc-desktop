/**
 * CountdownTimer — Displays a countdown to a target time.
 * Shows days/hours/minutes/seconds with color-coded urgency.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../theme";
import { formatCountdown } from "../utils/format";

interface CountdownTimerProps {
  targetTime: number;
  now: number;
  label?: string;
  isActive?: boolean;
}

export default function CountdownTimer({
  targetTime,
  now,
  label,
  isActive = false,
}: CountdownTimerProps) {
  const remaining = targetTime - now;
  const isExpired = remaining <= 0;
  const isUrgent = remaining > 0 && remaining < 10 * 60 * 1000; // < 10 min

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Text
        style={[
          styles.time,
          isActive && styles.active,
          isUrgent && styles.urgent,
          isExpired && styles.expired,
        ]}
      >
        {isExpired ? "ENDED" : formatCountdown(remaining)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  label: {
    fontSize: 10,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  time: {
    fontSize: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    color: Colors.text,
  },
  active: {
    color: Colors.green,
  },
  urgent: {
    color: Colors.amber,
  },
  expired: {
    color: Colors.textMuted,
  },
});
