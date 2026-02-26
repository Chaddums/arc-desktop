/**
 * OverlayQuestProgress — Completion VFX overlay for auto quest tracker.
 * Renders between HUD strip and checklist. CSS keyframe animations only.
 */

import React, { useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../theme";
import type { QuestCompletion } from "../hooks/useAutoQuestTracker";

interface Props {
  completionQueue: QuestCompletion[];
  onDismiss: (timestamp: number) => void;
  audioVolume: number;
}

// ─── SFX via Web Audio API ──────────────────────────────────────

let audioCtx: AudioContext | null = null;

function playCompletionSound(volume: number) {
  try {
    if (!audioCtx) audioCtx = new AudioContext();

    // Try to play the mp3 file first
    const audio = new Audio("/assets/sounds/quest-complete.mp3");
    audio.volume = volume;
    audio.play().catch(() => {
      // Fallback: synthesize a short chime
      synthesizeChime(volume);
    });
  } catch {
    // Web Audio not available — silent
  }
}

function synthesizeChime(volume: number) {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const ctx = audioCtx;
    const now = ctx.currentTime;

    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(volume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    // Two-tone chime
    for (const freq of [880, 1320]) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.8);
    }
  } catch {
    // Silent fallback
  }
}

// ─── Single completion card ─────────────────────────────────────

function CompletionCard({
  completion,
  onDismiss,
}: {
  completion: QuestCompletion;
  onDismiss: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-dismiss after animation completes (slide in 0.3s + hold 2s + fade 0.5s)
    const timer = setTimeout(onDismiss, 2800);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div ref={ref} style={cardAnimStyle}>
      <View style={styles.card}>
        <View style={styles.progressTrack}>
          <div style={progressBarStyle} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.checkmark}>&#x2713;</Text>
          <View style={styles.cardText}>
            <Text style={styles.questName} numberOfLines={1}>
              {completion.questName}
            </Text>
            <Text style={styles.completeLabel}>COMPLETE</Text>
          </View>
        </View>
      </View>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────

export default function OverlayQuestProgress({ completionQueue, onDismiss, audioVolume }: Props) {
  const playedSet = useRef<Set<number>>(new Set());

  // Play SFX when new completions arrive
  useEffect(() => {
    for (const c of completionQueue) {
      if (!playedSet.current.has(c.timestamp)) {
        playedSet.current.add(c.timestamp);
        playCompletionSound(audioVolume);
      }
    }
  }, [completionQueue, audioVolume]);

  const handleDismiss = useCallback(
    (timestamp: number) => {
      playedSet.current.delete(timestamp);
      onDismiss(timestamp);
    },
    [onDismiss]
  );

  if (completionQueue.length === 0) return null;

  return (
    <View style={styles.container}>
      {completionQueue.map((c) => (
        <CompletionCard
          key={c.timestamp}
          completion={c}
          onDismiss={() => handleDismiss(c.timestamp)}
        />
      ))}
    </View>
  );
}

// ─── Inline CSS animation styles (web only) ─────────────────────

const cardAnimStyle: React.CSSProperties = {
  animation: "questSlideIn 0.3s ease-out, questFadeOut 0.5s ease-in 2.3s forwards",
};

const progressBarStyle: React.CSSProperties = {
  height: "100%",
  background: "linear-gradient(90deg, #00b4d8, #0077b6)",
  borderRadius: 2,
  animation: "questProgressFill 0.6s ease-out 0.3s both",
  boxShadow: "0 0 8px rgba(0, 180, 216, 0.6)",
};

// Inject keyframes once
if (typeof document !== "undefined") {
  const styleId = "overlay-quest-progress-keyframes";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes questSlideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes questFadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      @keyframes questProgressFill {
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
    gap: 4,
    marginTop: 4,
    maxWidth: 420,
  },
  card: {
    backgroundColor: "rgba(10, 14, 18, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(0, 180, 216, 0.5)",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressTrack: {
    height: 3,
    backgroundColor: "rgba(0, 180, 216, 0.15)",
    borderRadius: 2,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.green,
    marginRight: 8,
  },
  cardText: {
    flex: 1,
  },
  questName: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
  },
  completeLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.accent,
    letterSpacing: 1,
    marginTop: 1,
  },
});
