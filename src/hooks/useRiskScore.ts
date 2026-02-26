/**
 * useRiskScore — Pre-raid risk assessment.
 * Factors: map threat level, enemy weaknesses, event modifiers, historical success rate.
 */

import { useState, useCallback } from "react";
import type { RiskAssessment, RaidEntry, Bot, GameEvent } from "../types";

interface RiskScoreInput {
  mapId: string | null;
  loadout: string[];
  raidHistory: RaidEntry[];
  bots: Bot[];
  activeEvents: GameEvent[];
}

const MAP_BASE_THREAT: Record<string, number> = {
  dam: 30,
  spaceport: 50,
  buried_city: 65,
  blue_gate: 45,
  stella_montis: 70,
};

export function useRiskScore() {
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [selectedLoadout, setSelectedLoadout] = useState<string[]>([]);

  const calculate = useCallback(
    (input: RiskScoreInput) => {
      const { mapId, loadout, raidHistory, bots, activeEvents } = input;
      const factors: { label: string; impact: number; detail: string }[] = [];

      // Base map threat
      const mapKey = (mapId ?? "").toLowerCase().replace(/\s+/g, "_");
      const baseThreat = MAP_BASE_THREAT[mapKey] ?? 40;
      factors.push({
        label: "Map Threat Level",
        impact: baseThreat,
        detail: `${mapId ?? "Unknown"} base difficulty`,
      });

      // Enemy density on map
      const mapBots = bots.filter((b) => b.maps.includes(mapKey));
      const highThreatBots = mapBots.filter(
        (b) => b.threat === "High" || b.threat === "Critical" || b.threat === "Extreme"
      );
      if (highThreatBots.length > 0) {
        const density = Math.min(15, highThreatBots.length * 5);
        factors.push({
          label: "Enemy Density",
          impact: density,
          detail: `${highThreatBots.length} high-threat enemies`,
        });
      }

      // Active events modifier
      const mapEvents = mapId
        ? activeEvents.filter((e) => e.map.toLowerCase().replace(/\s+/g, "_") === mapKey)
        : [];
      if (mapEvents.length > 0) {
        factors.push({
          label: "Active Events",
          impact: -10,
          detail: `${mapEvents.length} events may help or hinder`,
        });
      }

      // Historical success rate
      const mapHistory = mapId
        ? raidHistory.filter((r) => r.mapId.toLowerCase().replace(/\s+/g, "_") === mapKey)
        : raidHistory;
      if (mapHistory.length >= 3) {
        const successRate = mapHistory.filter((r) => r.outcome === "extracted").length / mapHistory.length;
        const historyImpact = Math.round((0.5 - successRate) * 30);
        factors.push({
          label: "Your History",
          impact: historyImpact,
          detail: `${Math.round(successRate * 100)}% extraction rate (${mapHistory.length} raids)`,
        });
      }

      // Calculate final score
      const rawScore = factors.reduce((sum, f) => sum + f.impact, 0);
      const score = Math.max(1, Math.min(100, rawScore));

      // Recommendation
      let recommendation: string;
      if (score <= 33) {
        recommendation = "Low risk. Good conditions for this raid.";
      } else if (score <= 66) {
        recommendation = "Moderate risk. Stay alert and have an exit plan.";
      } else {
        recommendation = "High risk. Consider better gear or a different map.";
      }

      setAssessment({ score, factors, recommendation });
    },
    []
  );

  return {
    assessment,
    selectedMap,
    setSelectedMap,
    selectedLoadout,
    setSelectedLoadout,
    calculate,
  };
}
