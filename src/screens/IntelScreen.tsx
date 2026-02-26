/**
 * IntelScreen — Tab 1: Live events, map intel, enemy database, route planner.
 * Absorbs EventsScreen and adds dashboard, enemy browser, route planner views.
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
import { Colors, threatColors } from "../theme";
import {
  Panel,
  Divider,
  CountdownTimer,
  FilterPills,
  BackHeader,
  EmptyState,
  KPIBar,
  ItemRow,
  SearchBar,
} from "../components";
import { useIntel } from "../hooks/useIntel";
import { loc } from "../utils/loc";
import type { IntelViewMode, Bot, GameMap, SavedRoute } from "../types";

const MAP_FILTERS = ["Dam", "Spaceport", "Buried City", "Blue Gate", "Stella Montis"];

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
          { label: "Events", icon: "⏱", mode: "eventList" as IntelViewMode },
          { label: "Enemies", icon: "🤖", mode: "enemyList" as IntelViewMode },
          { label: "Maps", icon: "🗺", mode: "mapDetail" as IntelViewMode },
          { label: "Routes", icon: "📍", mode: "routePlanner" as IntelViewMode },
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
          {filteredActive.slice(0, 3).map((event, i) => (
            <Panel key={`active-${i}`} style={styles.eventCard}>
              <View style={styles.eventRow}>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventName}>{event.name}</Text>
                  <Text style={styles.eventMap}>{event.map}</Text>
                </View>
                <CountdownTimer targetTime={event.endTime} now={now} label="Ends in" isActive />
              </View>
            </Panel>
          ))}
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
        filteredActive.map((event, i) => (
          <Panel key={`active-${i}`} style={styles.eventCard}>
            <View style={styles.eventRow}>
              <View style={styles.eventInfo}>
                <Text style={styles.eventName}>{event.name}</Text>
                <Text style={styles.eventMap}>{event.map}</Text>
              </View>
              <CountdownTimer targetTime={event.endTime} now={now} label="Ends in" isActive />
            </View>
          </Panel>
        ))
      )}

      <Divider />

      <Text style={styles.sectionTitle}>Upcoming</Text>
      {filteredUpcoming.length === 0 ? (
        <EmptyState title="No upcoming events" />
      ) : (
        filteredUpcoming.map((event, i) => (
          <Panel key={`upcoming-${i}`} style={styles.eventCard}>
            <View style={styles.eventRow}>
              <View style={styles.eventInfo}>
                <Text style={styles.eventName}>{event.name}</Text>
                <Text style={styles.eventMap}>{event.map}</Text>
              </View>
              <CountdownTimer targetTime={event.startTime} now={now} label="Starts in" />
            </View>
          </Panel>
        ))
      )}
    </>
  );

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
              <View style={styles.mapMetaRow}>
                {mapEvents.length > 0 && (
                  <Text style={styles.mapMeta}>
                    {mapEvents.length} active event{mapEvents.length > 1 ? "s" : ""}
                  </Text>
                )}
                <Text style={styles.mapMeta}>
                  {mapBots.length} enemy type{mapBots.length !== 1 ? "s" : ""}
                </Text>
              </View>
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
          <EmptyState icon="🤖" title="No enemies found" />
        ) : (
          filteredBots.map((bot) => (
            <ItemRow
              key={bot.id}
              name={loc(bot.name)}
              subtitle={`${bot.threat ?? "Unknown"} threat${bot.weakness ? ` · Weak: ${bot.weakness}` : ""}`}
              rightText={bot.threat ?? undefined}
              rightColor={bot.threat ? (threatColors as Record<string, string>)[bot.threat] : undefined}
              onPress={() => {
                setSelectedBot(bot.id);
                setViewMode("enemyDetail");
              }}
            />
          ))
        )}
      </View>
    </>
  );

  const renderEnemyDetail = () => {
    if (!botDetail) return <EmptyState title="Enemy not found" />;
    const botMaps = botDetail.maps
      .map((mId) => maps.find((m) => m.id === mId))
      .filter(Boolean) as GameMap[];

    return (
      <>
        <BackHeader title="Enemies" onBack={goBack} />
        <Panel>
          <Text style={styles.detailTitle}>{loc(botDetail.name)}</Text>
          {botDetail.type && <Text style={styles.detailSubtitle}>{botDetail.type}</Text>}

          <Divider />

          <View style={styles.detailGrid}>
            <View style={styles.detailCell}>
              <Text style={styles.detailLabel}>Threat</Text>
              <Text
                style={[
                  styles.detailValue,
                  botDetail.threat
                    ? { color: (threatColors as Record<string, string>)[botDetail.threat] ?? Colors.text }
                    : null,
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

  const renderRoutePlanner = () => (
    <>
      <BackHeader title="Intel" onBack={goBack} />
      <Text style={styles.sectionTitle}>Saved Routes</Text>
      {routes.length === 0 ? (
        <EmptyState
          icon="📍"
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
                    {route.lootPerMinute ? ` · ~${Math.round(route.lootPerMinute)} value/min` : ""}
                  </Text>
                </View>
                <Text style={styles.chevron}>&#x203A;</Text>
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
              {totalMinutes > 0 ? ` · ~${totalMinutes} min total` : ""}
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
    marginTop: 10,
  },
  quickNav: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
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
  eventCard: { marginBottom: 8 },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eventInfo: { flex: 1, marginRight: 12 },
  eventName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  eventMap: { fontSize: 12, color: Colors.accent, marginTop: 2 },
  viewAll: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.accent,
    textAlign: "center",
    paddingVertical: 6,
  },
  listPad: { paddingTop: 8 },
  detailTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  detailSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  detailCell: { minWidth: "40%" },
  detailLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: { fontSize: 15, fontWeight: "700", color: Colors.text, marginTop: 2 },
  subHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  dropText: { fontSize: 13, color: Colors.text, marginBottom: 4, lineHeight: 18 },
  mapMetaRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  mapMeta: { fontSize: 12, color: Colors.textSecondary },
  mapBotList: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  mapBotPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0, 180, 216, 0.1)",
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  mapBotText: { fontSize: 11, color: Colors.accent, fontWeight: "600" },
  chevron: { fontSize: 24, color: Colors.textMuted },
  addButton: {
    backgroundColor: "rgba(0, 180, 216, 0.15)",
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    marginTop: 8,
  },
  addButtonText: { fontSize: 14, fontWeight: "700", color: Colors.accent },
  routeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deleteText: { fontSize: 13, fontWeight: "600", color: Colors.red },
  routeEfficiency: { fontSize: 13, color: Colors.green, marginTop: 4 },
  waypointRow: { flexDirection: "row", marginBottom: 8 },
  waypointNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.borderAccent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 2,
  },
  waypointNumText: { fontSize: 12, fontWeight: "700", color: Colors.text },
  waypointInfo: { flex: 1 },
  waypointZone: { fontSize: 14, fontWeight: "600", color: Colors.text },
  waypointNotes: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  waypointLoot: { fontSize: 11, color: Colors.accent, marginTop: 2 },
  waypointTime: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    paddingVertical: 8,
  },
  errorPanel: { marginBottom: 10, borderColor: Colors.red },
  errorText: { fontSize: 13, color: Colors.red, textAlign: "center" },
});
