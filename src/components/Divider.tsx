/**
 * Divider — Horizontal rule with centered diamond accent.
 * Adapted from LAMA's GoldDivider.tsx (teal instead of gold).
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { Colors } from "../theme";

export default function Divider() {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <View style={styles.diamond} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    height: 1,
    marginVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  line: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.borderAccent,
    opacity: 0.6,
  },
  diamond: {
    width: 6,
    height: 6,
    backgroundColor: Colors.accent,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
    transform: [{ rotate: "45deg" }],
  },
});
