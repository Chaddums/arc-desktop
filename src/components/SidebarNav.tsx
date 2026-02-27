/**
 * SidebarNav — Vertical navigation rail for desktop/wide viewports.
 * Replaces bottom tabs when viewport >= breakpoints.desktop.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors, spacing, fontSize as fs } from "../theme";

interface NavItem {
  key: string;
  label: string;
  icon: string;
}

interface SidebarNavProps {
  items: NavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export default function SidebarNav({ items, activeKey, onSelect }: SidebarNavProps) {
  return (
    <View style={[styles.sidebar, { backgroundColor: Colors.card, borderRightColor: Colors.border }]}>
      <Text style={[styles.brand, { color: Colors.accent }]}>ARC</Text>
      <Text style={[styles.brandSub, { color: Colors.textMuted }]}>VIEW</Text>
      <View style={[styles.divider, { backgroundColor: Colors.borderAccent }]} />
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.navItem, active && [styles.navItemActive, { backgroundColor: Colors.accentGlow }]]}
            onPress={() => onSelect(item.key)}
            activeOpacity={0.7}
          >
            {active && <View style={[styles.activeBar, { backgroundColor: Colors.accent }]} />}
            <Text style={styles.navIcon}>{item.icon}</Text>
            <Text style={[styles.navLabel, { color: Colors.textMuted }, active && { color: Colors.accent }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
      <View style={styles.spacer} />
      <Text style={[styles.version, { color: Colors.textMuted }]}>v0.2.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 72,
    borderRightWidth: 1,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  brand: {
    fontSize: fs.lg,
    fontWeight: "700",
    letterSpacing: 3,
  },
  brandSub: {
    fontSize: fs.xs,
    fontWeight: "700",
    letterSpacing: 4,
    marginTop: -2,
  },
  divider: {
    width: 32,
    height: 1,
    marginVertical: spacing.lg,
  },
  navItem: {
    width: 56,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: 6,
    marginBottom: spacing.xs,
    position: "relative",
  },
  navItemActive: {},
  activeBar: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 2,
    borderRadius: 1,
  },
  navIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 8,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  spacer: {
    flex: 1,
  },
  version: {
    fontSize: 8,
  },
});
