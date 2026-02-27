/**
 * useLoadout — Loadout tab state machine.
 * Wraps item browser, skill tree, damage sim, advisor, risk score, raid log.
 */

import { useState, useCallback } from "react";
import { useItemBrowser } from "./useItemBrowser";
import { useSkillTree } from "./useSkillTree";
import { useDamageSim } from "./useDamageSim";
import { useItemAdvisor } from "./useItemAdvisor";
import { useStashOrganizer } from "./useStashOrganizer";
import { useRiskScore } from "./useRiskScore";
import { useRaidLog } from "./useRaidLog";
import { useEnemyBrowser } from "./useEnemyBrowser";
import { useEventTimer } from "./useEventTimer";
import { useLoadoutChecklist } from "./useLoadoutChecklist";
import type { LoadoutViewMode, RaidOutcome } from "../types";

export function useLoadout() {
  const [viewMode, setViewMode] = useState<LoadoutViewMode>("itemBrowser");

  const itemBrowser = useItemBrowser();
  const skillTree = useSkillTree();
  const damageSim = useDamageSim();
  const advisor = useItemAdvisor(itemBrowser.items);
  const stashOrganizer = useStashOrganizer();
  const riskScore = useRiskScore();
  const raidLog = useRaidLog();
  const enemyBrowser = useEnemyBrowser();
  const eventTimer = useEventTimer();
  const checklist = useLoadoutChecklist();

  const [compareItems, setCompareItems] = useState<string[]>([]);

  const goBack = useCallback(() => {
    switch (viewMode) {
      case "itemDetail":
      case "skillTree":
      case "damageSim":
      case "riskScore":
      case "raidLog":
      case "stashOrganizer":
        setViewMode("itemBrowser");
        break;
      case "itemCompare":
      case "advisor":
        setViewMode("itemDetail");
        break;
      case "skillDetail":
        setViewMode("skillTree");
        break;
      default:
        setViewMode("itemBrowser");
    }
  }, [viewMode]);

  const refresh = useCallback(async () => {
    await itemBrowser.refresh();
  }, [itemBrowser.refresh]);

  const addRaidEntry = useCallback(() => {
    // Add a placeholder raid entry — in a real app this would open a form
    raidLog.addEntry({
      date: Date.now(),
      mapId: riskScore.selectedMap ?? "unknown",
      loadout: riskScore.selectedLoadout.length > 0 ? riskScore.selectedLoadout : ["default"],
      outcome: "extracted" as RaidOutcome,
      lootValue: 0,
    });
  }, [raidLog.addEntry, riskScore.selectedMap, riskScore.selectedLoadout]);

  const calculateRisk = useCallback(() => {
    riskScore.calculate({
      mapId: riskScore.selectedMap,
      loadout: riskScore.selectedLoadout,
      raidHistory: raidLog.entries,
      bots: enemyBrowser.bots,
      activeEvents: eventTimer.activeEvents,
    });
  }, [riskScore, raidLog.entries, enemyBrowser.bots, eventTimer.activeEvents]);

  return {
    viewMode,
    setViewMode,
    // Item browser
    items: itemBrowser.items,
    itemSearch: itemBrowser.search,
    setItemSearch: itemBrowser.setSearch,
    selectedCategory: itemBrowser.selectedCategory,
    setSelectedCategory: itemBrowser.setSelectedCategory,
    selectedItem: itemBrowser.selectedItem,
    setSelectedItem: itemBrowser.setSelectedItem,
    itemDetail: itemBrowser.itemDetail,
    // Compare
    compareItems,
    setCompareItems,
    // Skill tree
    skillNodes: skillTree.skillNodes,
    selectedSkillNode: skillTree.selectedNode,
    setSelectedSkillNode: skillTree.setSelectedNode,
    skillAllocations: skillTree.allocations,
    allocateSkill: skillTree.allocateSkill,
    deallocateSkill: skillTree.deallocateSkill,
    // Damage sim
    damageInput: damageSim.input,
    setDamageInput: damageSim.setInput,
    damageOutput: damageSim.output,
    runDamageSim: damageSim.runSim,
    // Advisor
    advisorResult: advisor.result,
    runAdvisor: advisor.runAdvisor,
    // Risk score
    riskAssessment: riskScore.assessment,
    riskLoadout: riskScore.selectedLoadout,
    setRiskLoadout: riskScore.setSelectedLoadout,
    riskMap: riskScore.selectedMap,
    setRiskMap: riskScore.setSelectedMap,
    calculateRisk,
    // Raid log
    raidEntries: raidLog.entries,
    raidStats: raidLog.loadoutStats,
    addRaidEntry,
    // Stash organizer
    stashVerdicts: stashOrganizer.verdicts,
    stashLoading: stashOrganizer.loading,
    stashStats: stashOrganizer.stats,
    refreshStash: stashOrganizer.refresh,
    // Checklist
    checklistItems: checklist.items,
    addToChecklist: checklist.addItem,
    toggleChecklistItem: checklist.toggleItem,
    removeChecklistItem: checklist.removeItem,
    clearCheckedItems: checklist.clearChecked,
    // Common
    loading: itemBrowser.loading || skillTree.loading,
    error: itemBrowser.error || skillTree.error,
    goBack,
    refresh,
  };
}
