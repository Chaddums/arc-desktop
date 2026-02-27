/**
 * LoadoutScreen — Tab 2: Item/weapon DB, skill tree, damage sim, build compare,
 * loadout assessment, keep/sell advisor, risk score, raid log, build advisor.
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
  CompareColumn,
  KPIBar,
  RiskGauge,
  ProgressBar,
} from "../components";
import { Sparkline } from "../components";
import { useLoadout } from "../hooks/useLoadout";
import { useBuildAdvisor } from "../hooks/useBuildAdvisor";
import { loc } from "../utils/loc";
import type { LoadoutViewMode, MetaForgeItem } from "../types";
import type { PlaystyleGoal, BuildAdvice } from "../hooks/useBuildAdvisor";

const ITEM_CATEGORIES = ["Weapon", "Armor", "Consumable", "Material", "Key"];

// ─── Equipment Slot Grid config ──────────────────────────────────
const EQUIPMENT_SLOTS = [
  { key: "weapon", label: "Weapon", icon: "W" },
  { key: "armor", label: "Armor", icon: "A" },
  { key: "helmet", label: "Helmet", icon: "H" },
  { key: "backpack", label: "Backpack", icon: "B" },
  { key: "gadget", label: "Gadget", icon: "G" },
  { key: "consumable", label: "Consumable", icon: "C" },
] as const;

// ─── Build classification helper ────────────────────────────────
type BuildClass = "DPS" | "Tank" | "Support" | "Hybrid";

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

// ─── Average stat value for an item (Phase 1b: NaN fix) ─────────
function avgStatValue(item: MetaForgeItem): number {
  if (!item.stat_block) return 0;
  const vals = Object.values(item.stat_block)
    .map(v => Number(v))
    .filter((v): v is number => !isNaN(v) && v != null);
  if (vals.length === 0) return 0;
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  return isNaN(avg) ? 0 : Math.round(avg);
}

// ─── Playstyle goal config for build advisor ────────────────────
const PLAYSTYLE_GOALS: { goal: PlaystyleGoal; icon: string; color: string }[] = [
  { goal: "Aggressive", icon: "A", color: Colors.red },
  { goal: "Balanced", icon: "B", color: Colors.accent },
  { goal: "Survival", icon: "S", color: Colors.green },
  { goal: "Farming", icon: "F", color: Colors.amber },
];

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
    // Damage sim
    damageInput,
    setDamageInput,
    damageOutput,
    runDamageSim,
    // Advisor
    advisorResult,
    runAdvisor,
    // Risk score
    riskAssessment,
    riskLoadout,
    setRiskLoadout,
    riskMap,
    setRiskMap,
    calculateRisk,
    // Raid log
    raidEntries,
    raidStats,
    addRaidEntry,
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

  // ─── Local state for equipment slot filter ────────────────────
  const [activeSlot, setActiveSlot] = useState<string | null>(null);

  // ─── Local state for build advisor (default to Balanced) ──────
  const [buildAdvice, setBuildAdvice] = useState<BuildAdvice | null>(() => getAdvice("Balanced"));

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
        if (prev.length >= 2) return [prev[1], id]; // rotate: drop oldest
        return [...prev, id];
      });
    },
    [setCompareItems]
  );

  // ─── Equipment slot grid handler ──────────────────────────────
  const handleSlotPress = useCallback(
    (key: string) => {
      setActiveSlot((prev) => (prev === key ? null : key));
    },
    []
  );

  // ─── Build advisor handler ────────────────────────────────────
  const handlePlaystyleSelect = useCallback(
    (goal: PlaystyleGoal) => {
      const advice = getAdvice(goal);
      setBuildAdvice(advice);
    },
    [getAdvice]
  );

  // Re-compute advice when items/skills load (getAdvice changes)
  useEffect(() => {
    if (buildAdvice?.goal) {
      setBuildAdvice(getAdvice(buildAdvice.goal));
    }
  }, [getAdvice]);

  // ══════════════════════════════════════════════════════════════
  //  ITEM BROWSER
  // ══════════════════════════════════════════════════════════════
  const renderItemBrowser = () => (
    <>
      {/* Upgrade priority KPI bar */}
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

      {/* Equipment slot grid (3x2) */}
      <View style={styles.slotGrid}>
        {EQUIPMENT_SLOTS.map((slot) => {
          const isActive = activeSlot === slot.key;
          return (
            <TouchableOpacity
              key={slot.key}
              style={[styles.slotCell, isActive && styles.slotCellActive]}
              onPress={() => handleSlotPress(slot.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.slotIcon, isActive && styles.slotIconActive]}>
                {slot.icon}
              </Text>
              <Text style={[styles.slotLabel, isActive && styles.slotLabelActive]}>
                {slot.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick nav row — 3 primary tabs */}
      <View style={styles.quickNav}>
        {[
          { label: "Build", subtitle: "Skills + damage simulation", icon: "B", mode: "skillTree" as LoadoutViewMode },
          { label: "Analyze", subtitle: "Compare + risk + advisor", icon: "A", mode: "itemCompare" as LoadoutViewMode },
          { label: "History", subtitle: "Your raid performance", icon: "H", mode: "raidLog" as LoadoutViewMode },
        ].map((item) => (
          <TouchableOpacity
            key={item.mode}
            style={styles.quickNavButton}
            onPress={() => setViewMode(item.mode)}
          >
            <Text style={styles.quickNavIcon}>{item.icon}</Text>
            <Text style={styles.quickNavLabel}>{item.label}</Text>
            <Text style={styles.quickNavSubtitle}>{item.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Build Advisor button */}
      <TouchableOpacity
        style={styles.buildAdvisorButton}
        onPress={() => setViewMode("buildAdvisor")}
        activeOpacity={0.7}
      >
        <Text style={styles.buildAdvisorButtonIcon}>*</Text>
        <Text style={styles.buildAdvisorButtonText}>Build Advisor</Text>
        <Text style={styles.buildAdvisorButtonHint}>Get recommendations for your playstyle</Text>
      </TouchableOpacity>

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
  //  ITEM DETAIL
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

          {/* Build classification tag */}
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
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              runAdvisor(itemDetail.id);
              setViewMode("advisor");
            }}
          >
            <Text style={styles.actionButtonText}>Advisor</Text>
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
  //  ITEM COMPARE
  // ══════════════════════════════════════════════════════════════
  const renderItemCompare = () => {
    // Gather the two compared items
    const comparedItems = compareItems
      .slice(0, 2)
      .map((id: string) => items.find((it) => it.id === id))
      .filter(Boolean) as MetaForgeItem[];

    // Compute winner based on total stat advantage
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

        {/* Item selector from browse list */}
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
            {/* Winner indicator */}
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
              {/* Side-by-side headers */}
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

              {/* Stat-by-stat comparison grid */}
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
  //  SKILL TREE
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
  //  DAMAGE SIM
  // ══════════════════════════════════════════════════════════════
  const renderDamageSim = () => (
    <>
      <BackHeader title="Loadout" onBack={goBack} />
      <Text style={styles.sectionTitle}>Damage Simulator</Text>
      <Panel>
        <Text style={styles.subHeading}>Weapon Stats</Text>
        {[
          { label: "Damage", key: "weaponDamage" as const },
          { label: "Fire Rate", key: "fireRate" as const },
          { label: "Magazine", key: "magazineSize" as const },
          { label: "Reload (s)", key: "reloadTime" as const },
          { label: "Target HP", key: "targetHealth" as const },
        ].map(({ label, key }) => (
          <View key={key} style={styles.simInputRow}>
            <Text style={styles.simLabel}>{label}</Text>
            <TouchableOpacity
              style={styles.simInputBox}
              onPress={() => {
                const current = damageInput[key] ?? 0;
                setDamageInput({ ...damageInput, [key]: current + 1 });
              }}
            >
              <Text style={styles.simInputText}>{damageInput[key] ?? 0}</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.simButton} onPress={runDamageSim}>
          <Text style={styles.simButtonText}>Calculate</Text>
        </TouchableOpacity>
      </Panel>

      {damageOutput && (
        <Panel style={styles.resultCard} variant="glow">
          <Text style={styles.subHeading}>Results</Text>
          <View style={styles.resultGrid}>
            <View style={styles.resultCell}>
              <Text style={styles.resultValue}>{damageOutput.dps.toFixed(1)}</Text>
              <Text style={styles.resultLabel}>DPS</Text>
            </View>
            <View style={styles.resultCell}>
              <Text style={styles.resultValue}>{damageOutput.effectiveDps.toFixed(1)}</Text>
              <Text style={styles.resultLabel}>Effective DPS</Text>
            </View>
            <View style={styles.resultCell}>
              <Text style={styles.resultValue}>
                {damageOutput.ttk != null ? `${damageOutput.ttk.toFixed(1)}s` : "N/A"}
              </Text>
              <Text style={styles.resultLabel}>TTK</Text>
            </View>
            <View style={styles.resultCell}>
              <Text style={styles.resultValue}>{damageOutput.magDumpDamage}</Text>
              <Text style={styles.resultLabel}>Mag Dump</Text>
            </View>
          </View>
        </Panel>
      )}
    </>
  );

  // ══════════════════════════════════════════════════════════════
  //  ADVISOR
  // ══════════════════════════════════════════════════════════════
  const renderAdvisor = () => (
    <>
      <BackHeader title="Items" onBack={goBack} />
      <Text style={styles.sectionTitle}>Keep / Sell / Recycle</Text>
      {!advisorResult ? (
        <EmptyState icon="?" title="No advisor result" hint="Select an item and run advisor" />
      ) : (
        <Panel variant={advisorResult.verdict === "keep" ? "glow" : "default"}>
          <Text style={[styles.verdictText, {
            color: advisorResult.verdict === "keep" ? Colors.verdictKeep
              : advisorResult.verdict === "sell" ? Colors.verdictSell
              : Colors.verdictRecycle,
          }]}>
            {advisorResult.verdict.toUpperCase()}
          </Text>
          <Text style={styles.reasoningText}>{advisorResult.reasoning}</Text>

          <Divider />

          <View style={styles.advisorCompare}>
            <View style={styles.advisorCol}>
              <Text style={styles.advisorColTitle}>Sell</Text>
              <Text style={styles.advisorColValue}>{advisorResult.sellValue} value</Text>
            </View>
            <View style={styles.advisorCol}>
              <Text style={styles.advisorColTitle}>Recycle</Text>
              <Text style={styles.advisorColValue}>~{advisorResult.totalRecycleValue} value</Text>
            </View>
          </View>

          {advisorResult.recycleYields.length > 0 && (
            <>
              <Divider />
              <Text style={styles.subHeading}>Recycle Yields</Text>
              {advisorResult.recycleYields.map((y, i) => (
                <Text key={i} style={styles.yieldText}>
                  {y.itemName} x{y.quantity} (~{y.estimatedValue} value)
                </Text>
              ))}
            </>
          )}

          {advisorResult.craftingUses.length > 0 && (
            <>
              <Divider />
              <Text style={styles.subHeading}>Used In Crafting</Text>
              {advisorResult.craftingUses.map((use, i) => (
                <Text key={i} style={styles.yieldText}>{"\u2022"} {use}</Text>
              ))}
            </>
          )}
        </Panel>
      )}
    </>
  );

  // ══════════════════════════════════════════════════════════════
  //  RISK SCORE (Phase 5e: Beta label + disclaimer)
  // ══════════════════════════════════════════════════════════════
  const renderRiskScore = () => (
    <>
      <BackHeader title="Loadout" onBack={goBack} />
      <Text style={styles.sectionTitle}>Pre-Raid Risk Assessment (Beta)</Text>
      <Panel>
        <Text style={styles.subHeading}>Select Map</Text>
        <FilterPills
          options={["Dam", "Spaceport", "Buried City", "Blue Gate", "Stella Montis"]}
          selected={riskMap}
          onSelect={setRiskMap}
          allLabel="Any"
        />

        <TouchableOpacity style={styles.simButton} onPress={calculateRisk}>
          <Text style={styles.simButtonText}>Assess Risk</Text>
        </TouchableOpacity>
      </Panel>

      {riskAssessment && (
        <Panel variant="glow" style={styles.riskPanel}>
          <View style={styles.riskCenter}>
            <RiskGauge score={riskAssessment.score} />
          </View>

          <Divider />

          <Text style={styles.subHeading}>Factors</Text>
          {riskAssessment.factors.map((f, i) => (
            <View key={i} style={styles.factorRow}>
              <Text style={styles.factorLabel}>{f.label}</Text>
              <Text style={[styles.factorImpact, {
                color: f.impact > 0 ? Colors.riskHigh : f.impact < 0 ? Colors.riskLow : Colors.diffNeutral
              }]}>
                {f.impact > 0 ? "+" : ""}{f.impact}
              </Text>
            </View>
          ))}

          <Divider />
          <Text style={styles.recommendText}>{riskAssessment.recommendation}</Text>
          <Text style={styles.disclaimerText}>Estimates based on available data</Text>
        </Panel>
      )}
    </>
  );

  // ══════════════════════════════════════════════════════════════
  //  RAID LOG
  // ══════════════════════════════════════════════════════════════
  const renderRaidLog = () => {
    const totalRaids = raidEntries.length;
    const extractions = raidEntries.filter((r) => r.outcome === "extracted").length;
    const successRate = totalRaids > 0 ? Math.round((extractions / totalRaids) * 100) : 0;
    const avgLoot = totalRaids > 0
      ? Math.round(raidEntries.reduce((sum, r) => sum + (r.lootValue ?? 0), 0) / totalRaids)
      : 0;

    return (
      <>
        <BackHeader title="Loadout" onBack={goBack} />
        <Text style={styles.sectionTitle}>Raid Log</Text>

        <KPIBar
          cells={[
            { label: "Total Raids", value: String(totalRaids) },
            { label: "Extract Rate", value: `${successRate}%`, color: successRate >= 50 ? Colors.green : Colors.red },
            { label: "Avg Loot", value: String(avgLoot) },
          ]}
        />

        <TouchableOpacity style={styles.addButton} onPress={addRaidEntry}>
          <Text style={styles.addButtonText}>+ Log Raid</Text>
        </TouchableOpacity>

        {raidEntries.length === 0 ? (
          <EmptyState
            icon="?"
            title="No raids logged"
            hint="Log your raids to build personal stats"
          />
        ) : (
          <>
            <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Recent Raids</Text>
            {raidEntries.slice(0, 20).map((entry) => (
              <Panel key={entry.id} style={styles.raidCard}>
                <View style={styles.raidRow}>
                  <View style={styles.raidInfo}>
                    <Text style={styles.raidMap}>{entry.mapId}</Text>
                    <Text style={styles.raidDate}>
                      {new Date(entry.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[styles.raidOutcome, {
                    color: entry.outcome === "extracted" ? Colors.green
                      : entry.outcome === "died" ? Colors.red
                      : Colors.amber,
                  }]}>
                    {entry.outcome === "extracted" ? "EXTRACTED"
                      : entry.outcome === "died" ? "DIED"
                      : "PARTIAL"}
                  </Text>
                </View>
                {entry.lootValue != null && (
                  <Text style={styles.raidLoot}>Loot: {entry.lootValue} value</Text>
                )}
              </Panel>
            ))}

            {raidStats.length > 0 && (
              <>
                <Divider />
                <Text style={styles.subHeading}>Loadout Performance</Text>
                {raidStats.map((stat) => (
                  <Panel key={stat.loadoutKey} style={styles.statCard}>
                    <Text style={styles.statLoadout}>{stat.items.join(" + ")}</Text>
                    <View style={styles.statRow}>
                      <Text style={styles.statText}>
                        {stat.extractions}/{stat.totalRaids} ({Math.round(stat.successRate * 100)}%)
                      </Text>
                      <Text style={styles.statLoot}>Avg: {Math.round(stat.avgLootValue)}</Text>
                    </View>
                    <ProgressBar progress={stat.successRate} />
                  </Panel>
                ))}
              </>
            )}
          </>
        )}
      </>
    );
  };

  // ══════════════════════════════════════════════════════════════
  //  BUILD ADVISOR (Phase 5d)
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
          {/* Summary */}
          <Panel variant="glow" style={styles.adviceSummaryPanel}>
            <Text style={styles.adviceSummaryTitle}>{buildAdvice.goal} Build</Text>
            <Text style={styles.adviceSummaryText}>{buildAdvice.summary}</Text>
          </Panel>

          {/* Recommended items by category */}
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

          {/* Skill recommendations */}
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

          {/* Beta disclaimer */}
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

        {viewMode === "itemBrowser" && renderItemBrowser()}
        {viewMode === "itemDetail" && renderItemDetail()}
        {viewMode === "itemCompare" && renderItemCompare()}
        {viewMode === "skillTree" && renderSkillTree()}
        {viewMode === "skillDetail" && renderSkillDetail()}
        {viewMode === "damageSim" && renderDamageSim()}
        {viewMode === "advisor" && renderAdvisor()}
        {viewMode === "riskScore" && renderRiskScore()}
        {viewMode === "raidLog" && renderRaidLog()}
        {viewMode === "buildAdvisor" && renderBuildAdvisor()}
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
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
  sectionTitle: { fontSize: fs.md, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.xs },
  subHeading: { fontSize: fs.sm, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: spacing.xs },

  // ─── KPI gap ─────────────────────────────────────────────────
  kpiGap: { height: spacing.sm },

  // ─── Equipment slot grid ─────────────────────────────────────
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
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
  },
  slotCellActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentBg,
  },
  slotIcon: {
    fontSize: fs.lg,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  slotIconActive: {
    color: Colors.accent,
  },
  slotLabel: {
    fontSize: fs.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  slotLabelActive: {
    color: Colors.accent,
  },

  // ─── Quick nav ───────────────────────────────────────────────
  quickNav: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm, marginBottom: spacing.xs },
  quickNavButton: { flex: 1, alignItems: "center", backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  quickNavIcon: { fontSize: fs.lg, fontWeight: "700", color: Colors.accent, marginBottom: spacing.xxs },
  quickNavLabel: { fontSize: 8, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.4 },
  quickNavSubtitle: { fontSize: 7, color: Colors.textMuted, textAlign: "center", marginTop: 2 },

  // ─── Build Advisor button ────────────────────────────────────
  buildAdvisorButton: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
    borderRadius: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    alignItems: "center",
  },
  buildAdvisorButtonIcon: {
    fontSize: fs.lg,
    fontWeight: "700",
    color: Colors.accent,
    marginBottom: spacing.xxs,
  },
  buildAdvisorButtonText: {
    fontSize: fs.md,
    fontWeight: "700",
    color: Colors.accent,
  },
  buildAdvisorButtonHint: {
    fontSize: fs.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },

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
  buildTagRow: {
    flexDirection: "row",
    marginTop: spacing.sm,
  },
  buildTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 4,
    borderWidth: 1,
  },
  buildTagText: {
    fontSize: fs.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ─── Stat bar with quality label ─────────────────────────────
  statBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statBarFlex: {
    flex: 1,
  },
  statQualityLabel: {
    fontSize: fs.xs,
    fontWeight: "700",
    width: 56,
    textAlign: "right",
  },

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
  comparePickerItemActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentBg,
  },
  comparePickerName: {
    fontSize: fs.xs,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  comparePickerNameActive: {
    color: Colors.accent,
  },
  comparePickerRarity: {
    fontSize: 8,
    fontWeight: "700",
    marginTop: 1,
  },
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
  winnerText: {
    fontSize: fs.md,
    fontWeight: "700",
    color: Colors.green,
  },
  winnerTextTie: {
    fontSize: fs.md,
    fontWeight: "700",
    color: Colors.amber,
  },
  compareColHeader: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  compareColName: {
    fontSize: fs.md,
    fontWeight: "700",
    textAlign: "center",
  },
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
  compareStatLabel: {
    fontSize: fs.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    textAlign: "center",
    flex: 1,
  },
  compareStatValue: {
    fontSize: fs.md,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    width: 50,
    textAlign: "center",
  },
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

  // ─── Damage sim ──────────────────────────────────────────────
  simInputRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  simLabel: { fontSize: fs.md, color: Colors.textSecondary },
  simInputBox: { backgroundColor: Colors.input, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 16, paddingVertical: spacing.sm },
  simInputText: { fontSize: fs.lg, fontWeight: "700", fontVariant: ["tabular-nums"], color: Colors.text },
  simButton: { backgroundColor: Colors.accentBg, borderWidth: 1, borderColor: Colors.accent, borderRadius: 6, padding: spacing.sm, alignItems: "center", marginTop: spacing.sm },
  simButtonText: { fontSize: fs.lg, fontWeight: "700", color: Colors.accent },
  resultCard: { marginTop: spacing.sm },
  resultGrid: { flexDirection: "row", flexWrap: "wrap" },
  resultCell: { width: "50%", alignItems: "center", paddingVertical: spacing.sm },
  resultValue: { fontSize: fs.xl, fontWeight: "700", fontVariant: ["tabular-nums"], color: Colors.accent },
  resultLabel: { fontSize: fs.xs, fontWeight: "600", color: Colors.textSecondary, textTransform: "uppercase", marginTop: spacing.xxs },

  // ─── Advisor ─────────────────────────────────────────────────
  verdictText: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  reasoningText: { fontSize: fs.md, color: Colors.text, textAlign: "center", marginTop: spacing.sm, lineHeight: 18 },
  advisorCompare: { flexDirection: "row" },
  advisorCol: { flex: 1, alignItems: "center", paddingVertical: spacing.sm },
  advisorColTitle: { fontSize: fs.sm, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase" },
  advisorColValue: { fontSize: 16, fontWeight: "700", color: Colors.text, marginTop: spacing.xs },
  yieldText: { fontSize: fs.md, color: Colors.text, marginBottom: spacing.xs },

  // ─── Risk score ──────────────────────────────────────────────
  riskPanel: { marginTop: spacing.sm },
  riskCenter: { alignItems: "center", paddingVertical: spacing.sm },
  factorRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: Colors.border },
  factorLabel: { fontSize: fs.md, color: Colors.text },
  factorImpact: { fontSize: fs.md, fontWeight: "700", fontVariant: ["tabular-nums"] },
  recommendText: { fontSize: fs.md, color: Colors.accent, textAlign: "center", fontWeight: "600" },
  disclaimerText: { fontSize: fs.xs, color: Colors.textMuted, textAlign: "center", marginTop: spacing.sm, fontStyle: "italic" },

  // ─── Raid log ────────────────────────────────────────────────
  addButton: { backgroundColor: Colors.accentBg, borderWidth: 1, borderColor: Colors.accent, borderRadius: 6, padding: spacing.sm, alignItems: "center", marginTop: spacing.sm, marginBottom: spacing.sm },
  addButtonText: { fontSize: fs.lg, fontWeight: "700", color: Colors.accent },
  raidCard: { marginBottom: spacing.sm },
  raidRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  raidInfo: { flex: 1 },
  raidMap: { fontSize: fs.lg, fontWeight: "600", color: Colors.text },
  raidDate: { fontSize: fs.sm, color: Colors.textSecondary, marginTop: spacing.xxs },
  raidOutcome: { fontSize: fs.md, fontWeight: "700" },
  raidLoot: { fontSize: fs.sm, color: Colors.accent, marginTop: spacing.xs },
  statCard: { marginBottom: spacing.sm },
  statLoadout: { fontSize: fs.md, fontWeight: "600", color: Colors.text, marginBottom: spacing.xs },
  statRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  statText: { fontSize: fs.md, color: Colors.textSecondary },
  statLoot: { fontSize: fs.md, color: Colors.accent },

  // ─── Build Advisor ───────────────────────────────────────────
  playstyleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
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
  playstyleIcon: {
    fontSize: fs.xl,
    fontWeight: "700",
    marginBottom: spacing.xxs,
  },
  playstyleLabel: {
    fontSize: fs.sm,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  adviceSummaryPanel: {
    marginTop: spacing.sm,
  },
  adviceSummaryTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.accent,
    marginBottom: spacing.xs,
  },
  adviceSummaryText: {
    fontSize: fs.md,
    color: Colors.text,
    lineHeight: 18,
  },
  adviceSlotTitle: {
    fontSize: fs.md,
    fontWeight: "700",
    color: Colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  adviceItemCard: {
    marginBottom: spacing.xs,
  },
  adviceItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  adviceItemInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  adviceItemRank: {
    fontSize: fs.md,
    fontWeight: "700",
    color: Colors.textMuted,
    width: 28,
  },
  adviceItemTextCol: {
    flex: 1,
  },
  adviceItemName: {
    fontSize: fs.md,
    fontWeight: "600",
    color: Colors.text,
  },
  adviceItemReasoning: {
    fontSize: fs.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 14,
  },
  adviceItemScore: {
    fontSize: fs.lg,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    minWidth: 36,
    textAlign: "right",
  },
  adviceSkillRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  adviceSkillPoints: {
    fontSize: fs.md,
    fontWeight: "700",
    color: Colors.accent,
    minWidth: 40,
    textAlign: "right",
  },

  // ─── Error ───────────────────────────────────────────────────
  errorPanel: { marginBottom: spacing.md, borderColor: Colors.red },
  errorText: { fontSize: fs.md, color: Colors.red, textAlign: "center" },
});
