/**
 * MissionsScreen — Tab 4: Quest tracker, hideout/station planner, shopping list, daily optimizer.
 * Absorbs QuestsScreen + CraftingScreen.
 *
 * P1 Upgrades:
 *  1. Quest chain progress visualization (vertical connector bar, green/pending, progress %)
 *  2. Shopping list KPIBar (unique materials, total qty, est. cost) + prominent MaterialRow
 *  3. Daily optimizer priority sorting + priority badges + estimated effort
 *  4. Trader list KPIBar (total quests, completed, completion %)
 *  5. Striped rows on quest chains and station tiers
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, spacing, fontSize as fs, threatColors } from "../theme";
import { useColors } from "../theme/ThemeContext";
import {
  Panel,
  Divider,
  QuestCard,
  MaterialRow,
  BackHeader,
  EmptyState,
  ProgressBar,
  KPIBar,
  StatusBadge,
} from "../components";
import { useMissions } from "../hooks/useMissions";
import { useCompletedQuests } from "../hooks/useCompletedQuests";
import { useLoadoutChecklist } from "../hooks/useLoadoutChecklist";
import { useQuestPairing } from "../hooks/useQuestPairing";
import type { QuestPairing } from "../hooks/useQuestPairing";
import { loc } from "../utils/loc";
import type { MissionsViewMode } from "../types";

const TRADERS = ["Apollo", "Celeste", "Lance", "Shani", "Tian Wen"];

const STATION_ICONS: Record<string, string> = {
  weapon_bench: "\uD83D\uDD2B",
  equipment_bench: "\uD83D\uDEE1",
  explosives_bench: "\uD83D\uDCA3",
  med_station: "\uD83D\uDC8A",
  refiner: "\u2699",
  scrappy: "\uD83D\uDD27",
  stash: "\uD83D\uDCE6",
  utility_bench: "\uD83D\uDD28",
  workbench: "\uD83E\uDE9B",
};

/** Priority mapping for daily optimizer sorting. */
const PRIORITY_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const PRIORITY_COLORS: Record<string, string> = {
  high: Colors.red,
  medium: Colors.amber,
  low: Colors.green,
};

