/**
 * BackHeader — Back button + title for sub-view navigation.
 */

import React from "react";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";
import { Colors } from "../theme";

interface BackHeaderProps {
  title: string;
  onBack: () => void;
}

export default function BackHeader({ title, onBack }: BackHeaderProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={[styles.backText, { color: Colors.accent }]}>&#x2039; {title}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 6,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
