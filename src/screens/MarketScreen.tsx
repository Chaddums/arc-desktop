/**
 * MarketScreen — Tab 3: Trader inventory, price history, crafting profit, watchlist.
 * P1 upgrades: % change on prices, category pills on inventory, striped rows,
 * status badges on watchlist, improved KPI cards.
 */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, spacing, fontSize as fs } from "../theme";
import { useColors } from "../theme/ThemeContext";
import {
  Panel,
  Divider,
  BackHeader,
  EmptyState,
  SearchBar,
  ItemRow,
  KPIBar,
  Sparkline,
  FilterPills,
  StatusBadge,
} from "../components";
import { useMarket } from "../hooks/useMarket";
import type { MarketViewMode } from "../types";

const INVENTORY_CATEGORIES = ["Weapon", "Armor", "Consumable", "Material", "Ammo"];

export default function MarketScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const [inventoryCategory, setInventoryCategory] = useState<string | null>(null);
  const {
    viewMode,
    setViewMode,
    // Traders
    traders,
    selectedTrader,
    setSelectedTrader,
    traderSearch,
    setTraderSearch,
    // Price history
    priceHistory,
    selectedPriceItem,
    setSelectedPriceItem,
    // Crafting profit
    craftingProfits,
    ardbLoading,
    // Watchlist
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    watchlistPrices,
    // Common
    loading,
    error,
    goBack,
    refresh,
  } = useMarket();

  // Total items across all traders
  const totalItems = useMemo(() => traders.reduce((sum, t) => sum + t.inventory.length, 0), [traders]);

  // Phase 1a (P0): Moved useMemo out of renderPriceHistory into component body
  const byItem = useMemo(() => {
    const map = new Map<string, { name: string; prices: number[]; pctChange: number | null }>();
    for (const snap of priceHistory) {
      const existing = map.get(snap.itemId);
      if (existing) {
        existing.prices.push(snap.value);
      } else {
        map.set(snap.itemId, { name: snap.itemId, prices: [snap.value], pctChange: null });
      }
    }
    // Calculate % change
    for (const [, data] of map) {
      if (data.prices.length >= 2) {
        const first = data.prices[0];
        const last = data.prices[data.prices.length - 1];
        data.pctChange = first > 0 ? ((last - first) / first) * 100 : null;
      }
    }
    return map;
  }, [priceHistory]);

  const renderTraderList = () => (
    <>
      {/* KPI summary */}
      <KPIBar
        cells={[
          { label: "Traders", value: String(traders.length) },
          { label: "In Stock", value: String(totalItems) },
          {
            label: "Watchlist",
            value: String(watchlist.length),
            color: watchlist.length > 0 ? C.accent : undefined,
            onPress: () => setViewMode("watchlist"),
          },
        ]}
      />

      {/* Quick nav */}
      <View style={styles.quickNav}>
        {[
          { label: "Prices", icon: "\u{1F4C8}", mode: "priceHistory" as MarketViewMode },
          { label: "Profit", icon: "\u{1F4B0}", mode: "craftingProfit" as MarketViewMode },
          { label: "Watchlist", icon: "\u2B50", mode: "watchlist" as MarketViewMode },
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

      <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Traders</Text>
      {traders.length === 0 ? (
        <EmptyState icon="\u{1F3EA}" title="No trader data" hint="Pull to refresh" />
      ) : (
        traders.map((trader) => (
          <TouchableOpacity
            key={trader.id}
            onPress={() => {
              setSelectedTrader(trader.id);
              setInventoryCategory(null);
              setViewMode("traderInventory");
            }}
            activeOpacity={0.7}
          >
            <Panel style={styles.card}>
              <View style={styles.traderRow}>
                <View style={styles.traderInfo}>
                  <Text style={[styles.traderName, { color: C.text }]}>{trader.name}</Text>
                  <Text style={[styles.traderCount, { color: C.textSecondary }]}>
                    {trader.inventory.length} items
                  </Text>
                </View>
                <Text style={[styles.chevron, { color: C.textMuted }]}>&#x203A;</Text>
              </View>
            </Panel>
          </TouchableOpacity>
        ))
      )}
    </>
  );

  const renderTraderInventory = () => {
    const trader = traders.find((t) => t.id === selectedTrader);
    if (!trader) return <EmptyState title="Trader not found" />;

    let filtered = trader.inventory;
    if (inventoryCategory) {
      filtered = filtered.filter((item) =>
        item.item_type?.toLowerCase().includes(inventoryCategory.toLowerCase())
      );
    }
    if (traderSearch) {
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(traderSearch.toLowerCase())
      );
    }

    return (
      <>
        <BackHeader title="Traders" onBack={goBack} />
        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>{trader.name}</Text>
        <SearchBar
          value={traderSearch}
          onChangeText={setTraderSearch}
          placeholder={`Search ${trader.name}'s inventory...`}
        />
        <FilterPills
          options={INVENTORY_CATEGORIES}
          selected={inventoryCategory}
          onSelect={setInventoryCategory}
          allLabel="All"
        />
        <Text style={[styles.resultCount, { color: C.textMuted }]}>{filtered.length} items</Text>
        <View style={styles.listPad}>
          {filtered.length === 0 ? (
            <EmptyState title="No items found" />
          ) : (
            filtered.map((item, i) => (
              <View key={item.id} style={i % 2 === 1 ? styles.rowAlt : undefined}>
                <ItemRow
                  name={item.name}
                  subtitle={item.item_type}
                  rarity={item.rarity}
                  rightText={item.trader_price != null ? `${item.trader_price}` : undefined}
                  onPress={() => {
                    setSelectedPriceItem(item.id);
                    setViewMode("itemPriceDetail");
                  }}
                  showStar={true}
                  isStarred={watchlist.some((w) => w.itemId === item.id)}
                  onStarPress={() => {
                    const isW = watchlist.some((w) => w.itemId === item.id);
                    if (isW) removeFromWatchlist(item.id);
                    else addToWatchlist(item.id, item.name);
                  }}
                />
              </View>
            ))
          )}
        </View>
      </>
    );
  };

  const renderPriceHistory = () => {
    return (
      <>
        <BackHeader title="Market" onBack={goBack} />
        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Price History</Text>
        {priceHistory.length === 0 ? (
          <EmptyState
            icon="\u{1F4C8}"
            title="No price data yet"
            hint="Price snapshots are recorded as you browse traders"
          />
        ) : (
          [...byItem.entries()].map(([itemId, data]) => (
            <TouchableOpacity
              key={itemId}
              onPress={() => {
                setSelectedPriceItem(itemId);
                setViewMode("itemPriceDetail");
              }}
            >
              <Panel style={styles.card}>
                <View style={styles.priceRow}>
                  <View style={styles.priceInfo}>
                    <Text style={[styles.priceName, { color: C.text }]}>{data.name.replace(/_/g, " ")}</Text>
                    <View style={styles.priceMetaRow}>
                      <Text style={[styles.priceValue, { color: C.accent }]}>
                        {data.prices[data.prices.length - 1]}
                      </Text>
                      {data.pctChange != null && (
                        <Text style={[
                          styles.pctChange,
                          { color: data.pctChange >= 0 ? C.green : C.red },
                        ]}>
                          {data.pctChange >= 0 ? "+" : ""}{data.pctChange.toFixed(1)}%
                        </Text>
                      )}
                    </View>
                  </View>
                  <Sparkline
                    data={data.prices}
                    width={80}
                    height={24}
                    color={data.pctChange != null && data.pctChange >= 0 ? C.green : C.red}
                  />
                </View>
              </Panel>
            </TouchableOpacity>
          ))
        )}
      </>
    );
  };

  const renderItemPriceDetail = () => {
    const snapshots = priceHistory.filter((s) => s.itemId === selectedPriceItem);
    const prices = snapshots.map((s) => s.value);
    const name = selectedPriceItem?.replace(/_/g, " ") ?? "Unknown";
    const pctChange = prices.length >= 2 && prices[0] > 0
      ? ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100
      : null;

    return (
      <>
        <BackHeader title="Prices" onBack={goBack} />
        <Panel>
          <View style={styles.detailHeader}>
            <Text style={[styles.detailTitle, { color: C.text }]}>{name}</Text>
            {pctChange != null && (
              <Text style={[
                styles.detailPctChange,
                { color: pctChange >= 0 ? C.green : C.red },
              ]}>
                {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(1)}%
              </Text>
            )}
          </View>
          {prices.length > 0 && (
            <>
              <View style={styles.sparklineContainer}>
                <Sparkline data={prices} width={280} height={80} />
              </View>
              <KPIBar
                cells={[
                  { label: "Last Recorded", value: String(prices[prices.length - 1]) },
                  { label: "Min", value: String(Math.min(...prices)) },
                  { label: "Max", value: String(Math.max(...prices)) },
                  { label: "Data Points", value: String(prices.length) },
                ]}
              />
            </>
          )}
          {prices.length === 0 && (
            <Text style={[styles.hintText, { color: C.textMuted }]}>No price data recorded for this item</Text>
          )}
          <Text style={[styles.hintText, { color: C.textMuted }]}>
            Prices are recorded when you browse trader inventories
          </Text>
        </Panel>

        {/* Watchlist toggle */}
        <TouchableOpacity
          style={[styles.watchlistButton, { backgroundColor: C.accentBg, borderColor: C.accent }]}
          onPress={() => {
            if (selectedPriceItem) {
              const isWatched = watchlist.some((w) => w.itemId === selectedPriceItem);
              if (isWatched) {
                removeFromWatchlist(selectedPriceItem);
              } else {
                addToWatchlist(selectedPriceItem, name);
              }
            }
          }}
        >
          <Text style={[styles.watchlistButtonText, { color: C.accent }]}>
            {watchlist.some((w) => w.itemId === selectedPriceItem)
              ? "\u2605 Remove from Watchlist"
              : "\u2606 Add to Watchlist"}
          </Text>
        </TouchableOpacity>
      </>
    );
  };

  const renderCraftingProfit = () => (
    <>
      <BackHeader title="Market" onBack={goBack} />
      <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Crafting Profit Calculator</Text>
      {ardbLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={C.accent} />
          <Text style={[styles.hintText, { color: C.textMuted }]}>Loading crafting data...</Text>
        </View>
      ) : craftingProfits.length === 0 ? (
        <EmptyState
          icon="\u{1F4B0}"
          title="No crafting profit data"
          hint="Profit calculations require item value and recipe data"
        />
      ) : (
        craftingProfits.map((profit, i) => (
          <Panel
            key={i}
            style={styles.card}
            variant={profit.profitable ? "glow" : "default"}
          >
            <View style={styles.profitRow}>
              <Text style={[styles.profitName, { color: C.text }]}>{profit.itemName}</Text>
              <Text
                style={[
                  styles.profitMargin,
                  { color: profit.profitable ? C.green : C.red },
                ]}
              >
                {profit.profitMargin > 0 ? "+" : ""}{Math.round(profit.profitMargin * 100)}%
              </Text>
            </View>
            <View style={styles.profitDetails}>
              <View style={[styles.profitCell, { backgroundColor: C.bgDeep }]}>
                <Text style={[styles.profitCellLabel, { color: C.textMuted }]}>Cost</Text>
                <Text style={[styles.profitCellValue, { color: C.text }]}>{profit.totalCost}</Text>
              </View>
              <View style={[styles.profitCell, { backgroundColor: C.bgDeep }]}>
                <Text style={[styles.profitCellLabel, { color: C.textMuted }]}>Sell</Text>
                <Text style={[styles.profitCellValue, { color: C.text }]}>{profit.sellValue}</Text>
              </View>
              <View style={[styles.profitCell, { backgroundColor: C.bgDeep }]}>
                <Text style={[styles.profitCellLabel, { color: C.textMuted }]}>Profit</Text>
                <Text style={[
                  styles.profitCellValue,
                  { color: profit.profitable ? C.green : C.red },
                ]}>
                  {profit.sellValue - profit.totalCost}
                </Text>
              </View>
            </View>
          </Panel>
        ))
      )}
    </>
  );

  const renderWatchlist = () => (
    <>
      <BackHeader title="Market" onBack={goBack} />
      <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Watchlist</Text>
      {watchlist.length === 0 ? (
        <EmptyState
          icon="\u2B50"
          title="Watchlist empty"
          hint="Add items from trader inventories or price history"
        />
      ) : (
        watchlist.map((item) => {
          const prices = watchlistPrices[item.itemId] ?? [];
          const currentPrice = prices.length > 0 ? prices[prices.length - 1] : null;
          const pctChange = prices.length >= 2 && prices[0] > 0
            ? ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100
            : null;

          return (
            <TouchableOpacity
              key={item.itemId}
              onPress={() => {
                setSelectedPriceItem(item.itemId);
                setViewMode("itemPriceDetail");
              }}
            >
              <Panel style={styles.card}>
                <View style={styles.watchRow}>
                  <View style={styles.watchInfo}>
                    <Text style={[styles.watchName, { color: C.text }]}>{item.itemName}</Text>
                    <View style={styles.watchMeta}>
                      {currentPrice != null && (
                        <Text style={[styles.watchPrice, { color: C.accent }]}>{currentPrice} value</Text>
                      )}
                      {pctChange != null && (
                        <Text style={[
                          styles.watchPct,
                          { color: pctChange >= 0 ? C.green : C.red },
                        ]}>
                          {pctChange >= 0 ? "\u25B2" : "\u25BC"} {Math.abs(pctChange).toFixed(1)}%
                        </Text>
                      )}
                    </View>
                  </View>
                  {prices.length > 1 && (
                    <Sparkline data={prices} width={60} height={20} />
                  )}
                  <TouchableOpacity
                    onPress={() => removeFromWatchlist(item.itemId)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.removeBtn}
                  >
                    <Text style={[styles.removeText, { color: C.textMuted }]}>{"\u2715"}</Text>
                  </TouchableOpacity>
                </View>
              </Panel>
            </TouchableOpacity>
          );
        })
      )}
    </>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: C.bg }]}>
      <Text style={[styles.header, { color: C.text }]}>Market</Text>
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
        {viewMode === "traderInventory" && renderTraderInventory()}
        {viewMode === "priceHistory" && renderPriceHistory()}
        {viewMode === "itemPriceDetail" && renderItemPriceDetail()}
        {viewMode === "craftingProfit" && renderCraftingProfit()}
        {viewMode === "watchlist" && renderWatchlist()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    fontSize: 20,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 2,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 8, paddingBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, marginTop: 4 },
  quickNav: { flexDirection: "row", gap: 6, marginTop: 6, marginBottom: 4 },
  quickNavButton: { flex: 1, alignItems: "center", backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingVertical: 8 },
  quickNavIcon: { fontSize: 16, marginBottom: 2 },
  quickNavLabel: { fontSize: 9, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  card: { marginBottom: 6 },
  traderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  traderInfo: { flex: 1 },
  traderName: { fontSize: 15, fontWeight: "700" },
  traderCount: { fontSize: 11, marginTop: 1 },
  chevron: { fontSize: 22 },
  listPad: { paddingTop: 4 },
  rowAlt: { backgroundColor: Colors.rowAlt, borderRadius: 6 },
  resultCount: { fontSize: 10, marginBottom: 4 },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceInfo: { flex: 1 },
  priceName: { fontSize: 13, fontWeight: "600" },
  priceMetaRow: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 2 },
  priceValue: { fontSize: 12, fontWeight: "700", fontVariant: ["tabular-nums"] },
  pctChange: { fontSize: 10, fontWeight: "700", fontVariant: ["tabular-nums"] },
  detailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  detailTitle: { fontSize: 17, fontWeight: "700" },
  detailPctChange: { fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"] },
  sparklineContainer: { alignItems: "center", paddingVertical: 8 },
  hintText: { fontSize: 12, textAlign: "center", paddingVertical: 6 },
  watchlistButton: { borderWidth: 1, borderRadius: 6, padding: 8, alignItems: "center", marginTop: 6 },
  watchlistButtonText: { fontSize: 13, fontWeight: "700" },
  loadingContainer: { alignItems: "center", paddingVertical: 20, gap: 8 },
  profitRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  profitName: { fontSize: 13, fontWeight: "600" },
  profitMargin: { fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] },
  profitDetails: { flexDirection: "row", gap: 4, marginTop: 6 },
  profitCell: { flex: 1, alignItems: "center", borderRadius: 4, paddingVertical: 4 },
  profitCellLabel: { fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  profitCellValue: { fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"], marginTop: 1 },
  watchRow: { flexDirection: "row", alignItems: "center" },
  watchInfo: { flex: 1 },
  watchName: { fontSize: 13, fontWeight: "600" },
  watchMeta: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 2 },
  watchPrice: { fontSize: 11, fontWeight: "700", fontVariant: ["tabular-nums"] },
  watchPct: { fontSize: 10, fontWeight: "700", fontVariant: ["tabular-nums"] },
  removeBtn: { marginLeft: 10, padding: 4 },
  removeText: { fontSize: 14 },
  errorPanel: { marginBottom: 8, borderWidth: 1 },
  errorText: { fontSize: 12, textAlign: "center" },
});
