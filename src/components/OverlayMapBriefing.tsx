/**
 * OverlayMapBriefing — Manual map select + risk score + threats + loadout fit.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { RiskAssessment } from "../types";
import type { ThreatSummary } from "../hooks/useMapRecommendations";
import { Colors, fonts } from "../theme";

const MAP_BUTTONS: { label: string; value: string }[] = [
  { label: "DAM", value: "Dam" },
  { label: "SPC", value: "Spaceport" },
  { label: "BRC", value: "Buried City" },
  { label: "BLG", value: "Blue Gate" },
  { label: "STM", value: "Stella Montis" },
];

interface Props {
  maps: string[];
  selectedMap: string | null;
  onSelectMap: (map: string) => void;
  riskAssessment: RiskAssessment | null;
  threatSummary: ThreatSummary;
  loadoutFitScore: number;
  expanded: boolean;
  onToggle: () => void;
}

function riskColor(score: number): string {
  if (score <= 33) return Colors.riskLow;
  if (score <= 66) return Colors.riskMedium;
  return Colors.riskHigh;
}

export default function OverlayMapBriefing({
  selectedMap,
  onSelectMap,
  riskAssessment,
  threatSummary,
  loadoutFitScore,
  expanded,
  onToggle,
}: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onToggle} style={styles.header} activeOpacity={0.7}>
        <Text style={styles.headerText}>
          {expanded ? "\u25B4" : "\u25BE"} MAP BRIEFING
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {/* Map selector */}
          <View style={styles.mapRow}>
            {MAP_BUTTONS.map((m) => (
              <TouchableOpacity
                key={m.value}
                onPress={() => onSelectMap(m.value)}
                style={[
                  styles.mapBtn,
                  selectedMap === m.value && styles.mapBtnActive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.mapBtnText,
                    selectedMap === m.value && styles.mapBtnTextActive,
                  ]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Briefing data (when map selected) */}
          {selectedMap && riskAssessment && (
            <View style={styles.briefing}>
              {/* Risk score */}
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>RISK</Text>
                <Text
                  style={[
                    styles.statValue,
                    { color: riskColor(riskAssessment.score) },
                  ]}
                >
                  {riskAssessment.score}
                </Text>
              </View>

              {/* Threats */}
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>THREATS</Text>
                <Text style={styles.statDetail}>
                  {threatSummary.totalEnemies} enemies, {threatSummary.highThreatCount} high-threat
                </Text>
              </View>

              {threatSummary.dominantWeakness && (
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>WEAKNESS</Text>
                  <Text style={[styles.statDetail, { color: Colors.accent }]}>
                    {threatSummary.dominantWeakness}
                  </Text>
                </View>
              )}

              {/* Loadout fit */}
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>FIT</Text>
                <Text style={styles.statValue}>{loadoutFitScore}%</Text>
              </View>

              {/* Recommendation */}
              <Text style={styles.recommendation}>
                {riskAssessment.recommendation}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(10, 14, 18, 0.90)",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "rgba(42, 90, 106, 0.6)",
    paddingHorizontal: 10,
  },
  header: {
    paddingVertical: 4,
  },
  headerText: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.8)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  body: {
    paddingBottom: 6,
  },
  mapRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 6,
  },
  mapBtn: {
    flex: 1,
    backgroundColor: "rgba(42, 90, 106, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(42, 90, 106, 0.4)",
    borderRadius: 3,
    paddingVertical: 3,
    alignItems: "center",
  },
  mapBtnActive: {
    backgroundColor: "rgba(0, 180, 216, 0.2)",
    borderColor: Colors.accent,
  },
  mapBtnText: {
    fontSize: 8,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  mapBtnTextActive: {
    color: Colors.accent,
  },
  briefing: {
    gap: 3,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statLabel: {
    fontSize: 7,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.7)",
    letterSpacing: 0.8,
    width: 56,
  },
  statValue: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.accent,
    fontFamily: fonts.mono,
    fontVariant: ["tabular-nums"],
  },
  statDetail: {
    fontSize: 9,
    color: Colors.textSecondary,
  },
  recommendation: {
    fontSize: 8,
    color: Colors.textMuted,
    marginTop: 2,
    fontStyle: "italic",
  },
});
