/**
 * StatusBar — Footer bar with Bug Report, Feedback, Feature Request,
 * Restart App, email, and branding. Matches LAMA Desktop pattern.
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { Colors } from "../theme";
import ReportModal, { ReportType } from "./ReportModal";

const DISCORD_WEBHOOK_URL = ""; // Configure when Discord webhook is set up

export default function StatusBar() {
  const [modalType, setModalType] = useState<ReportType | null>(null);

  const handleRestart = () => {
    if (window.arcDesktop?.restartApp) {
      window.arcDesktop.restartApp();
    } else {
      // Web fallback: reload
      window.location.reload();
    }
  };

  return (
    <>
      <View style={styles.bar}>
        <View style={styles.left}>
          <TouchableOpacity onPress={() => setModalType("bug")} hitSlop={{ top: 4, bottom: 4 }}>
            <Text style={styles.link}>Bug Report</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModalType("feedback")} hitSlop={{ top: 4, bottom: 4 }}>
            <Text style={styles.link}>Feedback</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModalType("feature")} hitSlop={{ top: 4, bottom: 4 }}>
            <Text style={styles.link}>Feature Request</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRestart} hitSlop={{ top: 4, bottom: 4 }}>
            <Text style={styles.link}>Restart App</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.right}>
          <TouchableOpacity
            onPress={() => Linking.openURL("mailto:hello@couloir.gg")}
            hitSlop={{ top: 4, bottom: 4 }}
          >
            <Text style={styles.email}>hello@couloir.gg</Text>
          </TouchableOpacity>
          <Text style={styles.brand}>COULOIR</Text>
        </View>
      </View>

      <ReportModal
        visible={modalType !== null}
        type={modalType ?? "bug"}
        onClose={() => setModalType(null)}
        webhookUrl={DISCORD_WEBHOOK_URL || undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(42, 90, 106, 0.3)",
    backgroundColor: "rgba(10, 14, 18, 0.95)",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  link: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textMuted,
  },
  email: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  brand: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 2,
  },
});
