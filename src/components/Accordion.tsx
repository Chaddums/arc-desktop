/**
 * Accordion — Expandable section with header, chevron rotation, and accent left border.
 */

import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { Colors, spacing, fontSize } from "../theme";

interface AccordionProps {
  title: string;
  subtitle?: string;
  rightText?: string;
  rightColor?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  style?: ViewStyle;
}

export default function Accordion({
  title,
  subtitle,
  rightText,
  rightColor,
  children,
  defaultExpanded = false,
  style,
}: AccordionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const toggle = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    Animated.timing(rotateAnim, {
      toValue: next ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [expanded]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "90deg"],
  });

  return (
    <View style={[styles.container, expanded && styles.containerExpanded, style]}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.7} style={styles.header}>
        <Animated.Text style={[styles.chevron, { transform: [{ rotate }] }]}>
          ›
        </Animated.Text>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>
        {rightText && (
          <Text style={[styles.rightText, rightColor ? { color: rightColor } : null]}>
            {rightText}
          </Text>
        )}
      </TouchableOpacity>
      {expanded && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  containerExpanded: {
    borderLeftWidth: 2,
    borderLeftColor: Colors.accent,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chevron: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textMuted,
    width: 18,
    textAlign: "center",
  },
  titleWrap: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: Colors.text,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  rightText: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginLeft: spacing.sm,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
