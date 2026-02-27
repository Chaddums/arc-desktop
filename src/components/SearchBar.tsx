/**
 * SearchBar — Text input with search icon and clear button.
 */

import React from "react";
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Colors } from "../theme";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholder = "Search...",
}: SearchBarProps) {
  return (
    <View style={[styles.container, { backgroundColor: Colors.input, borderColor: Colors.border }]}>
      <Text style={styles.icon}>&#x1F50D;</Text>
      <TextInput
        style={[styles.input, { color: Colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText("")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.clear, { color: Colors.textMuted }]}>{"\u2715"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 34,
    marginBottom: 6,
  },
  icon: {
    fontSize: 14,
    marginRight: 8,
    opacity: 0.5,
  },
  input: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  clear: {
    fontSize: 14,
    marginLeft: 8,
  },
});
