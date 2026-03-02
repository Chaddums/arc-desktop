/**
 * OverlaySkillTreeContext — Context panel shown when skill tree menu detected.
 * Shows recommended skills with attribute-based scores and branch labels,
 * plus wasted perks section with severity-colored warnings.
 * Tier 2 context-aware panel.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { SkillRecommendation, DeadPerkWarning } from "../hooks/useBuildAdvisor";
import type { BuildClass } from "../hooks/useMyLoadout";
import { Colors, fonts } from "../theme";

interface Props {
  buildClass: BuildClass;
  recommendations: SkillRecommendation[];
  deadPerks: DeadPerkWarning[];
  headerColor?: string;
  borderColor?: string;
}

export default function OverlaySkillTreeContext({
  buildClass,
  recommendations,
  deadPerks,
  headerColor,
  borderColor,
}: Props) {
  if (recommendations.length === 0 && deadPerks.length === 0) return null;

  const buildColor = BUILD_CLASS_COLORS[buildClass] ?? Colors.textMuted;

  return (
    <View style={[styles.container, borderColor ? { borderColor } : undefined]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.contextDot} />
        <Text style={[styles.headerText, headerColor ? { color: headerColor } : undefined]}>
          SKILL TREE ADVISOR
        </Text>
        <View style={styles.headerSpacer} />
        <Text style={[styles.buildBadge, { color: buildColor }]}>
          {buildClass}
        </Text>
      </View>

      {/* Recommended skills */}
      {recommendations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>RECOMMENDED</Text>
          {recommendations.slice(0, 6).map((rec) => (
            <View key={rec.nodeId} style={styles.skillRow}>
              <Text style={styles.skillArrow}>{"\u25B8"}</Text>
              <Text style={styles.skillName} numberOfLines={1}>
                {rec.nodeName}
              </Text>
              <Text style={styles.skillScore}>
                +{Math.round(rec.score)}pt
              </Text>
              <Text style={[styles.branchTag, { color: BRANCH_COLORS[rec.branch] ?? Colors.textMuted }]}>
                {rec.branch}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Wasted perks */}
      {deadPerks.length > 0 && (
        <View style={styles.wastedSection}>
          <Text style={styles.sectionLabel}>WASTED PERKS</Text>
          {deadPerks.map((perk) => (
            <View key={perk.nodeId} style={styles.wastedRow}>
              <View style={styles.wastedHeader}>
                <Text style={styles.skillArrow}>{"\u25B8"}</Text>
                <Text style={styles.skillName} numberOfLines={1}>
                  {perk.nodeName}
                </Text>
                <Text style={styles.wastedPoints}>
                  ({perk.allocatedPoints}pt)
                </Text>
                <View
                  style={[
                    styles.severityDot,
                    { backgroundColor: perk.severity === "wasted" ? Colors.red : Colors.amber },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.wastedReason,
                  { color: perk.severity === "wasted" ? Colors.red : Colors.amber },
                ]}
                numberOfLines={1}
              >
                {perk.reason}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const BUILD_CLASS_COLORS: Record<string, string> = {
  DPS: Colors.red,
  Tank: Colors.accent,
  Support: Colors.green,
  Hybrid: Colors.amber,
};

const BRANCH_COLORS: Record<string, string> = {
  COND: Colors.amber,
  MOB: Colors.accent,
  SURV: Colors.green,
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(10, 14, 18, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(42, 90, 106, 0.6)",
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  contextDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.amber,
  },
  headerText: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.8)",
    letterSpacing: 1.2,
  },
  headerSpacer: {
    flex: 1,
  },
  buildBadge: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 2,
  },
  sectionLabel: {
    fontSize: 7,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.6)",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  skillRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 18,
    gap: 4,
  },
  skillArrow: {
    fontSize: 7,
    color: Colors.accent,
  },
  skillName: {
    flex: 1,
    fontSize: 9,
    fontWeight: "600",
    color: Colors.text,
  },
  skillScore: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.accent,
    fontFamily: fonts.mono,
    fontVariant: ["tabular-nums"],
    minWidth: 32,
    textAlign: "right",
  },
  branchTag: {
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.5,
    minWidth: 28,
    textAlign: "right",
  },
  wastedSection: {
    borderTopWidth: 1,
    borderTopColor: "rgba(42, 90, 106, 0.3)",
    paddingTop: 4,
    marginTop: 2,
  },
  wastedRow: {
    marginBottom: 3,
  },
  wastedHeader: {
    flexDirection: "row",
    alignItems: "center",
    height: 16,
    gap: 4,
  },
  wastedPoints: {
    fontSize: 8,
    fontWeight: "600",
    color: Colors.textMuted,
    fontFamily: fonts.mono,
  },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  wastedReason: {
    fontSize: 8,
    fontStyle: "italic",
    marginLeft: 14,
  },
});
