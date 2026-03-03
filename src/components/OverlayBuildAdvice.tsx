/**
 * OverlayBuildAdvice — Compact skill/item recommendation summary.
 * Shows top 3-4 actionable recommendations based on current loadout and playstyle.
 * Tier 1 HUD panel.
 */

import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { BuildAdvice } from "../hooks/useBuildAdvisor";
import { Colors, fonts } from "../theme";

interface Props {
  advice: BuildAdvice | null;
  expanded: boolean;
  onToggle: () => void;
  headerColor?: string;
  borderColor?: string;
}

const GOAL_COLORS: Record<string, string> = {
  Aggressive: Colors.red,
  Balanced: Colors.accent,
  Survival: Colors.green,
  Farming: Colors.amber,
};

export default function OverlayBuildAdvice({ advice, expanded, onToggle, headerColor, borderColor }: Props) {
  // Flatten top item recommendations (max 3 across categories)
  const topItems = useMemo(() => {
    if (!advice) return [];
    const items: { name: string; score: number; reasoning: string; category: string }[] = [];
    for (const [category, recs] of advice.itemRecommendations) {
      for (const rec of recs.slice(0, 1)) {
        items.push({
          name: rec.itemName,
          score: rec.score,
          reasoning: rec.reasoning,
          category,
        });
      }
    }
    return items.sort((a, b) => b.score - a.score).slice(0, 3);
  }, [advice]);

  const goalColor = advice ? (GOAL_COLORS[advice.goal] ?? Colors.accent) : Colors.textMuted;

  return (
    <View style={[styles.container, borderColor ? { borderColor } : undefined]}>
      <TouchableOpacity onPress={onToggle} style={styles.header} activeOpacity={0.7}>
        <Text style={[styles.headerText, headerColor ? { color: headerColor } : undefined]}>
          {expanded ? "\u25B4" : "\u25BE"} BUILD ADVICE
        </Text>
        {advice && (
          <View style={[styles.goalBadge, { borderColor: goalColor }]}>
            <Text style={[styles.goalText, { color: goalColor }]}>{advice.goal}</Text>
          </View>
        )}
      </TouchableOpacity>

      {expanded && advice && (
        <View style={styles.body}>
          {/* Summary line */}
          <Text style={styles.summary} numberOfLines={2}>
            {advice.summary}
          </Text>

          {/* Top item picks */}
          {topItems.map((item, i) => (
            <View key={i} style={styles.recRow}>
              <Text style={styles.recIcon}>{"\u25B8"}</Text>
              <Text style={styles.recName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.recScore}>{item.score}</Text>
            </View>
          ))}

          {/* Skill recommendations */}
          {advice.skillRecommendations.slice(0, 2).map((skill) => (
            <View key={skill.nodeId} style={styles.recRow}>
              <Text style={styles.skillIcon}>{"\u2B50"}</Text>
              <Text style={styles.recName} numberOfLines={1}>
                {skill.nodeName}
              </Text>
              <Text style={styles.skillPoints}>+{skill.points}pt</Text>
            </View>
          ))}
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
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    gap: 6,
  },
  headerText: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.8)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  goalBadge: {
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  goalText: {
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  body: {
    paddingBottom: 6,
  },
  summary: {
    fontSize: 9,
    color: Colors.textMuted,
    marginBottom: 4,
    lineHeight: 13,
  },
  recRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 20,
    gap: 4,
  },
  recIcon: {
    fontSize: 8,
    color: Colors.accent,
    width: 10,
  },
  skillIcon: {
    fontSize: 7,
    width: 10,
    textAlign: "center",
  },
  recName: {
    flex: 1,
    fontSize: 10,
    fontWeight: "500",
    color: Colors.text,
  },
  recScore: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.accent,
    fontFamily: fonts.mono,
    fontVariant: ["tabular-nums"],
    width: 28,
    textAlign: "right",
  },
  skillPoints: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.amber,
    fontFamily: fonts.mono,
    width: 28,
    textAlign: "right",
  },
});
