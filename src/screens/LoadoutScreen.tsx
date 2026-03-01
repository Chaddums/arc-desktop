/**
 * LoadoutScreen — Tab 2: Loadout summary dashboard with equipped gear,
 * derived stats, risk assessment, map recommendations, and drill-down views.
 */

import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, rarityColors, spacing, fontSize as fs } from "../theme";
import { useColors } from "../theme/ThemeContext";
import {
  Panel,
  Divider,
  BackHeader,
  EmptyState,
  FilterPills,
  SearchBar,
  ItemRow,
  StatBar,
  KPIBar,
  RiskGauge,
  ProgressBar,
} from "../components";
import { useLoadout } from "../hooks/useLoadout";
import { useBuildAdvisor } from "../hooks/useBuildAdvisor";
import { loc } from "../utils/loc";
import { formatValue } from "../utils/format";
import type { LoadoutViewMode, MetaForgeItem, AdvisorVerdict } from "../types";
import type { PlaystyleGoal, BuildAdvice } from "../hooks/useBuildAdvisor";
import type { EquipmentSlot } from "../hooks/useMyLoadout";

const ITEM_CATEGORIES = ["Weapon", "Armor", "Consumable", "Material", "Key"];

// ─── Equipment Slot Grid config ──────────────────────────────────
const EQUIPMENT_SLOTS: { key: EquipmentSlot; label: string; icon: string }[] = [
  { key: "weapon", label: "Weapon", icon: "W" },
  { key: "armor", label: "Armor", icon: "A" },
  { key: "helmet", label: "Helmet", icon: "H" },
  { key: "backpack", label: "Backpack", icon: "B" },
  { key: "gadget", label: "Gadget", icon: "G" },
  { key: "consumable", label: "Consumable", icon: "C" },
];

// ─── Build classification colors ────────────────────────────────
type BuildClass = "DPS" | "Tank" | "Support" | "Hybrid";

const BUILD_CLASS_COLORS: Record<BuildClass, string> = {
  DPS: Colors.red,
  Tank: Colors.accent,
  Support: Colors.green,
  Hybrid: Colors.amber,
};

// ─── Stat quality helper ────────────────────────────────────────
function getStatQuality(value: number): { color: string; label: string } {
  if (value >= 80) return { color: Colors.green, label: "Excellent" };
  if (value >= 60) return { color: Colors.accent, label: "Good" };
  if (value >= 40) return { color: Colors.amber, label: "Average" };
  return { color: Colors.red, label: "Weak" };
}

// ─── Average stat value for an item ──────────────────────────────
function avgStatValue(item: MetaForgeItem): number {
  if (!item.stat_block) return 0;
  const vals = Object.values(item.stat_block)
    .map(v => Number(v))
    .filter((v): v is number => !isNaN(v) && v != null);
  if (vals.length === 0) return 0;
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  return isNaN(avg) ? 0 : Math.round(avg);
}

// ─── Classify build from item stat_block (for item detail) ──────
function classifyBuild(statBlock?: Record<string, number | undefined>): BuildClass {
  if (!statBlock) return "Hybrid";
  const dmg = (statBlock.damage ?? 0) + (statBlock.fireRate ?? 0);
  const sup = (statBlock.agility ?? 0) + (statBlock.stealth ?? 0);
  const tank = statBlock.weight ?? 0;
  const max = Math.max(dmg, sup, tank);
  if (max === 0) return "Hybrid";
  if (dmg >= sup && dmg >= tank && dmg > 0) return "DPS";
  if (tank >= dmg && tank >= sup && tank > 0) return "Tank";
  if (sup >= dmg && sup >= tank && sup > 0) return "Support";
  return "Hybrid";
}

// ─── Playstyle goal config for build advisor ────────────────────
const PLAYSTYLE_GOALS: { goal: PlaystyleGoal; icon: string; color: string }[] = [
  { goal: "Aggressive", icon: "A", color: Colors.red },
  { goal: "Balanced", icon: "B", color: Colors.accent },
  { goal: "Survival", icon: "S", color: Colors.green },
  { goal: "Farming", icon: "F", color: Colors.amber },
];

const MAP_OPTIONS = ["Dam", "Spaceport", "Buried City", "Blue Gate", "Stella Montis"];

