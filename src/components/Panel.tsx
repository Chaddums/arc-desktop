/**
 * Panel — Card container with sci-fi corner accent marks.
 * Adapted from LAMA's Panel.tsx (teal corners instead of gold).
 * Supports variant prop: "default" | "elevated" | "glow"
 */

import React from "react";
import { View, ViewStyle, StyleSheet } from "react-native";
import { Colors } from "../theme";

interface PanelProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: "default" | "elevated" | "glow";
}

export default function Panel({ children, style, variant = "default" }: PanelProps) {
  return (
    <View
      style={[
        styles.panel,
        variant === "elevated" && styles.elevated,
        variant === "glow" && styles.glow,
        style,
      ]}
    >
      <View
        style={[
          styles.corner,
          styles.topLeft,
          variant === "glow" && styles.cornerGlow,
        ]}
      />
      <View
        style={[
          styles.corner,
          styles.bottomRight,
          variant === "glow" && styles.cornerGlow,
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    position: "relative",
  },
  elevated: {
    backgroundColor: Colors.cardElevated,
  },
  glow: {
    backgroundColor: Colors.accentGlow,
    borderColor: Colors.borderGlow,
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
    borderTopColor: Colors.borderAccent,
    borderLeftColor: Colors.borderAccent,
  },
  bottomRight: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderBottomColor: Colors.borderAccent,
    borderRightColor: Colors.borderAccent,
  },
  cornerGlow: {
    borderTopColor: Colors.borderGlow,
    borderLeftColor: Colors.borderGlow,
    borderBottomColor: Colors.borderGlow,
    borderRightColor: Colors.borderGlow,
  },
});
