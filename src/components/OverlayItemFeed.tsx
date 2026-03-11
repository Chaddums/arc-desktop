/**
 * OverlayItemFeed — Live item pickup feed shown in the bottom-right overlay area.
 * Displays recent pickups as animated toast cards that auto-dismiss, plus a
 * persistent session summary strip when items have been collected.
 */

import React, { useEffect, useRef, useCallback, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../theme";
import type { ItemPickup } from "../hooks/useItemPickupTracker";

interface Props {
  recentPickups: ItemPickup[];
  sessionTotal: number;
  sessionItems: Map<string, number>;
}

// ─── Single pickup toast card ────────────────────────────────────

const AUTO_DISMISS_MS = 3500;

function PickupCard({ pickup }: { pickup: ItemPickup }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div style={cardAnimStyle}>
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text style={styles.plusIcon}>+</Text>
          <Text style={styles.quantity}>
            {pickup.quantity > 1 ? `${pickup.quantity}x ` : ""}
          </Text>
          <Text style={styles.itemName} numberOfLines={1}>
            {pickup.itemName}
          </Text>
        </View>
      </View>
    </div>
  );
}

// ─── Session summary strip ──────────────────────────────────────

function SessionSummary({
  sessionTotal,
  sessionItems,
}: {
  sessionTotal: number;
  sessionItems: Map<string, number>;
}) {
  if (sessionTotal === 0) return null;

  const uniqueCount = sessionItems.size;
  // Show top 3 items by quantity
  const topItems = [...sessionItems.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <View style={styles.summaryStrip}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryLabel}>SESSION LOOT</Text>
        <Text style={styles.summaryCount}>
          {sessionTotal} item{sessionTotal !== 1 ? "s" : ""} ({uniqueCount}{" "}
          unique)
        </Text>
      </View>
      {topItems.map(([name, qty]) => (
        <View key={name} style={styles.summaryRow}>
          <Text style={styles.summaryItemName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.summaryItemQty}>x{qty}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Main component ─────────────────────────────────────────────

export default function OverlayItemFeed({
  recentPickups,
  sessionTotal,
  sessionItems,
}: Props) {
  // Only show the last 5 recent pickups as toasts (they auto-dismiss)
  const visiblePickups = recentPickups.slice(0, 5);

  return (
    <View style={styles.container}>
      {/* Live pickup toasts */}
      {visiblePickups.map((p) => (
        <PickupCard key={`${p.timestamp}-${p.itemName}`} pickup={p} />
      ))}

      {/* Session summary (always visible when items collected) */}
      <SessionSummary
        sessionTotal={sessionTotal}
        sessionItems={sessionItems}
      />
    </View>
  );
}

// ─── Inline CSS animation styles ─────────────────────────────────

const cardAnimStyle: React.CSSProperties = {
  animation:
    "itemFeedSlideIn 0.25s ease-out, itemFeedFadeOut 0.4s ease-in 3.1s forwards",
};

if (typeof document !== "undefined") {
  const styleId = "overlay-item-feed-keyframes";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes itemFeedSlideIn {
        from { transform: translateX(60px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes itemFeedFadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
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
    maxWidth: 280,
  },

  // ─── Pickup card ──────────────────────────────────────
  card: {
    backgroundColor: "rgba(10, 14, 18, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(46, 204, 113, 0.45)",
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  plusIcon: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(46, 204, 113, 0.9)",
    marginRight: 4,
    fontFamily: "monospace",
  },
  quantity: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(46, 204, 113, 0.8)",
    fontFamily: "monospace",
  },
  itemName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#c8d6e0",
    flex: 1,
  },

  // ─── Session summary ──────────────────────────────────
  summaryStrip: {
    backgroundColor: "rgba(10, 14, 18, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(42, 90, 106, 0.35)",
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 2,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  summaryLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(107, 132, 152, 0.7)",
    letterSpacing: 1.2,
  },
  summaryCount: {
    fontSize: 9,
    color: "rgba(107, 132, 152, 0.6)",
    fontFamily: "monospace",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 1,
  },
  summaryItemName: {
    fontSize: 10,
    color: "rgba(200, 214, 224, 0.8)",
    flex: 1,
  },
  summaryItemQty: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(46, 204, 113, 0.7)",
    fontFamily: "monospace",
    marginLeft: 8,
  },
});
