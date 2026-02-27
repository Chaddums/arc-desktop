/**
 * IntelScreen — Tab 1: Live events, map intel, enemy database, route planner.
 * Absorbs EventsScreen and adds dashboard, enemy browser, route planner views.
 *
 * P1 Upgrades:
 *  1. Enemy threat cards with color-coded left borders + detail accent bar
 *  2. Route planner KPIBar (total routes, avg loot/min, total waypoints)
 *  3. Imminent event pulse (red border + StatusBadge "ENDING SOON" for <30 min)
 *  4. Striped rows on bot list (alternating rowAlt)
 *  5. Map detail KPIBar (active event count, bot count per map)
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, threatColors, spacing, fontSize as fs, textPresets, viewPresets } from "../theme";
import {
  Accordion,
  Panel,
  Divider,
  CountdownTimer,
  FilterPills,
  BackHeader,
  EmptyState,
  KPIBar,
  ItemRow,
  SearchBar,
  StatusBadge,
} from "../components";
import { useIntel } from "../hooks/useIntel";
import { loc } from "../utils/loc";
import type { IntelViewMode, Bot, GameMap, SavedRoute } from "../types";

const MAP_FILTERS = ["Dam", "Spaceport", "Buried City", "Blue Gate", "Stella Montis"];

/** Threshold in ms — events ending within this window get the imminent pulse treatment. */
const IMMINENT_MS = 30 * 60 * 1000;