export default function MissionsScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const {
    viewMode,
    setViewMode,
    // Quests
    questsByTrader,
    questChain,
    questDetail,
    selectedTrader,
    selectedQuestId,
    goToTrader,
    goToQuest,
    // Crafting
    stations,
    selectedStation,
    selectedLevel,
    shoppingList,
    selectedCrafts,
    goToStation,
    goToLevel,
    goToShoppingList,
    toggleCraft,
    // Daily optimizer
    dailyRecommendations,
    activeEvents,
    // Common
    loading,
    error,
    goBack,
    refresh,
  } = useMissions();

  const { completedIds, markComplete, markIncomplete } = useCompletedQuests();
  const { addItem: addToChecklist } = useLoadoutChecklist();
  const { pairings } = useQuestPairing(questsByTrader, completedIds);

  // Phase 7c: Daily plan checked state
  const [dailyChecked, setDailyChecked] = useState<Set<number>>(new Set());

  // ── P1-4: Trader list KPI aggregates ──────────────────────────

  const traderKpi = useMemo(() => {
    let totalQuests = 0;
    let totalCompleted = 0;
    TRADERS.forEach((trader) => {
      const quests = questsByTrader[trader] || [];
      totalQuests += quests.length;
      totalCompleted += quests.filter((q) => completedIds.has(q.id)).length;
    });
    const pct = totalQuests > 0 ? Math.round((totalCompleted / totalQuests) * 100) : 0;
    return { totalQuests, totalCompleted, pct };
  }, [questsByTrader, completedIds]);

  // ── P1-1: Quest chain progress percentage ─────────────────────

  const chainProgress = useMemo(() => {
    if (questChain.length === 0) return 0;
    const done = questChain.filter((q) => completedIds.has(q.id)).length;
    return Math.round((done / questChain.length) * 100);
  }, [questChain, completedIds]);

  // ── P1-2: Shopping list KPI aggregates ────────────────────────

  const shoppingKpi = useMemo(() => {
    const uniqueMats = shoppingList.length;
    const totalQty = shoppingList.reduce((s, m) => s + m.quantity, 0);
    // Estimated cost: sum (quantity * estimated unit value) — fall back to 0 if no value
    const estCost = shoppingList.reduce(
      (s, m) => s + m.quantity * ((m as any).estimatedUnitValue ?? 0),
      0,
    );
    return { uniqueMats, totalQty, estCost };
  }, [shoppingList]);

  // ── P1-3: Sorted daily recommendations ────────────────────────

  const sortedRecommendations = useMemo(() => {
    return [...dailyRecommendations].sort((a, b) => {
      const pa = PRIORITY_ORDER[(a as any).priority ?? "low"] ?? 2;
      const pb = PRIORITY_ORDER[(b as any).priority ?? "low"] ?? 2;
      return pa - pb;
    });
  }, [dailyRecommendations]);

  // ── View Renderers ────────────────────────────────────────────

  const renderTraderList = () => (
    <>
      {/* P1-4: KPIBar at top of trader list */}
      <KPIBar
        cells={[
          { label: "Total Quests", value: String(traderKpi.totalQuests) },
          { label: "Completed", value: String(traderKpi.totalCompleted), color: C.green },
          { label: "Progress", value: `${traderKpi.pct}%`, color: C.accent },
        ]}
      />

      {/* Phase 7a: Manual tracking explanation banner */}
      <Panel style={styles.card}>
        <Text style={[styles.bannerText, { color: C.textSecondary }]}>
          Mark your progress manually using the checkboxes on each quest. Your progress is saved locally.
        </Text>
      </Panel>

      <Text style={[styles.sectionTitle, { marginTop: spacing.md, color: C.textSecondary }]}>Quest Chains</Text>
      {TRADERS.map((trader) => {
        const quests = questsByTrader[trader] || [];
        const completed = quests.filter((q) => completedIds.has(q.id)).length;
        const total = quests.length;
        const progress = total > 0 ? completed / total : 0;

        return (
          <TouchableOpacity
            key={trader}
            onPress={() => goToTrader(trader)}
            activeOpacity={0.7}
          >
            <Panel style={styles.card}>
              <View style={styles.traderRow}>
                <View style={styles.traderInfo}>
                  <Text style={[styles.traderName, { color: C.text }]}>{trader}</Text>
                  <Text style={[styles.traderCount, { color: C.textSecondary }]}>{completed}/{total} quests</Text>
                </View>
                <Text style={[styles.chevron, { color: C.textMuted }]}>&#x203A;</Text>
              </View>
              <ProgressBar progress={progress} />
            </Panel>
          </TouchableOpacity>
        );
      })}

      <Divider />

      {/* Phase 7b: Efficient Raid Plans */}
      {pairings.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Efficient Raid Plans</Text>
          {pairings.slice(0, 5).map((pairing, i) => (
            <Panel key={i} style={styles.card}>
              <Text style={[styles.pairingMap, { color: C.accent }]}>Run {pairing.map}</Text>
              <Text style={[styles.pairingReason, { color: C.textSecondary }]}>{pairing.reasoning}</Text>
              {pairing.quests.map((q, j) => (
                <Text key={j} style={[styles.pairingQuest, { color: C.text }]}>
                  {"\u2022"} {q.questName} ({q.trader})
                </Text>
              ))}
            </Panel>
          ))}
        </>
      )}

      {/* Quick nav to other views */}
      <View style={styles.quickNav}>
        <TouchableOpacity
          style={styles.quickNavButton}
          onPress={() => setViewMode("hideoutOverview")}
        >
          <Text style={styles.quickNavIcon}>{"\uD83C\uDFD7"}</Text>
          <Text style={[styles.quickNavLabel, { color: C.textSecondary }]}>Hideout</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickNavButton}
          onPress={() => setViewMode("dailyOptimizer")}
        >
          <Text style={styles.quickNavIcon}>{"\uD83D\uDCCB"}</Text>
          <Text style={[styles.quickNavLabel, { color: C.textSecondary }]}>Daily Plan</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // ── P1-1: Quest chain with connected vertical bar + progress badge ─

  const renderQuestChain = () => (
    <>
      <BackHeader title="Traders" onBack={goBack} />

      {/* Header row: trader name + progress badge */}
      <View style={styles.chainHeaderRow}>
        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>{selectedTrader}</Text>
        {questChain.length > 0 && (
          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>{chainProgress}%</Text>
          </View>
        )}
      </View>

      {questChain.length > 0 && (
        <ProgressBar
          progress={chainProgress / 100}
          color={chainProgress === 100 ? C.green : C.accent}
          height={4}
        />
      )}

      <View style={styles.chainSpacer} />

      {questChain.length === 0 ? (
        <EmptyState title="No quests found for this trader" />
      ) : (
        questChain.map((quest, idx) => {
          const isDone = completedIds.has(quest.id);
          const isLast = idx === questChain.length - 1;
          const connectorColor = isDone ? C.green : C.border;

          return (
            <View
              key={quest.id}
              style={[
                styles.chainNodeWrap,
                // P1-5: Striped rows on quest chain
                idx % 2 === 1 && styles.rowAlt,
              ]}
            >
              {/* P1-1: Vertical connector line on left */}
              <View style={styles.connectorColumn}>
                {/* Top segment (not rendered for first item) */}
                <View
                  style={[
                    styles.connectorSegment,
                    { backgroundColor: idx === 0 ? "transparent" : connectorColor },
                  ]}
                />
                {/* Node dot */}
                <View
                  style={[
                    styles.connectorDot,
                    { backgroundColor: isDone ? C.green : C.borderAccent },
                    isDone && styles.connectorDotDone,
                  ]}
                />
                {/* Bottom segment (not rendered for last item) */}
                <View
                  style={[
                    styles.connectorSegment,
                    { backgroundColor: isLast ? "transparent" : connectorColor },
                  ]}
                />
              </View>

              {/* Quest card */}
              <View style={styles.chainCardWrap}>
                <QuestCard
                  name={loc(quest.name) || quest.id}
                  trader={selectedTrader ?? undefined}
                  xp={quest.xp}
                  isCompleted={isDone}
                  onToggle={() =>
                    isDone ? markIncomplete(quest.id) : markComplete(quest.id)
                  }
                  onPress={() => goToQuest(quest.id)}
                />
              </View>
            </View>
          );
        })
      )}
    </>
  );

  const renderQuestDetail = () => {
    if (!questDetail) return null;
    return (
      <>
        <BackHeader title={selectedTrader ?? "Quests"} onBack={goBack} />
        <Panel>
          <Text style={[styles.questTitle, { color: C.text }]}>{loc(questDetail.name) || questDetail.id}</Text>
          {questDetail.xp != null && questDetail.xp > 0 && (
            <Text style={[styles.questXp, { color: C.accent }]}>{questDetail.xp.toLocaleString()} XP</Text>
          )}
          {questDetail.objectives && questDetail.objectives.length > 0 && (
            <>
              <Divider />
              <Text style={[styles.subHeading, { color: C.textSecondary }]}>Objectives</Text>
              {questDetail.objectives.map((obj, i) => (
                <Text key={i} style={[styles.objectiveText, { color: C.text }]}>
                  {"\u2022"} {loc(obj)}
                </Text>
              ))}
            </>
          )}
        </Panel>
      </>
    );
  };

  const renderHideoutOverview = () => (
    <>
      <BackHeader title="Missions" onBack={goBack} />
      <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Crafting Stations</Text>
      <View style={styles.stationGrid}>
        {stations.map((station) => (
          <TouchableOpacity
            key={station.id}
            style={styles.stationCell}
            onPress={() => goToStation(station.id)}
            activeOpacity={0.7}
          >
            <Panel style={styles.stationPanel}>
              <Text style={styles.stationIcon}>{STATION_ICONS[station.id] || "\uD83C\uDFD7"}</Text>
              <Text style={[styles.stationName, { color: C.text }]} numberOfLines={2}>
                {loc(station.name) || station.id}
              </Text>
              <Text style={[styles.stationLevels, { color: C.textSecondary }]}>
                {(station.levels || []).length} tiers
              </Text>
            </Panel>
          </TouchableOpacity>
        ))}
      </View>

      {selectedCrafts.length > 0 && (
        <>
          <Divider />
          <TouchableOpacity style={styles.shoppingButton} onPress={goToShoppingList}>
            <Text style={[styles.shoppingButtonText, { color: C.accent }]}>
              View Shopping List ({selectedCrafts.length} selected)
            </Text>
          </TouchableOpacity>
        </>
      )}
    </>
  );

  // ── P1-5: Station detail with striped tier rows ───────────────

  const renderStationDetail = () => {
    if (!selectedStation) return null;
    const station = stations.find((s) => s.id === selectedStation);
    if (!station) return null;

    return (
      <>
        <BackHeader title="Hideout" onBack={goBack} />
        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>{loc(station.name) || station.id}</Text>

        {(station.levels || []).map((level, idx) => {
          const isSelected = selectedCrafts.some(
            (c) => c.stationId === station.id && c.targetLevel >= level.level
          );
          return (
            <TouchableOpacity
              key={level.level}
              onPress={() => goToLevel(station.id, level.level)}
              activeOpacity={0.7}
            >
              <Panel
                style={{
                  ...styles.tierCard,
                  ...(isSelected ? { borderColor: C.accent } : undefined),
                  ...(idx % 2 === 1 ? styles.rowAlt : undefined),
                }}
              >
                <View style={styles.tierHeader}>
                  <Text style={[styles.tierTitle, { color: C.text }]}>Tier {level.level}</Text>
                  <TouchableOpacity
                    onPress={() => toggleCraft(station.id, level.level)}
                    style={[
                      styles.selectButton,
                      isSelected && styles.selectButtonActive,
                    ]}
                  >
                    <Text style={[styles.selectText, isSelected && styles.selectTextActive]}>
                      {isSelected ? "\u2713" : "+"}
                    </Text>
                  </TouchableOpacity>
                </View>
                {level.requirements.map((req, i) => (
                  <Text key={i} style={[styles.reqText, { color: C.textSecondary }]}>
                    {(req.itemName ?? req.itemId).replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} {"\u00D7"}{req.quantity}
                  </Text>
                ))}
              </Panel>
            </TouchableOpacity>
          );
        })}
      </>
    );
  };

  // ── P1-2: Shopping list with KPIBar + prominent rows ──────────

  const renderShoppingList = () => (
    <>
      <BackHeader title="Hideout" onBack={goBack} />
      <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Shopping List</Text>

      {shoppingList.length === 0 ? (
        <EmptyState title="Select station tiers to build a shopping list" />
      ) : (
        <>
          {/* P1-2: KPIBar at top of shopping list */}
          <KPIBar
            cells={[
              { label: "Materials", value: String(shoppingKpi.uniqueMats) },
              { label: "Total Qty", value: String(shoppingKpi.totalQty), color: C.accent },
              {
                label: "Est. Cost",
                value: shoppingKpi.estCost > 0 ? shoppingKpi.estCost.toLocaleString() : "--",
                color: shoppingKpi.estCost > 0 ? C.amber : undefined,
              },
            ]}
          />

          <View style={styles.shoppingListSpacer} />

          <Panel>
            {shoppingList.map((mat, idx) => (
              <View
                key={mat.itemId}
                style={[
                  styles.shoppingMatWrap,
                  idx % 2 === 1 && styles.rowAlt,
                ]}
              >
                <MaterialRow material={mat} />
              </View>
            ))}
          </Panel>

          {typeof window !== "undefined" && window.arcDesktop && (
            <TouchableOpacity
              style={styles.shoppingButton}
              onPress={() => {
                shoppingList.forEach((mat) =>
                  addToChecklist(mat.itemName || mat.itemId, mat.quantity)
                );
              }}
            >
              <Text style={[styles.shoppingButtonText, { color: C.accent }]}>Pin All to Overlay</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </>
  );

  // ── P1-3: Daily optimizer with priority sorting + badges ──────

  const renderDailyOptimizer = () => (
    <>
      <BackHeader title="Missions" onBack={goBack} />
      <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Daily Optimizer</Text>
      <Panel variant="glow">
        <Text style={[styles.optimizerTitle, { color: C.accent }]}>Today's Recommendations</Text>
        <Text style={[styles.optimizerHint, { color: C.textSecondary }]}>
          Cross-references active events, quest objectives, and trader refreshes.
        </Text>
      </Panel>

      {sortedRecommendations.length === 0 ? (
        <EmptyState
          icon="\uD83D\uDCCB"
          title="No recommendations yet"
          hint="Complete some quests and log raids to get personalized suggestions"
        />
      ) : (
        sortedRecommendations.map((rec, i) => {
          const priority: string = (rec as any).priority ?? "low";
          const effort: string | undefined = (rec as any).estimatedEffort;
          const priorityColor = PRIORITY_COLORS[priority] ?? C.textSecondary;
          const isChecked = dailyChecked.has(i);

          return (
            <TouchableOpacity
              key={i}
              activeOpacity={0.7}
              onPress={() => {
                setDailyChecked((prev) => {
                  const next = new Set(prev);
                  if (next.has(i)) {
                    next.delete(i);
                  } else {
                    next.add(i);
                  }
                  return next;
                });
                if (rec.title.toLowerCase().includes("farm")) {
                  goToShoppingList();
                  setViewMode("shoppingList");
                }
              }}
            >
              <Panel style={[styles.card, isChecked && styles.recCheckedCard]}>
                <View style={styles.recHeaderRow}>
                  <View style={[styles.dailyCheckbox, isChecked && styles.dailyCheckboxChecked]}>
                    {isChecked && <Text style={styles.dailyCheckmark}>{"\u2713"}</Text>}
                  </View>
                  <Text style={[styles.recTitle, { color: C.text }, isChecked && styles.recTitleChecked]}>{rec.title}</Text>
                  {/* P1-3: Priority badge */}
                  <View style={[styles.priorityBadge, { borderColor: priorityColor }]}>
                    <Text style={[styles.priorityText, { color: priorityColor }]}>
                      {priority.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.recReason, { color: C.textSecondary }]}>{rec.reason}</Text>
                {/* P1-3: Estimated effort */}
                {effort && (
                  <Text style={[styles.recEffort, { color: C.textMuted }]}>{effort}</Text>
                )}
              </Panel>
            </TouchableOpacity>
          );
        })
      )}

      {activeEvents.length > 0 && (
        <>
          <Divider />
          <Text style={[styles.subHeading, { color: C.textSecondary }]}>Active Events</Text>
          {activeEvents.map((event, i) => (
            <Panel key={i} style={styles.card}>
              <Text style={[styles.eventName, { color: C.text }]}>{event.name}</Text>
              <Text style={[styles.eventMap, { color: C.accent }]}>{event.map}</Text>
            </Panel>
          ))}
        </>
      )}
    </>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: C.bg }]}>
      <Text style={[styles.header, { color: C.text }]}>Missions</Text>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={C.accent} />
        }
      >
        {error && (
          <Panel style={[styles.errorPanel, { borderColor: C.red }]}>
            <Text style={[styles.errorText, { color: C.red }]}>{error}</Text>
          </Panel>
        )}

        {viewMode === "traderList" && renderTraderList()}
        {viewMode === "questChain" && renderQuestChain()}
        {viewMode === "questDetail" && renderQuestDetail()}
        {viewMode === "hideoutOverview" && renderHideoutOverview()}
        {viewMode === "stationDetail" && renderStationDetail()}
        {viewMode === "shoppingList" && renderShoppingList()}
        {viewMode === "dailyOptimizer" && renderDailyOptimizer()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    fontSize: 20,
    fontWeight: "700",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxs,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
  sectionTitle: {
    fontSize: fs.md,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },

  // ── Trader List ────────────────────────────────────────────────
  card: { marginBottom: spacing.sm },
  traderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  traderInfo: { flex: 1 },
  traderName: { fontSize: fs.lg, fontWeight: "700" },
  traderCount: { fontSize: 12, marginTop: spacing.xxs },
  chevron: { fontSize: 24 },

  // ── Banner (Phase 7a) ───────────────────────────────────────────
  bannerText: { fontSize: 12, lineHeight: 18, textAlign: "center" },

  // ── Quest Pairing (Phase 7b) ────────────────────────────────────
  pairingMap: { fontSize: 15, fontWeight: "700" },
  pairingReason: { fontSize: 12, marginTop: 2 },
  pairingQuest: { fontSize: 12, marginTop: 2, lineHeight: 16 },

  // ── Quick Nav ──────────────────────────────────────────────────
  quickNav: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  quickNavButton: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingVertical: 8,
  },
  quickNavIcon: { fontSize: 16, marginBottom: spacing.xxs },
  quickNavLabel: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ── Quest Chain (P1-1 connected visualization) ────────────────
  chainHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  progressBadge: {
    backgroundColor: Colors.accentBg,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  progressBadgeText: {
    fontSize: fs.sm,
    fontWeight: "700",
    color: Colors.accent,
    fontVariant: ["tabular-nums"],
  },
  chainSpacer: { height: spacing.sm },
  chainNodeWrap: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 54,
  },
  connectorColumn: {
    width: 24,
    alignItems: "center",
    marginRight: spacing.xs,
  },
  connectorSegment: {
    flex: 1,
    width: 3,
    borderRadius: 1.5,
  },
  connectorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.borderAccent,
  },
  connectorDotDone: {
    borderColor: Colors.green,
  },
  chainCardWrap: {
    flex: 1,
  },
  rowAlt: {
    backgroundColor: Colors.rowAlt,
  },

  // ── Quest Detail ───────────────────────────────────────────────
  questTitle: { fontSize: fs.xl, fontWeight: "700" },
  questXp: { fontSize: fs.md, marginTop: spacing.xs },
  subHeading: {
    fontSize: fs.sm,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  objectiveText: { fontSize: 12, marginBottom: 3, lineHeight: 18 },

  // ── Hideout Grid ───────────────────────────────────────────────
  stationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stationCell: { width: "31%", minWidth: 90 },
  stationPanel: { alignItems: "center", paddingVertical: 8 },
  stationIcon: { fontSize: 20, marginBottom: 3 },
  stationName: { fontSize: fs.sm, fontWeight: "600", textAlign: "center" },
  stationLevels: { fontSize: fs.xs, marginTop: spacing.xxs },

  // ── Station Detail / Tiers ─────────────────────────────────────
  tierCard: { marginBottom: spacing.sm },
  tierHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  tierTitle: { fontSize: fs.lg, fontWeight: "700" },
  selectButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.borderAccent,
    alignItems: "center",
    justifyContent: "center",
  },
  selectButtonActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  selectText: { fontSize: 16, fontWeight: "700", color: Colors.textSecondary },
  selectTextActive: { color: "#fff" },
  reqText: { fontSize: fs.md, marginTop: spacing.xxs },

  // ── Shopping List (P1-2) ───────────────────────────────────────
  shoppingListSpacer: { height: spacing.sm },
  shoppingMatWrap: {
    borderRadius: 4,
    overflow: "hidden",
  },
  shoppingButton: {
    backgroundColor: "rgba(0, 180, 216, 0.15)",
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 6,
    padding: 8,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  shoppingButtonText: { fontSize: fs.lg, fontWeight: "700" },

  // ── Daily Optimizer (P1-3) ─────────────────────────────────────
  optimizerTitle: { fontSize: 16, fontWeight: "700" },
  optimizerHint: { fontSize: 12, marginTop: spacing.xs },
  recHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  recTitle: { fontSize: fs.lg, fontWeight: "600", flex: 1 },
  recTitleChecked: { textDecorationLine: "line-through", opacity: 0.5 },
  recReason: { fontSize: 12, marginTop: spacing.xs, lineHeight: 16 },
  recEffort: {
    fontSize: fs.xs,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  recCheckedCard: { opacity: 0.7 },
  priorityBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  priorityText: {
    fontSize: fs.xs,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // ── Daily Optimizer Checkboxes (Phase 7c) ──────────────────────
  dailyCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.borderAccent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.xs,
  },
  dailyCheckboxChecked: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  dailyCheckmark: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },

  // ── Events (daily optimizer section) ───────────────────────────
  eventName: { fontSize: fs.lg, fontWeight: "600" },
  eventMap: { fontSize: 12, marginTop: spacing.xxs },

  // ── Error ──────────────────────────────────────────────────────
  errorPanel: { marginBottom: spacing.md },
  errorText: { fontSize: fs.md, textAlign: "center" },
});
