/**
 * ReportModal — Flyout modal for Bug Report, Feedback, and Feature Request.
 * Matches LAMA Desktop pattern: title + description fields, sent via Discord webhook.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Colors } from "../theme";

export type ReportType = "bug" | "feedback" | "feature";

interface ReportModalProps {
  visible: boolean;
  type: ReportType;
  onClose: () => void;
  webhookUrl?: string;
}

const CONFIG: Record<ReportType, { title: string; titlePlaceholder: string; bodyLabel: string; bodyPlaceholder: string; hint: string; submitLabel: string }> = {
  bug: {
    title: "Bug Report",
    titlePlaceholder: "Brief summary...",
    bodyLabel: "What happened?",
    bodyPlaceholder: "Describe the issue...",
    hint: "Logs + system info attached automatically. Sent to Discord.",
    submitLabel: "Send Report",
  },
  feedback: {
    title: "Feedback",
    titlePlaceholder: "Topic...",
    bodyLabel: "Your thoughts",
    bodyPlaceholder: "What's on your mind...",
    hint: "Sent to our Discord. We read everything.",
    submitLabel: "Send Feedback",
  },
  feature: {
    title: "Feature Request",
    titlePlaceholder: "Feature name...",
    bodyLabel: "What would this do?",
    bodyPlaceholder: "Describe the feature you'd like to see...",
    hint: "Sent to our Discord. We read everything.",
    submitLabel: "Submit",
  },
};

function getSystemInfo(): string {
  const lines: string[] = [];
  lines.push(`Platform: ${navigator.platform}`);
  lines.push(`UserAgent: ${navigator.userAgent}`);
  lines.push(`Screen: ${screen.width}x${screen.height}`);
  lines.push(`Window: ${window.innerWidth}x${window.innerHeight}`);
  lines.push(`Time: ${new Date().toISOString()}`);
  return lines.join("\n");
}

export default function ReportModal({ visible, type, onClose, webhookUrl }: ReportModalProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const config = CONFIG[type];

  const handleClose = useCallback(() => {
    setTitle("");
    setBody("");
    setStatus(null);
    setSending(false);
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return;
    setSending(true);
    setStatus(null);

    const payload = {
      embeds: [{
        title: `[${config.title}] ${title}`,
        description: body || "(No description)",
        color: type === "bug" ? 0xe74c3c : type === "feature" ? 0x3498db : 0x2ecc71,
        fields: [
          { name: "System Info", value: `\`\`\`\n${getSystemInfo()}\n\`\`\``, inline: false },
        ],
        timestamp: new Date().toISOString(),
      }],
    };

    if (webhookUrl) {
      try {
        const resp = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (resp.ok) {
          setStatus("Sent! Thank you.");
          setTimeout(handleClose, 1500);
        } else {
          setStatus("Failed to send — copied to clipboard instead.");
          copyFallback(title, body, type);
        }
      } catch {
        setStatus("Failed to send — copied to clipboard instead.");
        copyFallback(title, body, type);
      }
    } else {
      // No webhook configured — copy to clipboard
      copyFallback(title, body, type);
      setStatus("Copied to clipboard! Send to our Discord.");
      setTimeout(handleClose, 2000);
    }

    setSending(false);
  }, [title, body, type, config.title, webhookUrl, handleClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>{config.title}</Text>

          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder={config.titlePlaceholder}
            placeholderTextColor="rgba(107, 132, 152, 0.5)"
            autoFocus
          />

          <Text style={styles.fieldLabel}>{config.bodyLabel}</Text>
          <TextInput
            style={styles.bodyInput}
            value={body}
            onChangeText={setBody}
            placeholder={config.bodyPlaceholder}
            placeholderTextColor="rgba(107, 132, 152, 0.5)"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <Text style={styles.hint}>{config.hint}</Text>

          {status && <Text style={styles.statusText}>{status}</Text>}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, !title.trim() && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={sending || !title.trim()}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitText}>{config.submitLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function copyFallback(title: string, body: string, type: ReportType) {
  const text = `[${type.toUpperCase()}] ${title}\n\n${body}\n\n--- System ---\n${getSystemInfo()}`;
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  dialog: {
    width: 460,
    maxWidth: "90%",
    backgroundColor: "#1a1e24",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(42, 90, 106, 0.6)",
    padding: 24,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.accent,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  titleInput: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderWidth: 1,
    borderColor: "rgba(42, 90, 106, 0.4)",
    borderRadius: 4,
    padding: 10,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 12,
  },
  bodyInput: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderWidth: 1,
    borderColor: "rgba(42, 90, 106, 0.4)",
    borderRadius: 4,
    padding: 10,
    fontSize: 14,
    color: Colors.text,
    minHeight: 120,
    marginBottom: 8,
  },
  hint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.green,
    marginBottom: 8,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(42, 90, 106, 0.4)",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    minWidth: 100,
    alignItems: "center",
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
