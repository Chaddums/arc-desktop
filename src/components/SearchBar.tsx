/**
 * SearchBar — Text input with search icon, clear button, and optional autocomplete dropdown.
 * When `results` + `onSelect` are provided, shows instant matches as user types.
 */

import React, { useRef, useState, useEffect } from "react";
import { View, TextInput, TouchableOpacity, Text, ScrollView, StyleSheet } from "react-native";
import { Colors } from "../theme";

export interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  rightLabel?: string;
  rightColor?: string;
}

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Autocomplete results to show in dropdown */
  results?: SearchResult[];
  /** Called when a result is selected */
  onSelect?: (result: SearchResult) => void;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Max results to show */
  maxResults?: number;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholder = "Search...",
  results,
  onSelect,
  autoFocus,
  maxResults = 12,
}: SearchBarProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [autoFocus]);

  const showDropdown = focused && results && results.length > 0 && value.length > 0;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { backgroundColor: Colors.input, borderColor: Colors.border }]}>
        <Text style={styles.icon}>&#x1F50D;</Text>
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: Colors.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          autoCorrect={false}
          autoCapitalize="none"
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
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

      {showDropdown && (
        <View style={[styles.dropdown, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
          <ScrollView
            style={styles.dropdownScroll}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {results!.slice(0, maxResults).map((result) => (
              <TouchableOpacity
                key={result.id}
                style={[styles.resultRow, { borderBottomColor: Colors.border }]}
                onPress={() => {
                  onSelect?.(result);
                  onChangeText("");
                }}
                activeOpacity={0.6}
              >
                <View style={styles.resultInfo}>
                  <Text style={[styles.resultLabel, { color: Colors.text }]} numberOfLines={1}>
                    {result.label}
                  </Text>
                  {result.sublabel && (
                    <Text style={[styles.resultSublabel, { color: Colors.textSecondary }]} numberOfLines={1}>
                      {result.sublabel}
                    </Text>
                  )}
                </View>
                {result.rightLabel && (
                  <Text style={[styles.resultRight, { color: result.rightColor || Colors.accent }]}>
                    {result.rightLabel}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    zIndex: 10,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 32,
    marginBottom: 4,
  },
  icon: {
    fontSize: 13,
    marginRight: 6,
    opacity: 0.5,
  },
  input: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  clear: {
    fontSize: 13,
    marginLeft: 6,
  },
  dropdown: {
    position: "absolute",
    top: 34,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 6,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  resultInfo: {
    flex: 1,
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  resultSublabel: {
    fontSize: 10,
    marginTop: 1,
  },
  resultRight: {
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 8,
  },
});