export default function IntelScreen() {
  const insets = useSafeAreaInsets();
  const {
    viewMode,
    setViewMode,
    // Events
    activeEvents,
    upcomingEvents,
    selectedMap,
    setSelectedMap,
    now,
    // Enemies
    bots,
    maps,
    botSearch,
    setBotSearch,
    selectedThreat,
    setSelectedThreat,
    selectedBot,
    setSelectedBot,
    // Routes
    routes,
    selectedRoute,
    setSelectedRoute,
    createRoute,
    deleteRoute,
    // Common
    loading,
    error,
    refresh,
    goBack,
  } = useIntel();

  const filteredActive = selectedMap
    ? activeEvents.filter((e) => e.map === selectedMap)
    : activeEvents;
  const filteredUpcoming = selectedMap
    ? upcomingEvents.filter((e) => e.map === selectedMap)
    : upcomingEvents;

  const filteredBots = useMemo(() => {
    let list = bots;
    if (selectedThreat) list = list.filter((b) => b.threat === selectedThreat);
    if (botSearch) {
      const q = botSearch.toLowerCase();
      list = list.filter((b) => loc(b.name).toLowerCase().includes(q));
    }
    return list;
  }, [bots, selectedThreat, botSearch]);

  const botDetail = useMemo(() => {
    if (!selectedBot) return null;
    return bots.find((b) => b.id === selectedBot) ?? null;
  }, [bots, selectedBot]);

  const routeDetail = useMemo(() => {
    if (!selectedRoute) return null;
    return routes.find((r) => r.id === selectedRoute) ?? null;
  }, [routes, selectedRoute]);

  // ── Helpers ────────────────────────────────────────────────────

  /** True when event ends within 30 minutes. */
  const isImminent = useCallback(
    (endTime: number) => endTime - now > 0 && endTime - now <= IMMINENT_MS,
    [now],
  );

  /** Resolve a bot's threat level to its theme color. */
  const threatColor = (threat?: string): string | undefined =>
    threat ? (threatColors as Record<string, string>)[threat] : undefined;

  // ── Route KPI aggregates ──────────────────────────────────────

  const routeKpi = useMemo(() => {
    const totalRoutes = routes.length;
    const totalWaypoints = routes.reduce((s, r) => s + r.waypoints.length, 0);
    const withLpm = routes.filter((r) => r.lootPerMinute != null && r.lootPerMinute > 0);
    const avgLpm =
      withLpm.length > 0
        ? Math.round(withLpm.reduce((s, r) => s + (r.lootPerMinute ?? 0), 0) / withLpm.length)
        : 0;
    return { totalRoutes, totalWaypoints, avgLpm };
  }, [routes]);

  // ── Event card renderer (shared by dashboard + event list) ────

  const renderEventCard = (
    event: { name: string; map: string; startTime: number; endTime: number },
    keyPrefix: string,
    index: number,
    isActive: boolean,
  ) => {
    const imminent = isActive && isImminent(event.endTime);

    return (
      <Panel
        key={`${keyPrefix}-${index}`}
        style={imminent ? { ...styles.eventCard, ...styles.eventCardImminent } : styles.eventCard}
      >
        <View style={styles.eventRow}>
          <View style={styles.eventInfo}>
            <View style={styles.eventNameRow}>
              <Text style={styles.eventName}>{event.name}</Text>
              {imminent && (
                <StatusBadge status="active" label="ENDING SOON" style={styles.imminentBadge} />
              )}
            </View>
            <Text style={styles.eventMap}>{event.map}</Text>
          </View>
          {isActive ? (
            <CountdownTimer targetTime={event.endTime} now={now} label="Ends in" isActive />
          ) : (
            <CountdownTimer targetTime={event.startTime} now={now} label="Starts in" />
          )}
        </View>
      </Panel>
    );
  };

  // ── View Renderers ────────────────────────────────────────────

  const renderDashboard = () => (
    <>
      <KPIBar
        cells={[
          { label: "Active", value: String(activeEvents.length), color: Colors.green },
          { label: "Upcoming", value: String(upcomingEvents.length) },
          { label: "Maps", value: String(maps.length) },
        ]}
      />

      <View style={styles.quickNav}>
        {[
          { label: "Events", icon: "\u23F1", mode: "eventList" as IntelViewMode },
          { label: "Enemies", icon: "\uD83E\uDD16", mode: "enemyList" as IntelViewMode },
          { label: "Maps", icon: "\uD83D\uDDFA", mode: "mapDetail" as IntelViewMode },
          { label: "Routes", icon: "\uD83D\uDCCD", mode: "routePlanner" as IntelViewMode },
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

      {/* Active events preview */}
      {filteredActive.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Active Now</Text>
          {filteredActive.slice(0, 3).map((event, i) =>
            renderEventCard(event, "dash-active", i, true),
          )}
          {filteredActive.length > 3 && (
            <TouchableOpacity onPress={() => setViewMode("eventList")}>
              <Text style={styles.viewAll}>View all {filteredActive.length} events ›</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </>
  );

  const renderEventList = () => (
    <>
      <BackHeader title="Intel" onBack={goBack} />
      <FilterPills
        options={MAP_FILTERS}
        selected={selectedMap}
        onSelect={setSelectedMap}
        allLabel="All Maps"
      />

      <Text style={styles.sectionTitle}>Active Now</Text>
      {filteredActive.length === 0 ? (
        <EmptyState title="No active events" />
      ) : (
        filteredActive.map((event, i) => renderEventCard(event, "active", i, true))
      )}

      <Divider />

      <Text style={styles.sectionTitle}>Upcoming</Text>
      {filteredUpcoming.length === 0 ? (
        <EmptyState title="No upcoming events" />
      ) : (
        filteredUpcoming.map((event, i) => renderEventCard(event, "upcoming", i, false))
      )}
    </>
  );

  // ── P1-5: Map detail with KPIBar per map ──────────────────────

  const renderMapDetail = () => (
    <>
      <BackHeader title="Intel" onBack={goBack} />
      <Text style={styles.sectionTitle}>Maps</Text>
      {maps.length === 0 ? (
        <EmptyState title="No map data" hint="Pull to refresh" />
      ) : (
        maps.map((map) => {
          const mapEvents = activeEvents.filter((e) => e.map === loc(map.name));
          const mapBots = bots.filter((b) => b.maps.includes(map.id));
          return (
            <Panel key={map.id} style={styles.eventCard}>
              <Text style={styles.eventName}>{loc(map.name)}</Text>

              {/* P1-5: KPIBar with event + bot counts */}
              <KPIBar
                cells={[
                  {
                    label: "Active Events",
                    value: String(mapEvents.length),
                    color: mapEvents.length > 0 ? Colors.green : undefined,
                  },
                  { label: "Enemy Types", value: String(mapBots.length) },
                ]}
              />

              {mapBots.length > 0 && (
                <View style={styles.mapBotList}>
                  {mapBots.map((bot) => (
                    <TouchableOpacity
                      key={bot.id}
                      style={styles.mapBotPill}
                      onPress={() => {
                        setSelectedBot(bot.id);
                        setViewMode("enemyDetail");
                      }}
                    >
                      <Text style={styles.mapBotText}>{loc(bot.name)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Panel>
          );
        })
      )}
    </>
  );

  // ── P1-1 & P1-4: Enemy list with threat borders + striped rows ─

  const renderEnemyList = () => (
    <>
      <BackHeader title="Intel" onBack={goBack} />
      <SearchBar value={botSearch} onChangeText={setBotSearch} placeholder="Search enemies..." />
      <FilterPills
        options={["Low", "Medium", "High", "Critical", "Extreme"]}
        selected={selectedThreat}
        onSelect={setSelectedThreat}
        allLabel="All Threats"
      />

      <View style={styles.listPad}>
        {filteredBots.length === 0 ? (
          <EmptyState icon="\uD83E\uDD16" title="No enemies found" />
        ) : (
          filteredBots.map((bot, idx) => (
            <View
              key={bot.id}
              style={[
                styles.botRowWrap,
                // P1-4: Striped rows
                idx % 2 === 1 && styles.rowAlt,
                // P1-1: Threat-colored left border
                {
                  borderLeftWidth: 3,
                  borderLeftColor: threatColor(bot.threat) ?? Colors.border,
                },
              ]}
            >
              <ItemRow
                name={loc(bot.name)}
                subtitle={`${bot.threat ?? "Unknown"} threat${bot.weakness ? ` \u00B7 Weak: ${bot.weakness}` : ""}`}
                rightText={bot.threat ?? undefined}
                rightColor={threatColor(bot.threat)}
                onPress={() => {
                  setSelectedBot(bot.id);
                  setViewMode("enemyDetail");
                }}
              />
            </View>
          ))
        )}
      </View>
    </>
  );

  // ── P1-1: Enemy detail with threat accent bar ─────────────────

  const renderEnemyDetail = () => {
    if (!botDetail) return <EmptyState title="Enemy not found" />;
    const botMaps = botDetail.maps
      .map((mId) => maps.find((m) => m.id === mId))
      .filter(Boolean) as GameMap[];

    const tColor = threatColor(botDetail.threat) ?? Colors.border;

    return (
      <>
        <BackHeader title="Enemies" onBack={goBack} />
        <Panel>
          {/* P1-1: Threat-colored accent bar at top of detail */}
          <View style={[styles.threatAccentBar, { backgroundColor: tColor }]} />

          <Text style={styles.detailTitle}>{loc(botDetail.name)}</Text>
          {botDetail.type && <Text style={styles.detailSubtitle}>{botDetail.type}</Text>}

          <Divider />

          <View style={styles.detailGrid}>
            <View style={styles.detailCell}>
              <Text style={styles.detailLabel}>Threat</Text>
              <Text
                style={[
                  styles.detailValue,
                  { color: tColor },
                ]}
              >
                {botDetail.threat ?? "Unknown"}
              </Text>
            </View>
            <View style={styles.detailCell}>
              <Text style={styles.detailLabel}>Weakness</Text>
              <Text style={styles.detailValue}>{botDetail.weakness ?? "None"}</Text>
            </View>
            {botDetail.destroyXp != null && (
              <View style={styles.detailCell}>
                <Text style={styles.detailLabel}>Destroy XP</Text>
                <Text style={styles.detailValue}>{botDetail.destroyXp}</Text>
              </View>
            )}
            {botDetail.lootXp != null && (
              <View style={styles.detailCell}>
                <Text style={styles.detailLabel}>Loot XP</Text>
                <Text style={styles.detailValue}>{botDetail.lootXp}</Text>
              </View>
            )}
          </View>

          {botDetail.drops.length > 0 && (
            <>
              <Divider />
              <Text style={styles.subHeading}>Drops</Text>
              {botDetail.drops.map((drop, i) => (
                <Text key={i} style={styles.dropText}>
                  {"\u2022"} {drop.replace(/_/g, " ")}
                </Text>
              ))}
            </>
          )}

          {botMaps.length > 0 && (
            <>
              <Divider />
              <Text style={styles.subHeading}>Found On</Text>
              {botMaps.map((m) => (
                <Text key={m.id} style={styles.dropText}>
                  {"\u2022"} {loc(m.name)}
                </Text>
              ))}
            </>
          )}
        </Panel>
      </>
    );
  };

  // ── P1-2: Route planner with KPIBar + loot/min emphasis ───────

  const renderRoutePlanner = () => (
    <>
      <BackHeader title="Intel" onBack={goBack} />

      {/* P1-2: KPIBar at top of route planner */}
      <KPIBar
        cells={[
          { label: "Routes", value: String(routeKpi.totalRoutes) },
          {
            label: "Avg Value/Min",
            value: routeKpi.avgLpm > 0 ? String(routeKpi.avgLpm) : "--",
            color: Colors.accent,
          },
          { label: "Waypoints", value: String(routeKpi.totalWaypoints) },
        ]}
      />

      <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Saved Routes</Text>
      {routes.length === 0 ? (
        <EmptyState
          icon="\uD83D\uDCCD"
          title="No saved routes"
          hint="Create a route to plan your raids"
        />
      ) : (
        routes.map((route) => (
          <TouchableOpacity
            key={route.id}
            onPress={() => {
              setSelectedRoute(route.id);
              setViewMode("routeDetail");
            }}
          >
            <Panel style={styles.eventCard}>
              <View style={styles.eventRow}>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventName}>{route.name}</Text>
                  <Text style={styles.eventMap}>
                    {route.waypoints.length} waypoints
                  </Text>
                </View>
                {/* P1-2: Prominent loot/min figure */}
                {route.lootPerMinute != null && route.lootPerMinute > 0 ? (
                  <View style={styles.lpmBadge}>
                    <Text style={styles.lpmValue}>~{Math.round(route.lootPerMinute)}</Text>
                    <Text style={styles.lpmLabel}>val/min</Text>
                  </View>
                ) : (
                  <Text style={styles.chevron}>&#x203A;</Text>
                )}
              </View>
            </Panel>
          </TouchableOpacity>
        ))
      )}
      <TouchableOpacity style={styles.addButton} onPress={createRoute}>
        <Text style={styles.addButtonText}>+ New Route</Text>
      </TouchableOpacity>
    </>
  );

  const renderRouteDetail = () => {
    if (!routeDetail) return <EmptyState title="Route not found" />;
    const totalMinutes = routeDetail.waypoints.reduce((sum, w) => sum + (w.estimatedMinutes ?? 0), 0);

    return (
      <>
        <BackHeader title="Routes" onBack={goBack} />
        <Panel>
          <View style={styles.routeHeader}>
            <Text style={styles.detailTitle}>{routeDetail.name}</Text>
            <TouchableOpacity onPress={() => deleteRoute(routeDetail.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
          {routeDetail.lootPerMinute != null && (
            <Text style={styles.routeEfficiency}>
              ~{Math.round(routeDetail.lootPerMinute)} value/min
              {totalMinutes > 0 ? ` \u00B7 ~${totalMinutes} min total` : ""}
            </Text>
          )}

          <Divider />

          <Text style={styles.subHeading}>Waypoints</Text>
          {routeDetail.waypoints.length === 0 ? (
            <Text style={styles.emptyText}>No waypoints added</Text>
          ) : (
            routeDetail.waypoints.map((wp, i) => (
              <View key={wp.id} style={styles.waypointRow}>
                <View style={styles.waypointNumber}>
                  <Text style={styles.waypointNumText}>{i + 1}</Text>
                </View>
                <View style={styles.waypointInfo}>
                  <Text style={styles.waypointZone}>
                    {wp.zoneName ?? `Waypoint ${i + 1}`}
                  </Text>
                  {wp.notes && <Text style={styles.waypointNotes}>{wp.notes}</Text>}
                  {wp.lootTargets && wp.lootTargets.length > 0 && (
                    <Text style={styles.waypointLoot}>
                      Loot: {wp.lootTargets.join(", ")}
                    </Text>
                  )}
                  {wp.estimatedMinutes != null && (
                    <Text style={styles.waypointTime}>~{wp.estimatedMinutes} min</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </Panel>
      </>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.header}>Intel</Text>
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

        {viewMode === "dashboard" && renderDashboard()}
        {viewMode === "eventList" && renderEventList()}
        {viewMode === "mapDetail" && renderMapDetail()}
        {viewMode === "enemyList" && renderEnemyList()}
        {viewMode === "enemyDetail" && renderEnemyDetail()}
        {viewMode === "routePlanner" && renderRoutePlanner()}
        {viewMode === "routeDetail" && renderRouteDetail()}
      </ScrollView>
    </View>
  );
}

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
  sectionTitle: {
    fontSize: fs.md,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },

  // ── Quick Nav ──────────────────────────────────────────────────
  quickNav: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
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
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ── Event Cards ────────────────────────────────────────────────
  eventCard: { marginBottom: spacing.sm },
  eventCardImminent: {
    borderColor: "rgba(192, 57, 43, 0.6)",
    borderWidth: 1.5,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eventInfo: { flex: 1, marginRight: spacing.lg },
  eventNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  eventName: { fontSize: fs.lg, fontWeight: "600", color: Colors.text },
  eventMap: { fontSize: fs.sm, color: Colors.accent, marginTop: spacing.xxs },
  imminentBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: "rgba(192, 57, 43, 0.2)",
  },
  viewAll: {
    fontSize: fs.md,
    fontWeight: "600",
    color: Colors.accent,
    textAlign: "center",
    paddingVertical: spacing.sm,
  },

  // ── Bot List ───────────────────────────────────────────────────
  listPad: { paddingTop: spacing.sm },
  botRowWrap: {
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: spacing.xxs,
  },
  rowAlt: {
    backgroundColor: Colors.rowAlt,
  },

  // ── Enemy Detail ───────────────────────────────────────────────
  threatAccentBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.sm,
    marginTop: -spacing.xs,
  },
  detailTitle: { fontSize: fs.xl, fontWeight: "700", color: Colors.text },
  detailSubtitle: { fontSize: fs.md, color: Colors.textSecondary, marginTop: spacing.xxs },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  detailCell: { minWidth: "40%" },
  detailLabel: {
    fontSize: fs.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: { fontSize: fs.lg, fontWeight: "700", color: Colors.text, marginTop: spacing.xxs },
  subHeading: {
    fontSize: fs.sm,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  dropText: { fontSize: 12, color: Colors.text, marginBottom: 3, lineHeight: 18 },

  // ── Map Detail ─────────────────────────────────────────────────
  mapMetaRow: { flexDirection: "row", gap: 12, marginTop: spacing.xs },
  mapMeta: { fontSize: 12, color: Colors.textSecondary },
  mapBotList: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  mapBotPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    backgroundColor: "rgba(0, 180, 216, 0.1)",
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  mapBotText: { fontSize: fs.sm, color: Colors.accent, fontWeight: "600" },

  // ── Route Planner ──────────────────────────────────────────────
  lpmBadge: {
    alignItems: "center",
    backgroundColor: "rgba(0, 180, 216, 0.12)",
    borderWidth: 1,
    borderColor: Colors.borderAccent,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  lpmValue: {
    fontSize: fs.lg,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    color: Colors.accent,
  },
  lpmLabel: {
    fontSize: fs.xs,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chevron: { fontSize: 24, color: Colors.textMuted },
  addButton: {
    backgroundColor: "rgba(0, 180, 216, 0.15)",
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 6,
    padding: 8,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  addButtonText: { fontSize: fs.lg, fontWeight: "700", color: Colors.accent },
  routeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deleteText: { fontSize: fs.md, fontWeight: "600", color: Colors.red },
  routeEfficiency: { fontSize: fs.md, color: Colors.green, marginTop: spacing.xs },
  waypointRow: { flexDirection: "row", marginBottom: spacing.sm },
  waypointNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.borderAccent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginTop: spacing.xxs,
  },
  waypointNumText: { fontSize: 12, fontWeight: "700", color: Colors.text },
  waypointInfo: { flex: 1 },
  waypointZone: { fontSize: fs.lg, fontWeight: "600", color: Colors.text },
  waypointNotes: { fontSize: 12, color: Colors.textSecondary, marginTop: spacing.xxs },
  waypointLoot: { fontSize: fs.sm, color: Colors.accent, marginTop: spacing.xxs },
  waypointTime: { fontSize: fs.sm, color: Colors.textMuted, marginTop: spacing.xxs },
  emptyText: {
    fontSize: fs.md,
    color: Colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.sm,
  },
  errorPanel: { marginBottom: spacing.md, borderColor: Colors.red },
  errorText: { fontSize: fs.md, color: Colors.red, textAlign: "center" },
});
