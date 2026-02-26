/**
 * LoadoutScreen — Tab 2: Item/weapon DB, skill tree, damage sim, build compare,
 * loadout assessment, keep/sell advisor, risk score, raid log.
 */

import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, rarityColors } from "../theme";
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
import { loc } from "../utils/loc";
import type { LoadoutViewMode } from "../types";

const ITEM_CATEGORIES = ["Weapon", "Armor", "Consumable", "Material", "Key"];

export default function LoadoutScreen() {
  const insets = useSafeAreaInsets();
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

  const filteredItems = useMemo(() => {
    let list = items;
    if (selectedCategory) {
      list = list.filter((item) =>
        item.item_type?.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }
    if (itemSearch) {
      const q = itemSearch.toLowerCase();
      list = list.filter((item) => item.name.toLowerCase().includes(q));
    }
    return list;
  }, [items, selectedCategory, itemSearch]);

  const renderItemBrowser = () => (
    <>
      <SearchBar value={itemSearch} onChangeText={setItemSearch} placeholder="Search items..." />
      <FilterPills
        options={ITEM_CATEGORIES}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        allLabel="All Items"
      />

      {/* Quick nav row */}
      <View style={styles.quickNav}>
        {[
          { label: "Skills", icon: "🧠", mode: "skillTree" as LoadoutViewMode },
          { label: "Damage", icon: "💥", mode: "damageSim" as LoadoutViewMode },
          { label: "Risk", icon: "⚠", mode: "riskScore" as LoadoutViewMode },
          { label: "Raid Log", icon: "📊", mode: "raidLog" as LoadoutViewMode },
        ].map((item) => (
          <TouchableOpacity
            key={item.mode}
            style={styles.quickNavButton}
            onPress={() => setViewMode(item.mode)}
          >
            <Text style={styles.quickNavIcon}>{item.icon}</Text>
            <Text style={styles.quickNavLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.listPad}>
        {filteredItems.length === 0 ? (
          <EmptyState icon="🔍" title="No items found" hint={loading ? "Loading..." : "Try a different search"} />
        ) : (
          filteredItems.map((item) => (
            <ItemRow
              key={item.id}
              name={item.name}
              subtitle={item.item_type}
              rarity={item.rarity}
              rightText={item.value != null ? String(item.value) : undefined}
              onPress={() => {
                setSelectedItem(item.id);
                setViewMode("itemDetail");
              }}
            />
          ))
        )}
      </View>
    </>
  );

  const renderItemDetail = () => {
    if (!itemDetail) return <EmptyState title="Item not found" />;
    const stats = itemDetail.stat_block;

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
              {Object.entries(stats).map(([key, val]) =>
                val != null ? (
                  <StatBar key={key} label={key} value={val} maxValue={100} />
                ) : null
              )}
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

  const renderItemCompare = () => (
    <>
      <BackHeader title="Items" onBack={goBack} />
      <Text style={styles.sectionTitle}>Item Comparison</Text>
      {compareItems.length < 2 ? (
        <Panel>
          <Text style={styles.hintText}>
            Select a second item to compare. Go back to browse items.
          </Text>
        </Panel>
      ) : (
        <Panel>
          <View style={styles.compareRow}>
            {compareItems.slice(0, 2).map((id, i) => {
              const item = items.find((it) => it.id === id);
              if (!item) return null;
              const stats = item.stat_block
                ? Object.entries(item.stat_block)
                    .filter(([, v]) => v != null)
                    .map(([k, v]) => ({ label: k, value: v as number }))
                : [];
              return (
                <CompareColumn
                  key={id}
                  name={item.name}
                  stats={stats}
                  color={i === 0 ? Colors.accent : Colors.amber}
                />
              );
            })}
          </View>
        </Panel>
      )}
    </>
  );

  const renderSkillTree = () => (
    <>
      <BackHeader title="Loadout" onBack={goBack} />
      <Text style={styles.sectionTitle}>Skill Tree</Text>
      {skillNodes.length === 0 ? (
        <EmptyState icon="🧠" title="No skill data" hint="Pull to refresh" />
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
                              {node.isMajor ? "★ " : ""}{loc(node.name)}
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
            {node.isMajor ? "★ " : ""}{loc(node.name)}
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

  const renderAdvisor = () => (
    <>
      <BackHeader title="Items" onBack={goBack} />
      <Text style={styles.sectionTitle}>Keep / Sell / Recycle</Text>
      {!advisorResult ? (
        <EmptyState icon="🤔" title="No advisor result" hint="Select an item and run advisor" />
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
                  {y.itemName} ×{y.quantity} (~{y.estimatedValue} value)
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

  const renderRiskScore = () => (
    <>
      <BackHeader title="Loadout" onBack={goBack} />
      <Text style={styles.sectionTitle}>Pre-Raid Risk Assessment</Text>
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
        </Panel>
      )}
    </>
  );

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
            icon="📊"
            title="No raids logged"
            hint="Log your raids to build personal stats"
          />
        ) : (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Recent Raids</Text>
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.header}>Loadout</Text>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.accent} />
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 6 },
  subHeading: { fontSize: 12, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  quickNav: { flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 6 },
  quickNavButton: { flex: 1, alignItems: "center", backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingVertical: 10 },
  quickNavIcon: { fontSize: 18, marginBottom: 2 },
  quickNavLabel: { fontSize: 9, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.4 },
  listPad: { paddingTop: 8 },
  detailTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  detailSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  detailCell: { minWidth: "40%" },
  detailLabel: { fontSize: 10, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  detailValue: { fontSize: 15, fontWeight: "700", color: Colors.text, marginTop: 2 },
  metaRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  rarityBadge: { fontSize: 12, fontWeight: "700" },
  typeBadge: { fontSize: 12, color: Colors.textSecondary },
  valueBadge: { fontSize: 12, color: Colors.accent },
  descText: { fontSize: 13, color: Colors.text, lineHeight: 18 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  actionButton: { flex: 1, backgroundColor: "rgba(0, 180, 216, 0.15)", borderWidth: 1, borderColor: Colors.accent, borderRadius: 8, padding: 10, alignItems: "center" },
  actionButtonText: { fontSize: 13, fontWeight: "700", color: Colors.accent },
  compareRow: { flexDirection: "row" },
  hintText: { fontSize: 13, color: Colors.textMuted, textAlign: "center", paddingVertical: 8 },
  categoryTitle: { fontSize: 13, fontWeight: "700", color: Colors.accent, marginTop: 8, marginBottom: 4 },
  skillCard: { marginBottom: 8 },
  skillCardMajor: { borderColor: Colors.accent },
  skillRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  skillInfo: { flex: 1 },
  skillName: { fontSize: 14, fontWeight: "600", color: Colors.text },
  skillAlloc: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  skillActions: { flexDirection: "row", gap: 8 },
  skillBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: Colors.borderAccent, alignItems: "center", justifyContent: "center" },
  skillBtnText: { fontSize: 16, fontWeight: "700", color: Colors.accent },
  prereqText: { fontSize: 13, color: Colors.text, marginBottom: 4, lineHeight: 18 },
  simInputRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  simLabel: { fontSize: 13, color: Colors.textSecondary },
  simInputBox: { backgroundColor: Colors.input, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 16, paddingVertical: 6 },
  simInputText: { fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"], color: Colors.text },
  simButton: { backgroundColor: "rgba(0, 180, 216, 0.15)", borderWidth: 1, borderColor: Colors.accent, borderRadius: 8, padding: 10, alignItems: "center", marginTop: 8 },
  simButtonText: { fontSize: 14, fontWeight: "700", color: Colors.accent },
  resultCard: { marginTop: 8 },
  resultGrid: { flexDirection: "row", flexWrap: "wrap" },
  resultCell: { width: "50%", alignItems: "center", paddingVertical: 8 },
  resultValue: { fontSize: 20, fontWeight: "700", fontVariant: ["tabular-nums"], color: Colors.accent },
  resultLabel: { fontSize: 10, fontWeight: "600", color: Colors.textSecondary, textTransform: "uppercase", marginTop: 2 },
  verdictText: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  reasoningText: { fontSize: 13, color: Colors.text, textAlign: "center", marginTop: 8, lineHeight: 18 },
  advisorCompare: { flexDirection: "row" },
  advisorCol: { flex: 1, alignItems: "center", paddingVertical: 8 },
  advisorColTitle: { fontSize: 11, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase" },
  advisorColValue: { fontSize: 16, fontWeight: "700", color: Colors.text, marginTop: 4 },
  yieldText: { fontSize: 13, color: Colors.text, marginBottom: 4 },
  riskPanel: { marginTop: 8 },
  riskCenter: { alignItems: "center", paddingVertical: 8 },
  factorRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  factorLabel: { fontSize: 13, color: Colors.text },
  factorImpact: { fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] },
  recommendText: { fontSize: 13, color: Colors.accent, textAlign: "center", fontWeight: "600" },
  addButton: { backgroundColor: "rgba(0, 180, 216, 0.15)", borderWidth: 1, borderColor: Colors.accent, borderRadius: 8, padding: 10, alignItems: "center", marginTop: 8, marginBottom: 6 },
  addButtonText: { fontSize: 14, fontWeight: "700", color: Colors.accent },
  raidCard: { marginBottom: 8 },
  raidRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  raidInfo: { flex: 1 },
  raidMap: { fontSize: 14, fontWeight: "600", color: Colors.text },
  raidDate: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  raidOutcome: { fontSize: 12, fontWeight: "700" },
  raidLoot: { fontSize: 11, color: Colors.accent, marginTop: 4 },
  statCard: { marginBottom: 8 },
  statLoadout: { fontSize: 13, fontWeight: "600", color: Colors.text, marginBottom: 4 },
  statRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  statText: { fontSize: 12, color: Colors.textSecondary },
  statLoot: { fontSize: 12, color: Colors.accent },
  errorPanel: { marginBottom: 10, borderColor: Colors.red },
  errorText: { fontSize: 13, color: Colors.red, textAlign: "center" },
});
