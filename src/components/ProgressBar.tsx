/**
 * ProgressBar — Reusable horizontal progress bar.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { Colors } from "../theme";

interface ProgressBarProps {
  progress: number;  // 0-1
  color?: string;
  height?: number;
}

export default function ProgressBar({
  progress,
  color = Colors.green,
  height = 4,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.track, { height }]}>
      <View
        style={[
          styles.fill,
          { width: `${clamped * 100}%`, backgroundColor: color, height },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    borderRadius: 2,
  },
});
