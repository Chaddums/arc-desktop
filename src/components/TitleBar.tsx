/**
 * TitleBar — Custom frameless window title bar for desktop.
 * Drag region + minimize/maximize/close buttons.
 * Only renders when running in Electron (window.arcDesktop exists).
 */

import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Colors } from "../theme";

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  // Check initial maximized state
  useEffect(() => {
    window.arcDesktop?.windowIsMaximized?.().then((v: boolean) => setMaximized(v));
  }, []);

  const handleMinimize = useCallback(() => {
    window.arcDesktop?.windowMinimize?.();
  }, []);

  const handleMaximize = useCallback(() => {
    window.arcDesktop?.windowMaximize?.();
    setMaximized((m) => !m);
  }, []);

  const handleClose = useCallback(() => {
    window.arcDesktop?.windowClose?.();
  }, []);

  // Only render on desktop Electron
  if (Platform.OS !== "web" || !window.arcDesktop || window.arcDesktop.isOverlay) {
    return null;
  }

  return (
    <div style={dragRegionStyle}>
      <View style={styles.bar}>
        {/* Brand */}
        <View style={styles.brand}>
          <Text style={styles.brandText}>ARC</Text>
          <Text style={styles.brandAccent}>VIEW</Text>
        </View>

        {/* Spacer (draggable area) */}
        <View style={styles.spacer} />

        {/* Window controls */}
        <div style={noDragStyle}>
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={handleMinimize}
              activeOpacity={0.6}
            >
              <Text style={styles.controlIcon}>─</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={handleMaximize}
              activeOpacity={0.6}
            >
              <Text style={styles.controlIcon}>{maximized ? "❐" : "□"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlBtn, styles.closeBtn]}
              onPress={handleClose}
              activeOpacity={0.6}
            >
              <Text style={[styles.controlIcon, styles.closeIcon]}>✕</Text>
            </TouchableOpacity>
          </View>
        </div>
      </View>
    </div>
  );
}

// Web-only: drag region style
const dragRegionStyle: React.CSSProperties = {
  WebkitAppRegion: "drag",
  userSelect: "none",
} as React.CSSProperties;

const noDragStyle: React.CSSProperties = {
  WebkitAppRegion: "no-drag",
} as React.CSSProperties;

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    height: 32,
    backgroundColor: Colors.bgDeep,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingLeft: 12,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  brandText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 2,
  },
  brandAccent: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.accent,
    letterSpacing: 2,
  },
  spacer: {
    flex: 1,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    height: 32,
  },
  controlBtn: {
    width: 46,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  controlIcon: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  closeBtn: {
    // hover handled via web CSS if needed
  },
  closeIcon: {
    fontSize: 11,
  },
});
