/**
 * ItemRow — Pressable item row with rarity color accent + optional watchlist star.
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
  showStar?: boolean;
  isStarred?: boolean;
  onStarPress?: () => void;
}

export default function ItemRow({
  name,
  subtitle,
  rarity,
  rightText,
  rightColor,
  onPress,
  showStar,
  isStarred,
  onStarPress,
}: ItemRowProps) {
  const rarityColor = rarity
    ? (rarityColors as Record<string, string>)[rarity.toLowerCase()] ?? Colors.textSecondary
    : undefined;

  return (
    <TouchableOpacity
      style={[
        styles.row,
        { backgroundColor: Colors.card, borderColor: Colors.border },
        rarityColor ? { borderLeftColor: rarityColor, borderLeftWidth: 3 } : null,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {showStar && (
        <TouchableOpacity
          onPress={onStarPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.starBtn}
        >
          <Text style={[styles.starText, isStarred && { color: Colors.accent }]}>
            {isStarred ? "\u2605" : "\u2606"}
          </Text>
        </TouchableOpacity>
      )}
      <View style={styles.info}>
        <Text style={[styles.name, { color: Colors.text }]} numberOfLines={1}>{name}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: Colors.textSecondary }]} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {rightText && (
        <Text style={[styles.rightText, { color: rightColor || Colors.accent }]}>
          {rightText}
        </Text>
      )}
      {onPress && <Text style={[styles.chevron, { color: Colors.textMuted }]}>&#x203A;</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 4,
  },
  starBtn: {
    marginRight: 6,
    padding: 2,
  },
  starText: {
    fontSize: 16,
    color: "#6b8498",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 10,
    marginTop: 1,
  },
  rightText: {
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    marginLeft: 8,
  },
  chevron: {
    fontSize: 18,
    marginLeft: 4,
  },
});
