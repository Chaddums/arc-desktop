/**
 * Panel — Card container with sci-fi corner accent marks.
 * Adapted from LAMA's Panel.tsx (teal corners instead of gold).
 * Supports variant prop: "default" | "elevated" | "glow"
 */

import React from "react";
import { View, ViewStyle, StyleSheet } from "react-native";
import { Colors, spacing } from "../theme";

interface PanelProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: "default" | "elevated" | "glow";
}

export default function Panel({ children, style, variant = "default" }: PanelProps) {
  const cornerColor = variant === "glow" ? Colors.borderGlow : Colors.borderAccent;

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: Colors.card, borderColor: Colors.border },
        variant === "elevated" && { backgroundColor: Colors.cardElevated },
        variant === "glow" && { backgroundColor: Colors.accentGlow, borderColor: Colors.borderGlow },
        style,
      ]}
    >
      <View
        style={[
          styles.corner,
          styles.topLeft,
          { borderTopColor: cornerColor, borderLeftColor: cornerColor },
        ]}
      />
      <View
        style={[
          styles.corner,
          styles.bottomRight,
          { borderBottomColor: cornerColor, borderRightColor: cornerColor },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: 6,
    padding: spacing.md,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 10,
    height: 10,
    zIndex: 1,
  },
  topLeft: {
    top: -1,
    left: -1,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
  },
  bottomRight: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
  },
});
