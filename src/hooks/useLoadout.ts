/**
 * useLoadout — Loadout tab state machine.
 * Wraps item browser, skill tree, my loadout, map recommendations, risk score.
 */

import { useState, useCallback } from "react";
import { useItemBrowser } from "./useItemBrowser";
import { useSkillTree } from "./useSkillTree";
import { useStashOrganizer } from "./useStashOrganizer";
import { useRiskScore } from "./useRiskScore";
import { useRaidLog } from "./useRaidLog";
import { useEnemyBrowser } from "./useEnemyBrowser";
import { useEventTimer } from "./useEventTimer";
import { useLoadoutChecklist } from "./useLoadoutChecklist";
import { useMyLoadout } from "./useMyLoadout";
import { useMapRecommendations } from "./useMapRecommendations";
import type { LoadoutViewMode } from "../types";
import type { EquipmentSlot } from "./useMyLoadout";

export function useLoadout() {
  const [viewMode, setViewMode] = useState<LoadoutViewMode>("loadoutSummary");

  const itemBrowser = useItemBrowser();
  const skillTree = useSkillTree();
  const stashOrganizer = useStashOrganizer();
  const riskScore = useRiskScore();
  const raidLog = useRaidLog();
  const enemyBrowser = useEnemyBrowser();
  const eventTimer = useEventTimer();
  const checklist = useLoadoutChecklist();
  const myLoadout = useMyLoadout(itemBrowser.items);
  const mapRecs = useMapRecommendations(itemBrowser.items, enemyBrowser.bots);

  const [compareItems, setCompareItems] = useState<string[]>([]);
  const [itemPickerSlot, setItemPickerSlot] = useState<EquipmentSlot | null>(null);

  const goBack = useCallback(() => {
    switch (viewMode) {
      case "itemBrowser":
      case "skillTree":
      case "buildAdvisor":
      case "stashOrganizer":
      case "itemPicker":
        setViewMode("loadoutSummary");
        break;
      case "itemDetail":
        setViewMode("itemBrowser");
        break;
      case "itemCompare":
        setViewMode("itemDetail");
        break;
      case "skillDetail":
        setViewMode("skillTree");
        break;
      default:
        setViewMode("loadoutSummary");
    }
  }, [viewMode]);

  const refresh = useCallback(async () => {
    await itemBrowser.refresh();
  }, [itemBrowser.refresh]);

  const calculateRisk = useCallback(() => {
    riskScore.calculate({
      mapId: riskScore.selectedMap,
      loadout: myLoadout.equippedItems.map((it) => it.id),
      raidHistory: raidLog.entries,
      bots: enemyBrowser.bots,
      activeEvents: eventTimer.activeEvents,
    });
  }, [riskScore, myLoadout.equippedItems, raidLog.entries, enemyBrowser.bots, eventTimer.activeEvents]);

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
    // My loadout
    myLoadout: myLoadout.loadout,
    myLoadoutStats: myLoadout.stats,
    myBuildClass: myLoadout.buildClass,
    equippedCount: myLoadout.equippedCount,
    equippedItems: myLoadout.equippedItems,
    equipItem: myLoadout.equipItem,
    unequipItem: myLoadout.unequipItem,
    clearLoadout: myLoadout.clearLoadout,
    // Item picker
    itemPickerSlot,
    setItemPickerSlot,
    // Map recommendations
    mapRecs,
    // Risk score
    riskAssessment: riskScore.assessment,
    riskMap: riskScore.selectedMap,
    setRiskMap: riskScore.setSelectedMap,
    calculateRisk,
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
    // Enemies (for recommendations)
    bots: enemyBrowser.bots,
    // Common
    loading: itemBrowser.loading || skillTree.loading,
    error: itemBrowser.error || skillTree.error,
    goBack,
    refresh,
  };
}
