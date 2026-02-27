/**
 * Toggle — Smooth sliding toggle switch.
 * Two sizes: "small" (28×16) and "normal" (36×20).
 */

import React, { useRef, useEffect } from "react";
import { TouchableOpacity, Animated, StyleSheet, ViewStyle } from "react-native";
import { Colors } from "../theme";

interface ToggleProps {
  value: boolean;
  onToggle: () => void;
  size?: "small" | "normal";
  style?: ViewStyle;
}

const SIZES = {
  small:  { track: { w: 28, h: 16 }, dot: 12, travel: 12 },
  normal: { track: { w: 36, h: 20 }, dot: 16, travel: 16 },
};

export default function Toggle({ value, onToggle, size = "normal", style }: ToggleProps) {
  const s = SIZES[size];
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, s.travel],
  });

  const trackBg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.accent],
  });

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.8}
      style={[{ flexShrink: 0 }, style]}
    >
      <Animated.View
        style={[
          styles.track,
          {
            width: s.track.w,
            height: s.track.h,
            borderRadius: s.track.h / 2,
            backgroundColor: trackBg,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.dot,
            {
              width: s.dot,
              height: s.dot,
              borderRadius: s.dot / 2,
              transform: [{ translateX }],
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    justifyContent: "center",
  },
  dot: {
    backgroundColor: "#fff",
  },
});
