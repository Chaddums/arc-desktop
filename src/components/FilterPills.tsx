/**
 * FilterPills — Generic horizontal filter pill row.
 * Adapted from EventsScreen map filter pills + LAMA MarketScreen category pills.
 */

import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Colors } from "../theme";

interface FilterPillsProps {
  options: string[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  allLabel?: string;
}

export default function FilterPills({
  options,
  selected,
  onSelect,
  allLabel = "All",
}: FilterPillsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={styles.content}
    >
      <TouchableOpacity
        style={[styles.pill, !selected && styles.pillActive]}
        onPress={() => onSelect(null)}
      >
        <Text style={[styles.pillText, !selected && styles.pillTextActive]}>
          {allLabel}
        </Text>
      </TouchableOpacity>
      {options.map((opt) => {
        const isActive = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => onSelect(isActive ? null : opt)}
          >
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    maxHeight: 44,
  },
  content: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: "center",
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  pillActive: {
    borderColor: Colors.accent,
    backgroundColor: "rgba(0, 180, 216, 0.15)",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.accent,
  },
});
