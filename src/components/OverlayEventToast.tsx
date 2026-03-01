/**
 * OverlayEventToast — In-game styled event notifications.
 * Batches simultaneous events into a single toast. Auto-dismisses.
 */

import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../theme";
import type { EventAlert } from "../hooks/useEventTimer";

interface Props {
  alerts: EventAlert[];
  onDismiss: (id: string) => void;
}

const AUTO_DISMISS_MS = 6000;

export default function OverlayEventToast({ alerts, onDismiss }: Props) {
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    for (const alert of alerts) {
      if (timersRef.current.has(alert.id)) continue;
      const timer = setTimeout(() => {
        onDismiss(alert.id);
        timersRef.current.delete(alert.id);
      }, AUTO_DISMISS_MS);
      timersRef.current.set(alert.id, timer);
    }
    return () => {
      for (const timer of timersRef.current.values()) clearTimeout(timer);
    };
  }, [alerts, onDismiss]);

  if (alerts.length === 0) return null;

  return (
    <div style={containerStyle}>
      {alerts.map((alert) => (
        <div
          key={alert.id}
          style={toastWrapStyle}
          onClick={() => onDismiss(alert.id)}
        >
          <View
            style={[
              styles.toast,
              alert.type === "started" ? styles.toastStarted : styles.toastEnded,
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerIcon}>
                {alert.type === "started" ? "\u25B6" : "\u25A0"}
              </Text>
              <Text
                style={[
                  styles.headerText,
                  alert.type === "started" ? styles.headerStarted : styles.headerEnded,
                ]}
              >
                {alert.events.length === 1
                  ? `EVENT ${alert.type === "started" ? "STARTED" : "ENDED"}`
                  : `${alert.events.length} EVENTS ${alert.type === "started" ? "STARTED" : "ENDED"}`}
              </Text>
            </View>

            {/* Event list */}
            {alert.events.map((event, i) => (
              <View key={i} style={styles.eventRow}>
                <Text style={styles.eventName} numberOfLines={1}>
                  {event.name}
                </Text>
                <Text style={styles.eventMap}>{event.map}</Text>
              </View>
            ))}
          </View>
        </div>
      ))}
    </div>
  );
}

// ─── Web-only styles ────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  position: "absolute",
  top: 60,
  right: 8,
  display: "flex",
  flexDirection: "column",
  gap: 6,
  zIndex: 100,
  pointerEvents: "auto",
};

const toastWrapStyle: React.CSSProperties = {
  cursor: "pointer",
  animation: "eventToastIn 0.3s ease-out",
};

// Inject toast keyframes
if (typeof document !== "undefined") {
  const styleId = "overlay-event-toast-keyframes";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes eventToastIn {
        from { opacity: 0; transform: translateX(40px); }
        to   { opacity: 1; transform: translateX(0); }
      }
    `;
    document.head.appendChild(style);
  }
}

const styles = StyleSheet.create({
  toast: {
    backgroundColor: "rgba(10, 14, 18, 0.92)",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 200,
    maxWidth: 280,
  },
  toastStarted: {
    borderColor: "rgba(0, 180, 216, 0.7)",
  },
  toastEnded: {
    borderColor: "rgba(107, 132, 152, 0.5)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  headerIcon: {
    fontSize: 10,
    color: Colors.accent,
  },
  headerText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  headerStarted: {
    color: Colors.accent,
  },
  headerEnded: {
    color: "rgba(107, 132, 152, 0.8)",
  },
  eventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  eventName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#c8d6e0",
    flex: 1,
  },
  eventMap: {
    fontSize: 10,
    color: "rgba(107, 132, 152, 0.8)",
    marginLeft: 8,
  },
});
