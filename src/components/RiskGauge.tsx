/**
 * RiskGauge — Circular/arc risk score display (1-100).
 * Color gradient: green (low) -> amber (moderate) -> red (high).
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Colors } from "../theme";

interface RiskGaugeProps {
  score: number;  // 1-100
  size?: number;
  label?: string;
}

function getRiskColor(score: number): string {
  if (score <= 33) return Colors.riskLow;
  if (score <= 66) return Colors.riskMedium;
  return Colors.riskHigh;
}

function getRiskLabel(score: number): string {
  if (score <= 33) return "Low Risk";
  if (score <= 66) return "Moderate";
  return "High Risk";
}

export default function RiskGauge({
  score,
  size = 120,
  label,
}: RiskGaugeProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const progress = clamped / 100;
  const dashOffset = circumference * (1 - progress);
  const color = getRiskColor(clamped);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={Colors.border}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.score, { color }]}>{clamped}</Text>
        <Text style={styles.label}>{label ?? getRiskLabel(clamped)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    position: "absolute",
    alignItems: "center",
  },
  score: {
    fontSize: 28,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
