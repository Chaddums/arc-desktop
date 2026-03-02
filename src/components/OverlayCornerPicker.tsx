/**
 * OverlayCornerPicker — Visual 2x2 grid for selecting overlay anchor corner.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors } from "../theme";
import type { AnchorPosition } from "../hooks/useOverlayConfig";

interface Props {
  value: AnchorPosition | null;
  onChange: (anchor: AnchorPosition | null) => void;
  disabled?: boolean;
}

const CORNERS: { key: AnchorPosition; row: number; col: number }[] = [
  { key: "top-left", row: 0, col: 0 },
  { key: "top-right", row: 0, col: 1 },
  { key: "bottom-left", row: 1, col: 0 },
  { key: "bottom-right", row: 1, col: 1 },
];

export default function OverlayCornerPicker({ value, onChange, disabled }: Props) {
  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      <View style={styles.screen}>
        {CORNERS.map(({ key, row, col }) => {
          const active = value === key;
          return (
            <TouchableOpacity
              key={key}
              activeOpacity={0.7}
              disabled={disabled}
              onPress={() => onChange(active ? null : key)}
              style={[
                styles.corner,
                { top: row === 0 ? 4 : undefined, bottom: row === 1 ? 4 : undefined },
                { left: col === 0 ? 4 : undefined, right: col === 1 ? 4 : undefined },
                active && styles.cornerActive,
              ]}
            >
              <View style={[styles.dot, active && styles.dotActive]} />
            </TouchableOpacity>
          );
        })}
        <Text style={styles.label}>SCREEN</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 8,
  },
  containerDisabled: {
    opacity: 0.4,
  },
  screen: {
    width: 120,
    height: 72,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
    borderRadius: 4,
    backgroundColor: Colors.bgDeep,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  cornerActive: {
    backgroundColor: Colors.accentBg,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    backgroundColor: "transparent",
  },
  dotActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent,
  },
  label: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 2,
    color: Colors.textMuted,
    // @ts-ignore react-native-web transform
    transform: [{ translateY: -5 }],
  },
});
