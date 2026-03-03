/**
 * OverlayMapInspectorContext — Context panel shown when in-game map is open.
 * Shows filtered POI info — only items the player is actively hunting.
 * Tier 2 context-aware panel.
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { RaidTheoryQuest } from "../types";
import { Colors, fonts } from "../theme";
import { loc } from "../utils/loc";

interface Props {
  quests: RaidTheoryQuest[];
  completedIds: Set<string>;
  currentMap: string | null;
  headerColor?: string;
  borderColor?: string;
}

interface MapObjective {
  questName: string;
  objective: string;
  trader: string;
}

export default function OverlayMapInspectorContext({
  quests,
  completedIds,
  currentMap,
  headerColor,
  borderColor,
}: Props) {
  const objectives = useMemo<MapObjective[]>(() => {
    const results: MapObjective[] = [];
    for (const quest of quests) {
      if (completedIds.has(quest.id)) continue;
      if (!quest.objectives || quest.objectives.length === 0) continue;

      for (const obj of quest.objectives) {
        const objText = loc(obj);
        if (!objText) continue;

        // Show objectives that reference collection/finding (actionable on map)
        const isMapRelevant = /find|locate|go to|reach|extract|collect|gather|mark|discover/i.test(objText);
        if (isMapRelevant) {
          results.push({
            questName: loc(quest.name) || quest.id,
            objective: objText,
            trader: quest.trader || "",
          });
        }
      }
    }
    return results.slice(0, 6);
  }, [quests, completedIds]);

  if (objectives.length === 0) return null;

  return (
    <View style={[styles.container, borderColor ? { borderColor } : undefined]}>
      <View style={styles.header}>
        <View style={styles.contextDot} />
        <Text style={[styles.headerText, headerColor ? { color: headerColor } : undefined]}>
          MAP OBJECTIVES{currentMap ? ` \u2022 ${currentMap.toUpperCase()}` : ""}
        </Text>
      </View>

      {objectives.map((obj, i) => (
        <View key={i} style={styles.objectiveRow}>
          <View style={styles.objectiveMarker} />
          <View style={styles.objectiveInfo}>
            <Text style={styles.objectiveText} numberOfLines={1}>
              {obj.objective}
            </Text>
            <Text style={styles.questRef} numberOfLines={1}>
              {obj.questName}
              {obj.trader ? ` \u2022 ${obj.trader}` : ""}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

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
    backgroundColor: Colors.red,
  },
  headerText: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.8)",
    letterSpacing: 1.2,
  },
  objectiveRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 28,
    gap: 6,
    marginBottom: 2,
  },
  objectiveMarker: {
    width: 8,
    height: 8,
    borderRadius: 1,
    backgroundColor: Colors.red,
    marginTop: 2,
    transform: [{ rotate: "45deg" }],
  },
  objectiveInfo: {
    flex: 1,
  },
  objectiveText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.text,
  },
  questRef: {
    fontSize: 8,
    color: Colors.textMuted,
    marginTop: 1,
  },
});
