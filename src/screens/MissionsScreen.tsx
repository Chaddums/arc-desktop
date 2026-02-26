/**
 * MissionsScreen — Tab 4: Quest tracker, hideout/station planner, shopping list, daily optimizer.
 * Absorbs QuestsScreen + CraftingScreen.
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
import { Colors } from "../theme";
import {
  Panel,
  Divider,
  QuestCard,
  MaterialRow,
  BackHeader,
  EmptyState,
  ProgressBar,
} from "../components";
import { useMissions } from "../hooks/useMissions";
import { useCompletedQuests } from "../hooks/useCompletedQuests";
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

export default function MissionsScreen() {
  const insets = useSafeAreaInsets();
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

  const renderTraderList = () => (
    <>
      {/* Quests Section */}
      <Text style={styles.sectionTitle}>Quest Chains</Text>
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
                  <Text style={styles.traderName}>{trader}</Text>
                  <Text style={styles.traderCount}>{completed}/{total} quests</Text>
                </View>
                <Text style={styles.chevron}>&#x203A;</Text>
              </View>
              <ProgressBar progress={progress} />
            </Panel>
          </TouchableOpacity>
        );
      })}

      <Divider />

      {/* Quick nav to other views */}
      <View style={styles.quickNav}>
        <TouchableOpacity
          style={styles.quickNavButton}
          onPress={() => setViewMode("hideoutOverview")}
        >
          <Text style={styles.quickNavIcon}>🏗</Text>
          <Text style={styles.quickNavLabel}>Hideout</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickNavButton}
          onPress={() => setViewMode("dailyOptimizer")}
        >
          <Text style={styles.quickNavIcon}>📋</Text>
          <Text style={styles.quickNavLabel}>Daily Plan</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderQuestChain = () => (
    <>
      <BackHeader title="Traders" onBack={goBack} />
      <Text style={styles.sectionTitle}>{selectedTrader}</Text>
      {questChain.length === 0 ? (
        <EmptyState title="No quests found for this trader" />
      ) : (
        questChain.map((quest) => (
          <View key={quest.id}>
            <View style={styles.chainConnector} />
            <QuestCard
              name={loc(quest.name) || quest.id}
              trader={selectedTrader ?? undefined}
              xp={quest.xp}
              isCompleted={completedIds.has(quest.id)}
              onToggle={() =>
                completedIds.has(quest.id)
                  ? markIncomplete(quest.id)
                  : markComplete(quest.id)
              }
              onPress={() => goToQuest(quest.id)}
            />
          </View>
        ))
      )}
    </>
  );

  const renderQuestDetail = () => {
    if (!questDetail) return null;
    return (
      <>
        <BackHeader title={selectedTrader ?? "Quests"} onBack={goBack} />
        <Panel>
          <Text style={styles.questTitle}>{loc(questDetail.name) || questDetail.id}</Text>
          {questDetail.xp != null && questDetail.xp > 0 && (
            <Text style={styles.questXp}>{questDetail.xp.toLocaleString()} XP</Text>
          )}
          {questDetail.objectives && questDetail.objectives.length > 0 && (
            <>
              <Divider />
              <Text style={styles.subHeading}>Objectives</Text>
              {questDetail.objectives.map((obj, i) => (
                <Text key={i} style={styles.objectiveText}>
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
      <Text style={styles.sectionTitle}>Crafting Stations</Text>
      <View style={styles.stationGrid}>
        {stations.map((station) => (
          <TouchableOpacity
            key={station.id}
            style={styles.stationCell}
            onPress={() => goToStation(station.id)}
            activeOpacity={0.7}
          >
            <Panel style={styles.stationPanel}>
              <Text style={styles.stationIcon}>{STATION_ICONS[station.id] || "🏗"}</Text>
              <Text style={styles.stationName} numberOfLines={2}>
                {loc(station.name) || station.id}
              </Text>
              <Text style={styles.stationLevels}>
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
            <Text style={styles.shoppingButtonText}>
              View Shopping List ({selectedCrafts.length} selected)
            </Text>
          </TouchableOpacity>
        </>
      )}
    </>
  );

  const renderStationDetail = () => {
    if (!selectedStation) return null;
    const station = stations.find((s) => s.id === selectedStation);
    if (!station) return null;

    return (
      <>
        <BackHeader title="Hideout" onBack={goBack} />
        <Text style={styles.sectionTitle}>{loc(station.name) || station.id}</Text>

        {(station.levels || []).map((level) => {
          const isSelected = selectedCrafts.some(
            (c) => c.stationId === station.id && c.targetLevel >= level.level
          );
          return (
            <TouchableOpacity
              key={level.level}
              onPress={() => goToLevel(station.id, level.level)}
              activeOpacity={0.7}
            >
              <Panel style={isSelected ? { ...styles.tierCard, borderColor: Colors.accent } : styles.tierCard}>
                <View style={styles.tierHeader}>
                  <Text style={styles.tierTitle}>Tier {level.level}</Text>
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
                  <Text key={i} style={styles.reqText}>
                    {req.itemName ?? req.itemId} × {req.quantity}
                  </Text>
                ))}
              </Panel>
            </TouchableOpacity>
          );
        })}
      </>
    );
  };

  const renderShoppingList = () => (
    <>
      <BackHeader title="Hideout" onBack={goBack} />
      <Text style={styles.sectionTitle}>Shopping List</Text>
      {shoppingList.length === 0 ? (
        <EmptyState title="Select station tiers to build a shopping list" />
      ) : (
        <Panel>
          {shoppingList.map((mat) => (
            <MaterialRow key={mat.itemId} material={mat} />
          ))}
        </Panel>
      )}
    </>
  );

  const renderDailyOptimizer = () => (
    <>
      <BackHeader title="Missions" onBack={goBack} />
      <Text style={styles.sectionTitle}>Daily Optimizer</Text>
      <Panel variant="glow">
        <Text style={styles.optimizerTitle}>Today's Recommendations</Text>
        <Text style={styles.optimizerHint}>
          Cross-references active events, quest objectives, and trader refreshes.
        </Text>
      </Panel>

      {dailyRecommendations.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No recommendations yet"
          hint="Complete some quests and log raids to get personalized suggestions"
        />
      ) : (
        dailyRecommendations.map((rec, i) => (
          <Panel key={i} style={styles.card}>
            <Text style={styles.recTitle}>{rec.title}</Text>
            <Text style={styles.recReason}>{rec.reason}</Text>
          </Panel>
        ))
      )}

      {activeEvents.length > 0 && (
        <>
          <Divider />
          <Text style={styles.subHeading}>Active Events</Text>
          {activeEvents.map((event, i) => (
            <Panel key={i} style={styles.card}>
              <Text style={styles.eventName}>{event.name}</Text>
              <Text style={styles.eventMap}>{event.map}</Text>
            </Panel>
          ))}
        </>
      )}
    </>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.header}>Missions</Text>
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  card: { marginBottom: 8 },
  traderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  traderInfo: { flex: 1 },
  traderName: { fontSize: 16, fontWeight: "700", color: Colors.text },
  traderCount: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  chevron: { fontSize: 24, color: Colors.textMuted },
  quickNav: { flexDirection: "row", gap: 8, marginTop: 6 },
  quickNavButton: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 10,
  },
  quickNavIcon: { fontSize: 20, marginBottom: 2 },
  quickNavLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chainConnector: {
    width: 2,
    height: 8,
    backgroundColor: Colors.borderAccent,
    alignSelf: "center",
    marginVertical: -2,
  },
  questTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  questXp: { fontSize: 13, color: Colors.accent, marginTop: 4 },
  subHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  objectiveText: { fontSize: 13, color: Colors.text, marginBottom: 4, lineHeight: 18 },
  stationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stationCell: { width: "31%", minWidth: 100 },
  stationPanel: { alignItems: "center", paddingVertical: 10 },
  stationIcon: { fontSize: 24, marginBottom: 4 },
  stationName: { fontSize: 11, fontWeight: "600", color: Colors.text, textAlign: "center" },
  stationLevels: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
  tierCard: { marginBottom: 8 },
  tierHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  tierTitle: { fontSize: 15, fontWeight: "700", color: Colors.text },
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
  reqText: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  shoppingButton: {
    backgroundColor: "rgba(0, 180, 216, 0.15)",
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  shoppingButtonText: { fontSize: 14, fontWeight: "700", color: Colors.accent },
  optimizerTitle: { fontSize: 16, fontWeight: "700", color: Colors.accent },
  optimizerHint: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  recTitle: { fontSize: 14, fontWeight: "600", color: Colors.text },
  recReason: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, lineHeight: 16 },
  eventName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  eventMap: { fontSize: 12, color: Colors.accent, marginTop: 2 },
  errorPanel: { marginBottom: 10, borderColor: Colors.red },
  errorText: { fontSize: 13, color: Colors.red, textAlign: "center" },
});
