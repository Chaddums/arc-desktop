/**
 * OverlayObjectiveFeed — Live objective event feed shown in the bottom-right
 * overlay area. Displays completion, progress, and new objective notifications
 * as animated toast cards.
 */

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../theme";
import type { ObjectiveEvent } from "../hooks/useObjectiveTracker";

interface Props {
  recentEvents: ObjectiveEvent[];
  completionCount: number;
}

// ─── Event type config ──────────────────────────────────────────

const EVENT_CONFIG: Record<
  string,
  { icon: string; label: string; accent: string; border: string }
> = {
  complete: {
    icon: "\u2713",
    label: "COMPLETE",
    accent: "rgba(0, 180, 216, 0.9)",
    border: "rgba(0, 180, 216, 0.5)",
  },
  progress: {
    icon: "\u25B8",
    label: "PROGRESS",
    accent: "rgba(241, 196, 15, 0.9)",
    border: "rgba(241, 196, 15, 0.4)",
  },
  new: {
    icon: "\u25C6",
    label: "NEW OBJECTIVE",
    accent: "rgba(46, 204, 113, 0.9)",
    border: "rgba(46, 204, 113, 0.4)",
  },
  update: {
    icon: "\u21BB",
    label: "UPDATED",
    accent: "rgba(107, 132, 152, 0.9)",
    border: "rgba(107, 132, 152, 0.5)",
  },
};

// ─── Single event toast card ─────────────────────────────────────

const AUTO_DISMISS_MS = 4000;

function EventCard({ event }: { event: ObjectiveEvent }) {
  const [visible, setVisible] = useState(true);
  const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.update;

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div style={cardAnimStyle}>
      <View
        style={[styles.card, { borderColor: config.border } as any]}
      >
        {/* Top accent bar for completions */}
        {event.type === "complete" && (
          <View style={styles.accentBar}>
            <div style={accentBarFillStyle} />
          </View>
        )}
        <View style={styles.cardContent}>
          <Text style={[styles.icon, { color: config.accent } as any]}>
            {config.icon}
          </Text>
          <View style={styles.cardText}>
            <Text style={[styles.label, { color: config.accent } as any]}>
              {config.label}
            </Text>
            <Text style={styles.eventText} numberOfLines={2}>
              {event.text}
            </Text>
            {event.progress && (
              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, (event.progress.current / event.progress.total) * 100)}%`,
                      } as any,
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {event.progress.current}/{event.progress.total}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────

export default function OverlayObjectiveFeed({
  recentEvents,
  completionCount,
}: Props) {
  // Only show last 4 as toasts
  const visibleEvents = recentEvents.slice(0, 4);

  if (visibleEvents.length === 0 && completionCount === 0) return null;

  return (
    <View style={styles.container}>
      {visibleEvents.map((e) => (
        <EventCard key={`${e.timestamp}-${e.type}`} event={e} />
      ))}
      {completionCount > 0 && visibleEvents.length === 0 && (
        <View style={styles.sessionBadge}>
          <Text style={styles.sessionBadgeText}>
            {completionCount} objective{completionCount !== 1 ? "s" : ""}{" "}
            completed
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Inline CSS animation styles ─────────────────────────────────

const cardAnimStyle: React.CSSProperties = {
  animation:
    "objFeedSlideIn 0.3s ease-out, objFeedFadeOut 0.4s ease-in 3.6s forwards",
};

const accentBarFillStyle: React.CSSProperties = {
  height: "100%",
  background: "linear-gradient(90deg, #00b4d8, #0077b6)",
  borderRadius: 2,
  animation: "objProgressFill 0.5s ease-out 0.3s both",
};

if (typeof document !== "undefined") {
  const styleId = "overlay-objective-feed-keyframes";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes objFeedSlideIn {
        from { transform: translateX(60px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes objFeedFadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      @keyframes objProgressFill {
        from { width: 0%; }
        to { width: 100%; }
      }
    `;
    document.head.appendChild(style);
  }
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: 3,
    marginTop: 4,
    maxWidth: 300,
  },
  card: {
    backgroundColor: "rgba(10, 14, 18, 0.9)",
    borderWidth: 1,
    borderRadius: 6,
    overflow: "hidden",
  },
  accentBar: {
    height: 3,
    backgroundColor: "rgba(0, 180, 216, 0.15)",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  icon: {
    fontSize: 14,
    fontWeight: "700",
    marginRight: 8,
    marginTop: 1,
  },
  cardText: {
    flex: 1,
  },
  label: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  eventText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#c8d6e0",
    lineHeight: 15,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(241, 196, 15, 0.15)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "rgba(241, 196, 15, 0.7)",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(241, 196, 15, 0.8)",
    fontFamily: "monospace",
  },
  sessionBadge: {
    backgroundColor: "rgba(10, 14, 18, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(42, 90, 106, 0.3)",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-end",
  },
  sessionBadgeText: {
    fontSize: 9,
    color: "rgba(107, 132, 152, 0.6)",
    fontFamily: "monospace",
  },
});
