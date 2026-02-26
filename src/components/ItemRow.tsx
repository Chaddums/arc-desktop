/**
 * ItemRow — Pressable item row with rarity color accent.
 */

import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Colors, rarityColors } from "../theme";

interface ItemRowProps {
  name: string;
  subtitle?: string;
  rarity?: string;
  rightText?: string;
  rightColor?: string;
  onPress?: () => void;
}

export default function ItemRow({
  name,
  subtitle,
  rarity,
  rightText,
  rightColor,
  onPress,
}: ItemRowProps) {
  const rarityColor = rarity
    ? (rarityColors as Record<string, string>)[rarity.toLowerCase()] ?? Colors.textSecondary
    : undefined;

  return (
    <TouchableOpacity
      style={[styles.row, rarityColor ? { borderLeftColor: rarityColor, borderLeftWidth: 3 } : null]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {rightText && (
        <Text style={[styles.rightText, rightColor ? { color: rightColor } : null]}>
          {rightText}
        </Text>
      )}
      {onPress && <Text style={styles.chevron}>&#x203A;</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rightText: {
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: Colors.accent,
    marginLeft: 8,
  },
  chevron: {
    fontSize: 20,
    color: Colors.textMuted,
    marginLeft: 4,
  },
});
