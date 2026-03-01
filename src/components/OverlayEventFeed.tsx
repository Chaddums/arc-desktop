/**
 * OverlayEventFeed — Active + upcoming events with map names + countdowns.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { GameEvent } from "../types";
import { formatCountdown } from "../utils/format";
import { Colors, fonts } from "../theme";

interface Props {
  activeEvents: GameEvent[];
  upcomingEvents: GameEvent[];
  now: number;
  expanded: boolean;
  onToggle: () => void;
}

export default function OverlayEventFeed({
  activeEvents,
  upcomingEvents,
  now,
  expanded,
  onToggle,
}: Props) {
  const totalCount = activeEvents.length + upcomingEvents.length;
  if (totalCount === 0) return null;

  const upcoming = upcomingEvents.slice(0, 3);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onToggle} style={styles.header} activeOpacity={0.7}>
        <Text style={styles.headerText}>
          {expanded ? "\u25B4" : "\u25BE"} EVENTS ({totalCount})
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {activeEvents.map((evt, i) => {
            const remaining = evt.endTime - now;
            return (
              <View key={`active-${i}`} style={styles.row}>
                <View style={[styles.dot, styles.dotActive]} />
                <Text style={styles.eventName} numberOfLines={1}>
                  {evt.name}
                </Text>
                <Text style={styles.eventMap}>{evt.map}</Text>
                <Text style={styles.countdown}>
                  {remaining > 0 ? formatCountdown(remaining) : "ENDING"}
                </Text>
              </View>
            );
          })}

          {upcoming.map((evt, i) => {
            const startsIn = evt.startTime - now;
            return (
              <View key={`upcoming-${i}`} style={styles.row}>
                <View style={[styles.dot, styles.dotUpcoming]} />
                <Text style={[styles.eventName, styles.dimmed]} numberOfLines={1}>
                  {evt.name}
                </Text>
                <Text style={[styles.eventMap, styles.dimmed]}>{evt.map}</Text>
                <Text style={[styles.countdown, styles.dimmed]}>
                  {startsIn > 0 ? formatCountdown(startsIn) : "SOON"}
                </Text>
              </View>
            );
          })}
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
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 22,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: Colors.green,
  },
  dotUpcoming: {
    backgroundColor: Colors.textMuted,
  },
  eventName: {
    flex: 1,
    fontSize: 10,
    fontWeight: "600",
    color: Colors.text,
  },
  eventMap: {
    fontSize: 9,
    color: Colors.textSecondary,
    width: 50,
  },
  countdown: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.accent,
    fontFamily: fonts.mono,
    fontVariant: ["tabular-nums"],
    width: 52,
    textAlign: "right",
  },
  dimmed: {
    opacity: 0.6,
  },
});
