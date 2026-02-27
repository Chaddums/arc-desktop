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
    <View style={styles.container}>
      <Text style={styles.icon}>&#x1F50D;</Text>
      <TextInput
        style={styles.input}
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
          <Text style={styles.clear}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.input,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.text,
    padding: 0,
  },
  clear: {
    fontSize: 14,
    color: Colors.textMuted,
    marginLeft: 8,
  },
});