export default function LoadoutScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const {
    viewMode,
    setViewMode,
    // Item browser
    items,
    itemSearch,
    setItemSearch,
    selectedCategory,
    setSelectedCategory,
    selectedItem,
    setSelectedItem,
    itemDetail,
    // Compare
    compareItems,
    setCompareItems,
    // Skill tree
    skillNodes,
    selectedSkillNode,
    setSelectedSkillNode,
    skillAllocations,
    allocateSkill,
    deallocateSkill,
    // My loadout
    myLoadout,
    myLoadoutStats,
    myBuildClass,
    equippedCount,
    equipItem,
    unequipItem,
    // Item picker
    itemPickerSlot,
    setItemPickerSlot,
    // Map recommendations
    mapRecs,
    // Risk score
    riskAssessment,
    riskMap,
    setRiskMap,
    calculateRisk,
    // Stash organizer
    stashVerdicts,
    stashLoading,
    stashStats,
    refreshStash,
    // Checklist
    addToChecklist,
    // Common
    loading,
    error,
    goBack,
    refresh,
  } = useLoadout();

  // ─── Build advisor hook ──────────────────────────────────────
  const { getAdvice } = useBuildAdvisor(items, skillNodes, skillAllocations);

  // ─── Local state for equipment slot filter (item browser) ─────
  const [activeSlot, setActiveSlot] = useState<string | null>(null);

  // ─── Local state for build advisor ─────────────────────────────
  const [buildAdvice, setBuildAdvice] = useState<BuildAdvice | null>(() => getAdvice("Balanced"));

  // ─── Item picker search ────────────────────────────────────────
  const [pickerSearch, setPickerSearch] = useState("");

  const filteredItems = useMemo(() => {
    let list = items;
    if (selectedCategory) {
      list = list.filter((item) =>
        item.item_type?.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }
    if (activeSlot) {
      list = list.filter((item) =>
        item.item_type?.toLowerCase().includes(activeSlot.toLowerCase())
      );
    }
    if (itemSearch) {
      const q = itemSearch.toLowerCase();
      list = list.filter((item) => item.name.toLowerCase().includes(q));
    }
    return list;
  }, [items, selectedCategory, activeSlot, itemSearch]);

  // ─── Item picker: filtered items for slot ──────────────────────
  const pickerItems = useMemo(() => {
    if (!itemPickerSlot) return [];
    let list = items.filter((item) =>
      item.item_type?.toLowerCase().includes(itemPickerSlot.toLowerCase())
    );
    if (pickerSearch) {
      const q = pickerSearch.toLowerCase();
      list = list.filter((item) => item.name.toLowerCase().includes(q));
    }
    return list;
  }, [items, itemPickerSlot, pickerSearch]);

  // ─── KPI computations for item browser ────────────────────────
  const browserKPI = useMemo(() => {
    const total = items.length;
    const equipped = items.filter(
      (it) => it.loadout_slots && it.loadout_slots.length > 0
    ).length;
    const avgQuality =
      total > 0
        ? Math.round(items.reduce((s, it) => s + avgStatValue(it), 0) / total)
        : 0;
    return { total, equipped, avgQuality: avgQuality || 0 };
  }, [items]);

  // ─── Compare: allow selecting items from browse list ──────────
  const toggleCompareItem = useCallback(
    (id: string) => {
      setCompareItems((prev: string[]) => {
        if (prev.includes(id)) return prev.filter((x: string) => x !== id);
        if (prev.length >= 2) return [prev[1], id];
        return [...prev, id];
      });
    },
    [setCompareItems]
  );

  // ─── Build advisor handler ────────────────────────────────────
  const handlePlaystyleSelect = useCallback(
    (goal: PlaystyleGoal) => {
      const advice = getAdvice(goal);
      setBuildAdvice(advice);
    },
    [getAdvice]
  );

  useEffect(() => {
    if (buildAdvice?.goal) {
      setBuildAdvice(getAdvice(buildAdvice.goal));
    }
  }, [getAdvice]);

  // ─── Skill summary for loadout overview ────────────────────────
  const skillSummary = useMemo(() => {
    const totalSpent = Object.values(skillAllocations).reduce((s, v) => s + v, 0);
    const activeCount = Object.values(skillAllocations).filter((v) => v > 0).length;
    const categories = new Set(
      skillNodes
        .filter((n) => (skillAllocations[n.id] ?? 0) > 0)
        .map((n) => n.category ?? "General")
    );
    let synergy = "None";
    if (categories.size === 1 && totalSpent >= 3) synergy = `${[...categories][0]} Focus`;
    else if (categories.size >= 2) synergy = "Multi-spec";
    return { totalSpent, activeCount, synergy };
  }, [skillAllocations, skillNodes]);

  // ══════════════════════════════════════════════════════════════
  //  LOADOUT SUMMARY (new default view)
  // ══════════════════════════════════════════════════════════════
  const renderLoadoutSummary = () => {
    const buildColor = BUILD_CLASS_COLORS[myBuildClass as BuildClass] ?? Colors.amber;

    return (
      <>
        {/* 1. Equipment Slot Grid */}
        <Text style={styles.sectionTitle}>Equipment</Text>
        <View style={styles.slotGrid}>
          {EQUIPMENT_SLOTS.map((slot) => {
            const equipped = myLoadout[slot.key];
            const rarityColor = equipped?.rarity
              ? (rarityColors as Record<string, string>)[equipped.rarity.toLowerCase()]
              : undefined;

            return (
              <TouchableOpacity
                key={slot.key}
                style={[
                  styles.slotCell,
                  equipped && {
                    borderColor: rarityColor ?? Colors.accent,
                    backgroundColor: (rarityColor ?? Colors.accent) + "12",
                  },
                ]}
                onPress={() => {
                  setItemPickerSlot(slot.key);
                  setPickerSearch("");
                  setViewMode("itemPicker");
                }}
                onLongPress={() => {
                  if (equipped) unequipItem(slot.key);
                }}
                activeOpacity={0.7}
              >
                {equipped ? (
                  <>
                    <Text style={[styles.slotIcon, { color: rarityColor ?? Colors.accent }]}>
                      {slot.icon}
                    </Text>
                    <Text style={[styles.slotItemName, { color: rarityColor ?? Colors.text }]} numberOfLines={1}>
                      {equipped.name}
                    </Text>
                    {equipped.rarity && (
                      <Text style={[styles.slotRarity, { color: rarityColor ?? Colors.textSecondary }]}>
                        {equipped.rarity}
                      </Text>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={styles.slotIcon}>{slot.icon}</Text>
                    <Text style={styles.slotLabel}>{slot.label}</Text>
                    <Text style={styles.slotEmptyHint}>Tap to equip</Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 2. Stats Dashboard (when items equipped) */}
        {equippedCount > 0 && (
          <>
            <View style={styles.buildBadgeRow}>
              <View style={[styles.buildBadge, { backgroundColor: buildColor + "22", borderColor: buildColor }]}>
                <Text style={[styles.buildBadgeText, { color: buildColor }]}>
                  {myBuildClass}
                </Text>
              </View>
              <Text style={styles.equippedCountText}>{equippedCount}/6 slots</Text>
            </View>

            <KPIBar
              cells={[
                { label: "Overall", value: String(myLoadoutStats.overallScore), color: C.accent },
                { label: "Damage", value: String(myLoadoutStats.damageOutput), color: Colors.red },
                { label: "Survive", value: String(myLoadoutStats.survivability), color: Colors.green },
                { label: "Mobility", value: String(myLoadoutStats.mobility), color: Colors.amber },
              ]}
            />

            <View style={styles.kpiGap} />

            <Panel>
              <Text style={styles.subHeading}>Stat Breakdown</Text>
              <StatBar label="Damage Output" value={myLoadoutStats.damageOutput} maxValue={300} color={Colors.red} />
              <StatBar label="Survivability" value={myLoadoutStats.survivability} maxValue={300} color={Colors.green} />
              <StatBar label="Mobility" value={myLoadoutStats.mobility} maxValue={300} color={Colors.amber} />
            </Panel>
          </>
        )}

        {/* 3. Inline Risk Assessment */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Risk Assessment</Text>
        <Panel>
          <FilterPills
            options={MAP_OPTIONS}
            selected={riskMap}
            onSelect={(map) => {
              setRiskMap(map);
            }}
            allLabel="Any"
          />

          <TouchableOpacity style={styles.simButton} onPress={calculateRisk}>
            <Text style={styles.simButtonText}>Assess Risk</Text>
          </TouchableOpacity>

          {riskAssessment && (
            <>
              <View style={styles.riskCenter}>
                <RiskGauge score={riskAssessment.score} />
              </View>
              <Text style={styles.recommendText}>{riskAssessment.recommendation}</Text>
            </>
          )}
        </Panel>

        {/* 4. Skill Summary */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Skills</Text>
        <Panel>
          <View style={styles.skillSummaryRow}>
            <View style={styles.skillSummaryCell}>
              <Text style={styles.skillSummaryValue}>{skillSummary.totalSpent}</Text>
              <Text style={styles.skillSummaryLabel}>Points Spent</Text>
            </View>
            <View style={styles.skillSummaryCell}>
              <Text style={styles.skillSummaryValue}>{skillSummary.activeCount}</Text>
              <Text style={styles.skillSummaryLabel}>Skills Active</Text>
            </View>
            <View style={styles.skillSummaryCell}>
              <Text style={[styles.skillSummaryValue, { color: Colors.accent }]}>
                {skillSummary.synergy}
              </Text>
              <Text style={styles.skillSummaryLabel}>Synergy</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.inlineButton}
            onPress={() => setViewMode("skillTree")}
          >
            <Text style={styles.inlineButtonText}>Edit Skill Tree</Text>
          </TouchableOpacity>
        </Panel>

        {/* 5. Map Recommendations */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Map Recommendations</Text>
        <Panel>
          <FilterPills
            options={mapRecs.maps}
            selected={mapRecs.selectedMap}
            onSelect={mapRecs.setSelectedMap}
            allLabel="Select Map"
          />

          {mapRecs.selectedMap && (
            <>
              {/* Threat summary */}
              <View style={styles.threatRow}>
                <Text style={styles.threatLabel}>
                  {mapRecs.threatSummary.totalEnemies} enemies
                </Text>
                {mapRecs.threatSummary.highThreatCount > 0 && (
                  <Text style={[styles.threatLabel, { color: Colors.red }]}>
                    {mapRecs.threatSummary.highThreatCount} high-threat
                  </Text>
                )}
                {mapRecs.threatSummary.dominantWeakness && (
                  <Text style={[styles.threatLabel, { color: Colors.accent }]}>
                    Weakness: {mapRecs.threatSummary.dominantWeakness}
                  </Text>
                )}
              </View>

              <Divider />

              {/* Per-slot recommendations */}
              {mapRecs.recommendations.size === 0 ? (
                <Text style={styles.hintText}>No recommendations for this map</Text>
              ) : (
                Array.from(mapRecs.recommendations.entries()).map(([slot, recs]) => (
                  <View key={slot}>
                    <Text style={styles.recSlotTitle}>{slot}</Text>
                    {recs.map((rec) => (
                      <TouchableOpacity
                        key={rec.item.id}
                        style={styles.recItemRow}
                        onPress={() => equipItem(slot, rec.item)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.recItemInfo}>
                          <Text style={styles.recItemName} numberOfLines={1}>{rec.item.name}</Text>
                          <Text style={styles.recItemReasoning} numberOfLines={1}>{rec.reasoning}</Text>
                        </View>
                        <View style={styles.recItemRight}>
                          <Text style={[styles.recItemScore, {
                            color: rec.score >= 50 ? C.green : rec.score >= 20 ? C.amber : C.textSecondary,
                          }]}>
                            {rec.score}
                          </Text>
                          <Text style={styles.recEquipHint}>EQUIP</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))
              )}
            </>
          )}
        </Panel>

        {/* 6. Quick Nav */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Tools</Text>
        <View style={styles.quickNav}>
          {[
            { label: "Items", icon: "I", mode: "itemBrowser" as LoadoutViewMode },
            { label: "Advisor", icon: "A", mode: "buildAdvisor" as LoadoutViewMode },
            { label: "Stash", icon: "S", mode: "stashOrganizer" as LoadoutViewMode },
            { label: "Skills", icon: "T", mode: "skillTree" as LoadoutViewMode },
          ].map((nav) => (
            <TouchableOpacity
              key={nav.mode}
              style={styles.quickNavButton}
              onPress={() => setViewMode(nav.mode)}
            >
              <Text style={styles.quickNavIcon}>{nav.icon}</Text>
              <Text style={styles.quickNavLabel}>{nav.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </>
    );
  };

  // ══════════════════════════════════════════════════════════════
  //  ITEM PICKER (slot-specific)
  // ══════════════════════════════════════════════════════════════
  const renderItemPicker = () => {
    const slotConfig = EQUIPMENT_SLOTS.find((s) => s.key === itemPickerSlot);
    const slotLabel = slotConfig?.label ?? "Item";

    return (
      <>
        <BackHeader title={`Equip ${slotLabel}`} onBack={goBack} />
        <SearchBar value={pickerSearch} onChangeText={setPickerSearch} placeholder={`Search ${slotLabel.toLowerCase()}s...`} />

        <View style={styles.listPad}>
          {pickerItems.length === 0 ? (
            <EmptyState
              icon="?"
              title={`No ${slotLabel.toLowerCase()}s found`}
              hint={loading ? "Loading..." : "Try a different search"}
            />
          ) : (
            pickerItems.map((item, idx) => (
              <View key={item.id} style={idx % 2 === 1 ? styles.rowAlt : undefined}>
                <ItemRow
                  name={item.name}
                  subtitle={`${item.item_type}${item.rarity ? ` \u00B7 ${item.rarity}` : ""}`}
                  rarity={item.rarity}
                  rightText="EQUIP"
                  rightColor={Colors.accent}
                  onPress={() => {
                    if (itemPickerSlot) {
                      equipItem(itemPickerSlot, item);
                      setViewMode("loadoutSummary");
                    }
                  }}
                />
              </View>
            ))
          )}
        </View>
      </>
    );
  };

  // ══════════════════════════════════════════════════════════════
  //  ITEM BROWSER (kept)
  // ══════════════════════════════════════════════════════════════
  const renderItemBrowser = () => (
    <>
      <BackHeader title="Loadout" onBack={goBack} />

      <KPIBar
        cells={[
          { label: "Known Items", value: String(browserKPI.total) },
          { label: "With Slots", value: String(browserKPI.equipped), color: C.accent },
          { label: "Avg Stats", value: String(browserKPI.avgQuality), color: browserKPI.avgQuality >= 60 ? C.green : C.amber },
        ]}
      />

      <View style={styles.kpiGap} />

      <SearchBar value={itemSearch} onChangeText={setItemSearch} placeholder="Search items..." />
      <FilterPills
        options={ITEM_CATEGORIES}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        allLabel="All Items"
      />

      <View style={styles.listPad}>
        {filteredItems.length === 0 ? (
          <EmptyState icon="?" title="No items found" hint={loading ? "Loading..." : "Try a different search"} />
        ) : (
          filteredItems.map((item, idx) => {
            const avg = avgStatValue(item);
            const needsUpgrade = avg > 0 && avg < 40;
            return (
              <View key={item.id} style={idx % 2 === 1 ? styles.rowAlt : undefined}>
                <ItemRow
                  name={item.name}
                  subtitle={
                    item.item_type +
                    (needsUpgrade ? "  |  ^ Upgrade" : "")
                  }
                  rarity={item.rarity}
                  rightText={item.value != null ? String(item.value) : undefined}
                  onPress={() => {
                    setSelectedItem(item.id);
                    setViewMode("itemDetail");
                  }}
                />
              </View>
            );
          })
        )}
      </View>
    </>
  );

  // ══════════════════════════════════════════════════════════════
  //  ITEM DETAIL (kept)
  // ══════════════════════════════════════════════════════════════
  const renderItemDetail = () => {
    if (!itemDetail) return <EmptyState title="Item not found" />;
    const stats = itemDetail.stat_block;
    const buildClass = classifyBuild(stats);

    return (
      <>
        <BackHeader title="Items" onBack={goBack} />
        <Panel>
          <Text style={styles.detailTitle}>{itemDetail.name}</Text>
          <View style={styles.metaRow}>
            {itemDetail.rarity && (
              <Text style={[styles.rarityBadge, {
                color: (rarityColors as Record<string, string>)[itemDetail.rarity.toLowerCase()] ?? Colors.textSecondary
              }]}>
                {itemDetail.rarity}
              </Text>
            )}
            {itemDetail.item_type && <Text style={styles.typeBadge}>{itemDetail.item_type}</Text>}
            {itemDetail.value != null && <Text style={styles.valueBadge}>{itemDetail.value} value</Text>}
          </View>

          <View style={styles.buildTagRow}>
            <View style={[styles.buildTag, { backgroundColor: BUILD_CLASS_COLORS[buildClass] + "22", borderColor: BUILD_CLASS_COLORS[buildClass] }]}>
              <Text style={[styles.buildTagText, { color: BUILD_CLASS_COLORS[buildClass] }]}>
                {buildClass}
              </Text>
            </View>
          </View>

          {itemDetail.description && (
            <>
              <Divider />
              <Text style={styles.descText}>{itemDetail.description}</Text>
            </>
          )}

          {stats && Object.keys(stats).length > 0 && (
            <>
              <Divider />
              <Text style={styles.subHeading}>Stats</Text>
              {Object.entries(stats).map(([key, val]) => {
                if (val == null) return null;
                const quality = getStatQuality(val);
                return (
                  <View key={key} style={styles.statBarRow}>
                    <View style={styles.statBarFlex}>
                      <StatBar label={key} value={val} maxValue={100} color={quality.color} />
                    </View>
                    <Text style={[styles.statQualityLabel, { color: quality.color }]}>
                      {quality.label}
                    </Text>
                  </View>
                );
              })}
            </>
          )}
        </Panel>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setCompareItems([itemDetail.id]);
              setViewMode("itemCompare");
            }}
          >
            <Text style={styles.actionButtonText}>Compare</Text>
          </TouchableOpacity>
          {typeof window !== "undefined" && window.arcDesktop && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => addToChecklist(itemDetail.name, 1)}
            >
              <Text style={styles.actionButtonText}>Pin to Overlay</Text>
            </TouchableOpacity>
          )}
        </View>
      </>
    );
  };

  // ══════════════════════════════════════════════════════════════
  //  ITEM COMPARE (kept)
  // ══════════════════════════════════════════════════════════════
  const renderItemCompare = () => {
    const comparedItems = compareItems
      .slice(0, 2)
      .map((id: string) => items.find((it) => it.id === id))
      .filter(Boolean) as MetaForgeItem[];

    let winnerIndex: number | null = null;
    if (comparedItems.length === 2) {
      const statsA = comparedItems[0].stat_block ?? {};
      const statsB = comparedItems[1].stat_block ?? {};
      const allKeys = new Set([...Object.keys(statsA), ...Object.keys(statsB)]);
      let advA = 0;
      let advB = 0;
      allKeys.forEach((k) => {
        const va = statsA[k] ?? 0;
        const vb = statsB[k] ?? 0;
        if (va > vb) advA++;
        else if (vb > va) advB++;
      });
      if (advA > advB) winnerIndex = 0;
      else if (advB > advA) winnerIndex = 1;
    }

    return (
      <>
        <BackHeader title="Items" onBack={goBack} />
        <Text style={styles.sectionTitle}>Item Comparison</Text>

        <Panel>
          <Text style={styles.subHeading}>Select items to compare</Text>
          {compareItems.length < 2 && (
            <Text style={styles.hintText}>
              Tap items below to select up to 2 for comparison.
            </Text>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.comparePickerScroll}>
            {items.slice(0, 30).map((it) => {
              const isSelected = compareItems.includes(it.id);
              return (
                <TouchableOpacity
                  key={it.id}
                  style={[styles.comparePickerItem, isSelected && styles.comparePickerItemActive]}
                  onPress={() => toggleCompareItem(it.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.comparePickerName, isSelected && styles.comparePickerNameActive]}
                    numberOfLines={1}
                  >
                    {it.name}
                  </Text>
                  {it.rarity && (
                    <Text style={[styles.comparePickerRarity, {
                      color: (rarityColors as Record<string, string>)[it.rarity.toLowerCase()] ?? Colors.textSecondary
                    }]}>
                      {it.rarity}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Panel>

        {comparedItems.length < 2 ? (
          <Panel>
            <Text style={styles.hintText}>
              Select {2 - comparedItems.length} more item{comparedItems.length === 0 ? "s" : ""} to compare.
            </Text>
          </Panel>
        ) : (
          <>
            <View style={styles.winnerBar}>
              {winnerIndex != null ? (
                <Text style={styles.winnerText}>
                  Winner: {comparedItems[winnerIndex].name}
                </Text>
              ) : (
                <Text style={styles.winnerTextTie}>Tied</Text>
              )}
            </View>

            <Panel>
              <View style={styles.compareRow}>
                {comparedItems.map((it, i) => (
                  <View key={it.id} style={styles.compareColHeader}>
                    <Text style={[styles.compareColName, {
                      color: i === 0 ? Colors.accent : Colors.amber
                    }]} numberOfLines={2}>
                      {it.name}
                    </Text>
                    {winnerIndex === i && (
                      <Text style={styles.compareWinnerBadge}>BEST</Text>
                    )}
                  </View>
                ))}
              </View>

              <Divider />

              {(() => {
                const statsA = comparedItems[0].stat_block ?? {};
                const statsB = comparedItems[1].stat_block ?? {};
                const allKeys = [...new Set([...Object.keys(statsA), ...Object.keys(statsB)])];
                return allKeys.map((key) => {
                  const va = statsA[key] ?? 0;
                  const vb = statsB[key] ?? 0;
                  const colorA = va > vb ? Colors.green : va < vb ? Colors.red : Colors.text;
                  const colorB = vb > va ? Colors.green : vb < va ? Colors.red : Colors.text;
                  return (
                    <View key={key} style={styles.compareStatRow}>
                      <Text style={[styles.compareStatValue, { color: colorA }]}>{va}</Text>
                      <Text style={styles.compareStatLabel}>{key}</Text>
                      <Text style={[styles.compareStatValue, { color: colorB }]}>{vb}</Text>
                    </View>
                  );
                });
              })()}
            </Panel>
          </>
        )}
      </>
    );
  };

  // ══════════════════════════════════════════════════════════════
  //  SKILL TREE (kept)
  // ══════════════════════════════════════════════════════════════
  const renderSkillTree = () => (
    <>
      <BackHeader title="Loadout" onBack={goBack} />
      <Text style={styles.sectionTitle}>Skill Tree</Text>
      {skillNodes.length === 0 ? (
        <EmptyState icon="?" title="No skill data" hint="Pull to refresh" />
      ) : (
        (() => {
          const categories = [...new Set(skillNodes.map((n) => n.category || "General"))];
          return categories.map((cat) => (
            <View key={cat}>
              <Text style={styles.categoryTitle}>{cat}</Text>
              {skillNodes
                .filter((n) => (n.category || "General") === cat)
                .map((node) => {
                  const allocated = skillAllocations[node.id] ?? 0;
                  const max = node.maxPoints ?? 1;
                  return (
                    <TouchableOpacity
                      key={node.id}
                      onPress={() => {
                        setSelectedSkillNode(node.id);
                        setViewMode("skillDetail");
                      }}
                    >
                      <Panel style={node.isMajor ? { ...styles.skillCard, ...styles.skillCardMajor } : styles.skillCard}>
                        <View style={styles.skillRow}>
                          <View style={styles.skillInfo}>
                            <Text style={styles.skillName}>
                              {node.isMajor ? "* " : ""}{loc(node.name)}
                            </Text>
                            <Text style={styles.skillAlloc}>{allocated}/{max}</Text>
                          </View>
                          <View style={styles.skillActions}>
                            <TouchableOpacity
                              style={styles.skillBtn}
                              onPress={() => deallocateSkill(node.id)}
                            >
                              <Text style={styles.skillBtnText}>-</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.skillBtn}
                              onPress={() => allocateSkill(node.id)}
                            >
                              <Text style={styles.skillBtnText}>+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <ProgressBar progress={max > 0 ? allocated / max : 0} color={Colors.accent} />
                      </Panel>
                    </TouchableOpacity>
                  );
                })}
            </View>
          ));
        })()
      )}
    </>
  );

  const renderSkillDetail = () => {
    const node = skillNodes.find((n) => n.id === selectedSkillNode);
    if (!node) return <EmptyState title="Skill not found" />;
    const prereqs = node.prerequisiteNodeIds
      ?.map((pid) => skillNodes.find((n) => n.id === pid))
      .filter(Boolean) ?? [];
    const allocated = skillAllocations[node.id] ?? 0;
    const max = node.maxPoints ?? 1;

    return (
      <>
        <BackHeader title="Skills" onBack={goBack} />
        <Panel>
          <Text style={styles.detailTitle}>
            {node.isMajor ? "* " : ""}{loc(node.name)}
          </Text>
          <Text style={styles.detailSubtitle}>{node.category ?? "General"}</Text>

          <Divider />

          <View style={styles.detailGrid}>
            <View style={styles.detailCell}>
              <Text style={styles.detailLabel}>Allocated</Text>
              <Text style={styles.detailValue}>{allocated} / {max}</Text>
            </View>
            <View style={styles.detailCell}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>{node.isMajor ? "Major" : "Minor"}</Text>
            </View>
          </View>

          {prereqs.length > 0 && (
            <>
              <Divider />
              <Text style={styles.subHeading}>Prerequisites</Text>
              {prereqs.map((p) => (
                <Text key={p!.id} style={styles.prereqText}>{"\u2022"} {loc(p!.name)}</Text>
              ))}
            </>
          )}
        </Panel>
      </>
    );
  };

  // ══════════════════════════════════════════════════════════════
  //  STASH ORGANIZER (kept)
  // ══════════════════════════════════════════════════════════════
  const [stashFilter, setStashFilter] = useState<AdvisorVerdict | null>(null);
  const [stashSearch, setStashSearch] = useState("");
  const [expandedStashItem, setExpandedStashItem] = useState<string | null>(null);

  const VERDICT_FILTERS: AdvisorVerdict[] = ["keep", "sell", "recycle"];

  const filteredStashVerdicts = useMemo(() => {
    let list = stashVerdicts;
    if (stashFilter) {
      list = list.filter((v) => v.verdict === stashFilter);
    }
    if (stashSearch) {
      const q = stashSearch.toLowerCase();
      list = list.filter((v) => v.item.name.toLowerCase().includes(q));
    }
    return list;
  }, [stashVerdicts, stashFilter, stashSearch]);

  const verdictColor = (v: AdvisorVerdict) =>
    v === "keep" ? C.verdictKeep : v === "sell" ? C.verdictSell : C.verdictRecycle;

  const renderStashOrganizer = () => (
    <>
      <BackHeader title="Loadout" onBack={goBack} />
      <Text style={styles.sectionTitle}>Stash Organizer</Text>

      <KPIBar
        cells={[
          { label: "Keep", value: `${stashStats.keepCount} ITEMS`, color: C.verdictKeep },
          { label: "Sell", value: `~${formatValue(stashStats.totalSellValue)}`, color: C.verdictSell },
          { label: "Recycle", value: `~${formatValue(stashStats.totalRecycleValue)}`, color: C.verdictRecycle },
        ]}
      />

      <View style={styles.kpiGap} />

      <FilterPills
        options={VERDICT_FILTERS.map((v) => v.charAt(0).toUpperCase() + v.slice(1))}
        selected={stashFilter ? stashFilter.charAt(0).toUpperCase() + stashFilter.slice(1) : null}
        onSelect={(val) => setStashFilter(
          val ? val.toLowerCase() as AdvisorVerdict : null
        )}
        allLabel="All"
      />

      <SearchBar value={stashSearch} onChangeText={setStashSearch} placeholder="Search items..." />

      <View style={styles.listPad}>
        {stashLoading && stashVerdicts.length === 0 ? (
          <EmptyState icon="?" title="Analyzing stash..." hint="Fetching items and computing verdicts" />
        ) : filteredStashVerdicts.length === 0 ? (
          <EmptyState icon="?" title="No items found" hint="Try a different filter or search" />
        ) : (
          filteredStashVerdicts.map((sv, idx) => {
            const isExpanded = expandedStashItem === sv.item.id;
            const subtitle = sv.verdict === "keep"
              ? `${sv.item.item_type} \u00B7 Used in crafting`
              : sv.verdict === "recycle"
              ? `${sv.item.item_type} \u00B7 \u2192 ${sv.recycleYields.map((y) => `${y.quantity}x ${y.itemName}`).join(", ") || "components"}`
              : `${sv.item.item_type} \u00B7 ${sv.sellValue} value`;

            return (
              <View key={sv.item.id} style={idx % 2 === 1 ? styles.rowAlt : undefined}>
                <ItemRow
                  name={sv.item.name}
                  subtitle={subtitle}
                  rarity={sv.item.rarity}
                  rightText={sv.verdict.toUpperCase()}
                  rightColor={verdictColor(sv.verdict)}
                  onPress={() => setExpandedStashItem(isExpanded ? null : sv.item.id)}
                />
                {isExpanded && (
                  <Panel style={styles.stashExpandedPanel}>
                    <Text style={styles.reasoningText}>{sv.reasoning}</Text>

                    {sv.verdict === "keep" && sv.craftingUses.length > 0 && (
                      <>
                        <Text style={[styles.subHeading, { marginTop: spacing.sm }]}>Crafting Uses</Text>
                        {sv.craftingUses.map((use, i) => (
                          <Text key={i} style={styles.yieldText}>{"\u2022"} {use}</Text>
                        ))}
                      </>
                    )}

                    {sv.verdict === "recycle" && sv.recycleYields.length > 0 && (
                      <>
                        <Text style={[styles.subHeading, { marginTop: spacing.sm }]}>Recycle Yields</Text>
                        {sv.recycleYields.map((y, i) => (
                          <Text key={i} style={styles.yieldText}>
                            {y.itemName} x{y.quantity}
                          </Text>
                        ))}
                      </>
                    )}

                    {sv.verdict === "sell" && (
                      <Text style={[styles.yieldText, { marginTop: spacing.xs }]}>
                        Sell value: {sv.sellValue}
                      </Text>
                    )}

                    {typeof window !== "undefined" && window.arcDesktop && (
                      <TouchableOpacity
                        style={[styles.actionButton, { marginTop: spacing.sm }]}
                        onPress={() => addToChecklist(sv.item.name, 1)}
                      >
                        <Text style={styles.actionButtonText}>Pin to Overlay</Text>
                      </TouchableOpacity>
                    )}
                  </Panel>
                )}
              </View>
            );
          })
        )}
      </View>
    </>
  );

  // ══════════════════════════════════════════════════════════════
  //  BUILD ADVISOR (kept)
  // ══════════════════════════════════════════════════════════════
  const renderBuildAdvisor = () => (
    <>
      <BackHeader title="Loadout" onBack={goBack} />
      <Text style={styles.sectionTitle}>Build Advisor</Text>

      <Panel>
        <Text style={styles.subHeading}>Choose Your Playstyle</Text>
        <Text style={{ color: C.textSecondary, fontSize: 11, marginBottom: 8 }}>
          {items.length > 0
            ? `Analyzing ${items.length} items to find the best gear for your style`
            : "Loading item data..."}
        </Text>
        <View style={styles.playstyleGrid}>
          {PLAYSTYLE_GOALS.map(({ goal, icon, color }) => {
            const isActive = buildAdvice?.goal === goal;
            return (
              <TouchableOpacity
                key={goal}
                style={[
                  styles.playstyleButton,
                  isActive && { borderColor: color, backgroundColor: color + "18" },
                ]}
                onPress={() => handlePlaystyleSelect(goal)}
                activeOpacity={0.7}
              >
                <Text style={[styles.playstyleIcon, { color: isActive ? color : C.textSecondary }]}>
                  {icon}
                </Text>
                <Text style={[styles.playstyleLabel, { color: isActive ? color : C.textSecondary }]}>
                  {goal}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Panel>

      {buildAdvice && (
        <>
          <Panel variant="glow" style={styles.adviceSummaryPanel}>
            <Text style={styles.adviceSummaryTitle}>{buildAdvice.goal} Build</Text>
            <Text style={styles.adviceSummaryText}>{buildAdvice.summary}</Text>
          </Panel>

          {buildAdvice.itemRecommendations.size === 0 && (
            <Panel style={styles.adviceItemCard}>
              <Text style={{ color: C.textSecondary, textAlign: "center", padding: 12 }}>
                {items.length === 0
                  ? "Waiting for item data to load..."
                  : "No scored items found. Try refreshing the item database."}
              </Text>
            </Panel>
          )}

          {Array.from(buildAdvice.itemRecommendations.entries()).map(([category, recs]) => (
            <View key={category}>
              <Text style={styles.adviceSlotTitle}>{category}</Text>
              {recs.slice(0, 5).map((rec, idx) => (
                <Panel key={rec.itemId} style={styles.adviceItemCard}>
                  <View style={styles.adviceItemRow}>
                    <View style={styles.adviceItemInfo}>
                      <Text style={styles.adviceItemRank}>#{idx + 1}</Text>
                      <View style={styles.adviceItemTextCol}>
                        <Text style={styles.adviceItemName} numberOfLines={1}>
                          {rec.itemName}
                        </Text>
                        <Text style={styles.adviceItemReasoning} numberOfLines={2}>
                          {rec.reasoning}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.adviceItemScore, {
                      color: rec.score >= 50 ? C.green : rec.score >= 20 ? C.amber : C.textSecondary,
                    }]}>
                      {rec.score}
                    </Text>
                  </View>
                </Panel>
              ))}
            </View>
          ))}

          {buildAdvice.skillRecommendations.length > 0 && (
            <>
              <Text style={styles.adviceSlotTitle}>Recommended Skills</Text>
              {buildAdvice.skillRecommendations.map((rec) => (
                <Panel key={rec.nodeId} style={styles.adviceItemCard}>
                  <View style={styles.adviceSkillRow}>
                    <View style={styles.adviceItemTextCol}>
                      <Text style={styles.adviceItemName}>{rec.nodeName}</Text>
                      <Text style={styles.adviceItemReasoning}>{rec.reasoning}</Text>
                    </View>
                    <Text style={styles.adviceSkillPoints}>
                      {rec.points} pts
                    </Text>
                  </View>
                </Panel>
              ))}
            </>
          )}

          <Text style={{ color: C.textSecondary, fontSize: 10, textAlign: "center", marginTop: 12, opacity: 0.6 }}>
            (Beta) Estimates based on available data
          </Text>
        </>
      )}
    </>
  );

  // ══════════════════════════════════════════════════════════════
  //  MAIN RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: C.bg }]}>
      <Text style={[styles.header, { color: C.text }]}>Loadout</Text>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={C.accent} />
        }
      >
        {error && (
          <Panel style={styles.errorPanel}>
            <Text style={styles.errorText}>{error}</Text>
          </Panel>
        )}

        {viewMode === "loadoutSummary" && renderLoadoutSummary()}
        {viewMode === "itemPicker" && renderItemPicker()}
        {viewMode === "itemBrowser" && renderItemBrowser()}
        {viewMode === "itemDetail" && renderItemDetail()}
        {viewMode === "itemCompare" && renderItemCompare()}
        {viewMode === "skillTree" && renderSkillTree()}
        {viewMode === "skillDetail" && renderSkillDetail()}
        {viewMode === "buildAdvisor" && renderBuildAdvisor()}
        {viewMode === "stashOrganizer" && renderStashOrganizer()}
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxs,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 12 },
  sectionTitle: { fontSize: fs.md, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.xs },
  subHeading: { fontSize: fs.sm, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: spacing.xs },

  // ─── KPI gap ─────────────────────────────────────────────────
  kpiGap: { height: spacing.sm },

  // ─── Equipment slot grid ─────────────────────────────────────
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  slotCell: {
    width: "31%",
    flexGrow: 1,
    flexBasis: "30%",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    minHeight: 70,
    justifyContent: "center",
  },
  slotIcon: {
    fontSize: fs.lg,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  slotLabel: {
    fontSize: fs.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  slotEmptyHint: {
    fontSize: 8,
    color: Colors.textMuted,
    marginTop: 2,
  },
  slotItemName: {
    fontSize: fs.xs,
    fontWeight: "600",
    textAlign: "center",
  },
  slotRarity: {
    fontSize: 8,
    fontWeight: "700",
    marginTop: 1,
  },

  // ─── Build badge ──────────────────────────────────────────────
  buildBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  buildBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 4,
    borderWidth: 1,
  },
  buildBadgeText: {
    fontSize: fs.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  equippedCountText: {
    fontSize: fs.sm,
    color: Colors.textSecondary,
  },

  // ─── Skill summary ───────────────────────────────────────────
  skillSummaryRow: {
    flexDirection: "row",
    marginBottom: spacing.sm,
  },
  skillSummaryCell: {
    flex: 1,
    alignItems: "center",
  },
  skillSummaryValue: {
    fontSize: fs.lg,
    fontWeight: "700",
    color: Colors.text,
  },
  skillSummaryLabel: {
    fontSize: fs.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // ─── Inline button ────────────────────────────────────────────
  inlineButton: {
    backgroundColor: Colors.accentBg,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 6,
    padding: spacing.xs,
    alignItems: "center",
  },
  inlineButtonText: {
    fontSize: fs.sm,
    fontWeight: "700",
    color: Colors.accent,
  },

  // ─── Threat row ───────────────────────────────────────────────
  threatRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  threatLabel: {
    fontSize: fs.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
  },

  // ─── Recommendations ─────────────────────────────────────────
  recSlotTitle: {
    fontSize: fs.sm,
    fontWeight: "700",
    color: Colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.xxs,
  },
  recItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  recItemInfo: {
    flex: 1,
  },
  recItemName: {
    fontSize: fs.md,
    fontWeight: "600",
    color: Colors.text,
  },
  recItemReasoning: {
    fontSize: fs.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  recItemRight: {
    alignItems: "flex-end",
    marginLeft: spacing.sm,
  },
  recItemScore: {
    fontSize: fs.lg,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  recEquipHint: {
    fontSize: 7,
    fontWeight: "700",
    color: Colors.accent,
    marginTop: 1,
  },

  // ─── Quick nav ───────────────────────────────────────────────
  quickNav: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.xs },
  quickNavButton: { flex: 1, alignItems: "center", backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  quickNavIcon: { fontSize: fs.lg, fontWeight: "700", color: Colors.accent, marginBottom: spacing.xxs },
  quickNavLabel: { fontSize: 8, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.4 },

  // ─── Sim / Risk ───────────────────────────────────────────────
  simButton: { backgroundColor: Colors.accentBg, borderWidth: 1, borderColor: Colors.accent, borderRadius: 6, padding: spacing.sm, alignItems: "center", marginTop: spacing.sm },
  simButtonText: { fontSize: fs.lg, fontWeight: "700", color: Colors.accent },
  riskCenter: { alignItems: "center", paddingVertical: spacing.sm },
  recommendText: { fontSize: fs.md, color: Colors.accent, textAlign: "center", fontWeight: "600", marginTop: spacing.xs },

  // ─── Item list ───────────────────────────────────────────────
  listPad: { paddingTop: spacing.sm },
  rowAlt: { backgroundColor: Colors.rowAlt, borderRadius: 6 },

  // ─── Item detail ─────────────────────────────────────────────
  detailTitle: { fontSize: 17, fontWeight: "700", color: Colors.text },
  detailSubtitle: { fontSize: fs.md, color: Colors.textSecondary, marginTop: spacing.xxs },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  detailCell: { minWidth: "40%" },
  detailLabel: { fontSize: fs.xs, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  detailValue: { fontSize: fs.lg, fontWeight: "700", color: Colors.text, marginTop: spacing.xxs },
  metaRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  rarityBadge: { fontSize: fs.md, fontWeight: "700" },
  typeBadge: { fontSize: fs.md, color: Colors.textSecondary },
  valueBadge: { fontSize: fs.md, color: Colors.accent },
  descText: { fontSize: fs.md, color: Colors.text, lineHeight: 18 },

  // ─── Build classification tag ────────────────────────────────
  buildTagRow: { flexDirection: "row", marginTop: spacing.sm },
  buildTag: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: 4, borderWidth: 1 },
  buildTagText: { fontSize: fs.xs, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },

  // ─── Stat bar with quality label ─────────────────────────────
  statBarRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  statBarFlex: { flex: 1 },
  statQualityLabel: { fontSize: fs.xs, fontWeight: "700", width: 56, textAlign: "right" },

  // ─── Actions ─────────────────────────────────────────────────
  actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  actionButton: { flex: 1, backgroundColor: Colors.accentBg, borderWidth: 1, borderColor: Colors.accent, borderRadius: 6, padding: spacing.sm, alignItems: "center" },
  actionButtonText: { fontSize: fs.md, fontWeight: "700", color: Colors.accent },

  // ─── Compare ─────────────────────────────────────────────────
  compareRow: { flexDirection: "row" },
  comparePickerScroll: { marginTop: spacing.xs, marginBottom: spacing.xs },
  comparePickerItem: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
    minWidth: 80,
    alignItems: "center",
  },
  comparePickerItemActive: { borderColor: Colors.accent, backgroundColor: Colors.accentBg },
  comparePickerName: { fontSize: fs.xs, fontWeight: "600", color: Colors.textSecondary },
  comparePickerNameActive: { color: Colors.accent },
  comparePickerRarity: { fontSize: 8, fontWeight: "700", marginTop: 1 },
  winnerBar: {
    backgroundColor: Colors.accentBg,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 6,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginVertical: spacing.xs,
    alignItems: "center",
  },
  winnerText: { fontSize: fs.md, fontWeight: "700", color: Colors.green },
  winnerTextTie: { fontSize: fs.md, fontWeight: "700", color: Colors.amber },
  compareColHeader: { flex: 1, alignItems: "center", paddingVertical: spacing.xs },
  compareColName: { fontSize: fs.md, fontWeight: "700", textAlign: "center" },
  compareWinnerBadge: {
    fontSize: 8,
    fontWeight: "700",
    color: Colors.green,
    backgroundColor: "rgba(45, 155, 78, 0.15)",
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: 3,
    marginTop: spacing.xxs,
    overflow: "hidden",
  },
  compareStatRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  compareStatLabel: { fontSize: fs.xs, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", textAlign: "center", flex: 1 },
  compareStatValue: { fontSize: fs.md, fontWeight: "700", fontVariant: ["tabular-nums"], width: 50, textAlign: "center" },
  hintText: { fontSize: fs.md, color: Colors.textMuted, textAlign: "center", paddingVertical: spacing.sm },

  // ─── Skill tree ──────────────────────────────────────────────
  categoryTitle: { fontSize: fs.md, fontWeight: "700", color: Colors.accent, marginTop: spacing.sm, marginBottom: spacing.xs },
  skillCard: { marginBottom: spacing.sm },
  skillCardMajor: { borderColor: Colors.accent },
  skillRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xs },
  skillInfo: { flex: 1 },
  skillName: { fontSize: fs.lg, fontWeight: "600", color: Colors.text },
  skillAlloc: { fontSize: fs.sm, color: Colors.textSecondary, marginTop: spacing.xxs },
  skillActions: { flexDirection: "row", gap: spacing.sm },
  skillBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: Colors.borderAccent, alignItems: "center", justifyContent: "center" },
  skillBtnText: { fontSize: 16, fontWeight: "700", color: Colors.accent },
  prereqText: { fontSize: fs.md, color: Colors.text, marginBottom: spacing.xs, lineHeight: 18 },

  // ─── Advisor / Stash ─────────────────────────────────────────
  reasoningText: { fontSize: fs.md, color: Colors.text, textAlign: "center", marginTop: spacing.sm, lineHeight: 18 },
  yieldText: { fontSize: fs.md, color: Colors.text, marginBottom: spacing.xs },

  // ─── Build Advisor ───────────────────────────────────────────
  playstyleGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs },
  playstyleButton: {
    flex: 1,
    minWidth: "40%",
    flexBasis: "45%",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  playstyleIcon: { fontSize: fs.xl, fontWeight: "700", marginBottom: spacing.xxs },
  playstyleLabel: { fontSize: fs.sm, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  adviceSummaryPanel: { marginTop: spacing.sm },
  adviceSummaryTitle: { fontSize: 17, fontWeight: "700", color: Colors.accent, marginBottom: spacing.xs },
  adviceSummaryText: { fontSize: fs.md, color: Colors.text, lineHeight: 18 },
  adviceSlotTitle: { fontSize: fs.md, fontWeight: "700", color: Colors.accent, textTransform: "uppercase", letterSpacing: 0.8, marginTop: spacing.md, marginBottom: spacing.xs },
  adviceItemCard: { marginBottom: spacing.xs },
  adviceItemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  adviceItemInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  adviceItemRank: { fontSize: fs.md, fontWeight: "700", color: Colors.textMuted, width: 28 },
  adviceItemTextCol: { flex: 1 },
  adviceItemName: { fontSize: fs.md, fontWeight: "600", color: Colors.text },
  adviceItemReasoning: { fontSize: fs.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 14 },
  adviceItemScore: { fontSize: fs.lg, fontWeight: "700", fontVariant: ["tabular-nums"], minWidth: 36, textAlign: "right" },
  adviceSkillRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  adviceSkillPoints: { fontSize: fs.md, fontWeight: "700", color: Colors.accent, minWidth: 40, textAlign: "right" },

  // ─── Stash Organizer ────────────────────────────────────────
  stashExpandedPanel: {
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },

  // ─── Error ───────────────────────────────────────────────────
  errorPanel: { marginBottom: spacing.md, borderColor: Colors.red },
  errorText: { fontSize: fs.md, color: Colors.red, textAlign: "center" },
});
