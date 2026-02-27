/**
 * EmptyState — Icon + title + hint for empty views.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../theme";
import Panel from "./Panel";

interface EmptyStateProps {
  icon?: string;
  title: string;
  hint?: string;
}

export default function EmptyState({ icon, title, hint }: EmptyStateProps) {
  return (
    <Panel>
      <View style={styles.container}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <Text style={[styles.title, { color: Colors.textSecondary }]}>{title}</Text>
        {hint && <Text style={[styles.hint, { color: Colors.textMuted }]}>{hint}</Text>}
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 8,
  },
  icon: {
    fontSize: 28,
    marginBottom: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  hint: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 3,
  },
});
