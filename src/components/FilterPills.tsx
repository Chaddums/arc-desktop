/**
 * FilterPills — Generic horizontal filter pill row.
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
        style={[
          styles.pill,
          { borderColor: Colors.border, backgroundColor: Colors.card },
          !selected && { borderColor: Colors.accent, backgroundColor: "rgba(0, 180, 216, 0.15)" },
        ]}
        onPress={() => onSelect(null)}
      >
        <Text style={[styles.pillText, { color: Colors.textSecondary }, !selected && { color: Colors.accent }]}>
          {allLabel}
        </Text>
      </TouchableOpacity>
      {options.map((opt) => {
        const isActive = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[
              styles.pill,
              { borderColor: Colors.border, backgroundColor: Colors.card },
              isActive && { borderColor: Colors.accent, backgroundColor: "rgba(0, 180, 216, 0.15)" },
            ]}
            onPress={() => onSelect(isActive ? null : opt)}
          >
            <Text style={[styles.pillText, { color: Colors.textSecondary }, isActive && { color: Colors.accent }]}>
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
    maxHeight: 36,
  },
  content: {
    gap: 6,
    alignItems: "center",
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
