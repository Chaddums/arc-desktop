/**
 * MarketScreen — Tab 3: Trader inventory, price history, crafting profit, watchlist.
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
  SearchBar,
  ItemRow,
  KPIBar,
  Sparkline,
} from "../components";
import { useMarket } from "../hooks/useMarket";
import type { MarketViewMode } from "../types";

export default function MarketScreen() {
  const insets = useSafeAreaInsets();
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

  const renderTraderList = () => (
    <>
      {/* Quick nav */}
      <View style={styles.quickNav}>
        {[
          { label: "Prices", icon: "📈", mode: "priceHistory" as MarketViewMode },
          { label: "Profit", icon: "💰", mode: "craftingProfit" as MarketViewMode },
          { label: "Watchlist", icon: "⭐", mode: "watchlist" as MarketViewMode },
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

      <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Traders</Text>
      {traders.length === 0 ? (
        <EmptyState icon="🏪" title="No trader data" hint="Pull to refresh" />
      ) : (
        traders.map((trader) => (
          <TouchableOpacity
            key={trader.id}
            onPress={() => {
              setSelectedTrader(trader.id);
              setViewMode("traderInventory");
            }}
            activeOpacity={0.7}
          >
            <Panel style={styles.card}>
              <View style={styles.traderRow}>
                <View style={styles.traderInfo}>
                  <Text style={styles.traderName}>{trader.name}</Text>
                  <Text style={styles.traderCount}>
                    {trader.inventory.length} items
                  </Text>
                </View>
                <Text style={styles.chevron}>&#x203A;</Text>
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

    const filtered = traderSearch
      ? trader.inventory.filter((item) =>
          item.name.toLowerCase().includes(traderSearch.toLowerCase())
        )
      : trader.inventory;

    return (
      <>
        <BackHeader title="Traders" onBack={goBack} />
        <Text style={styles.sectionTitle}>{trader.name}</Text>
        <SearchBar
          value={traderSearch}
          onChangeText={setTraderSearch}
          placeholder={`Search ${trader.name}'s inventory...`}
        />
        <View style={styles.listPad}>
          {filtered.length === 0 ? (
            <EmptyState title="No items found" />
          ) : (
            filtered.map((item) => (
              <ItemRow
                key={item.id}
                name={item.name}
                subtitle={item.item_type}
                rarity={item.rarity}
                rightText={item.trader_price != null ? `${item.trader_price}` : undefined}
                onPress={() => {
                  setSelectedPriceItem(item.id);
                  setViewMode("itemPriceDetail");
                }}
              />
            ))
          )}
        </View>
      </>
    );
  };

  const renderPriceHistory = () => (
    <>
      <BackHeader title="Market" onBack={goBack} />
      <Text style={styles.sectionTitle}>Price History</Text>
      {priceHistory.length === 0 ? (
        <EmptyState
          icon="📈"
          title="No price data yet"
          hint="Price snapshots are recorded as you browse traders"
        />
      ) : (
        (() => {
          // Group by itemId
          const byItem = new Map<string, { name: string; prices: number[] }>();
          for (const snap of priceHistory) {
            const existing = byItem.get(snap.itemId);
            if (existing) {
              existing.prices.push(snap.value);
            } else {
              byItem.set(snap.itemId, { name: snap.itemId, prices: [snap.value] });
            }
          }
          return [...byItem.entries()].map(([itemId, data]) => (
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
                    <Text style={styles.priceName}>{data.name.replace(/_/g, " ")}</Text>
                    <Text style={styles.priceValue}>
                      {data.prices[data.prices.length - 1]}
                    </Text>
                  </View>
                  <Sparkline data={data.prices} width={80} height={24} />
                </View>
              </Panel>
            </TouchableOpacity>
          ));
        })()
      )}
    </>
  );

  const renderItemPriceDetail = () => {
    const snapshots = priceHistory.filter((s) => s.itemId === selectedPriceItem);
    const prices = snapshots.map((s) => s.value);
    const name = selectedPriceItem?.replace(/_/g, " ") ?? "Unknown";

    return (
      <>
        <BackHeader title="Prices" onBack={goBack} />
        <Panel>
          <Text style={styles.detailTitle}>{name}</Text>
          {prices.length > 0 && (
            <>
              <View style={styles.sparklineContainer}>
                <Sparkline data={prices} width={280} height={80} />
              </View>
              <KPIBar
                cells={[
                  { label: "Current", value: String(prices[prices.length - 1]) },
                  { label: "Min", value: String(Math.min(...prices)) },
                  { label: "Max", value: String(Math.max(...prices)) },
                ]}
              />
            </>
          )}
          {prices.length === 0 && (
            <Text style={styles.hintText}>No price data recorded for this item</Text>
          )}
        </Panel>

        {/* Watchlist toggle */}
        <TouchableOpacity
          style={styles.watchlistButton}
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
          <Text style={styles.watchlistButtonText}>
            {watchlist.some((w) => w.itemId === selectedPriceItem)
              ? "★ Remove from Watchlist"
              : "☆ Add to Watchlist"}
          </Text>
        </TouchableOpacity>
      </>
    );
  };

  const renderCraftingProfit = () => (
    <>
      <BackHeader title="Market" onBack={goBack} />
      <Text style={styles.sectionTitle}>Crafting Profit Calculator</Text>
      {craftingProfits.length === 0 ? (
        <EmptyState
          icon="💰"
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
              <Text style={styles.profitName}>{profit.itemName}</Text>
              <Text
                style={[
                  styles.profitMargin,
                  { color: profit.profitable ? Colors.green : Colors.red },
                ]}
              >
                {profit.profitMargin > 0 ? "+" : ""}{Math.round(profit.profitMargin * 100)}%
              </Text>
            </View>
            <View style={styles.profitDetails}>
              <Text style={styles.profitDetail}>Cost: {profit.totalCost}</Text>
              <Text style={styles.profitDetail}>Sell: {profit.sellValue}</Text>
              <Text
                style={[
                  styles.profitDetail,
                  { color: profit.profitable ? Colors.green : Colors.red },
                ]}
              >
                Profit: {profit.sellValue - profit.totalCost}
              </Text>
            </View>
          </Panel>
        ))
      )}
    </>
  );

  const renderWatchlist = () => (
    <>
      <BackHeader title="Market" onBack={goBack} />
      <Text style={styles.sectionTitle}>Watchlist</Text>
      {watchlist.length === 0 ? (
        <EmptyState
          icon="⭐"
          title="Watchlist empty"
          hint="Add items from trader inventories or price history"
        />
      ) : (
        watchlist.map((item) => {
          const prices = watchlistPrices[item.itemId] ?? [];
          const currentPrice = prices.length > 0 ? prices[prices.length - 1] : null;

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
                    <Text style={styles.watchName}>{item.itemName}</Text>
                    {currentPrice != null && (
                      <Text style={styles.watchPrice}>{currentPrice} value</Text>
                    )}
                  </View>
                  {prices.length > 1 && (
                    <Sparkline data={prices} width={60} height={20} />
                  )}
                  <TouchableOpacity
                    onPress={() => removeFromWatchlist(item.itemId)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.removeBtn}
                  >
                    <Text style={styles.removeText}>✕</Text>
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.header}>Market</Text>
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
  sectionTitle: { fontSize: 14, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  quickNav: { flexDirection: "row", gap: 8 },
  quickNavButton: { flex: 1, alignItems: "center", backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingVertical: 10 },
  quickNavIcon: { fontSize: 20, marginBottom: 2 },
  quickNavLabel: { fontSize: 10, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  card: { marginBottom: 8 },
  traderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  traderInfo: { flex: 1 },
  traderName: { fontSize: 16, fontWeight: "700", color: Colors.text },
  traderCount: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  chevron: { fontSize: 24, color: Colors.textMuted },
  listPad: { paddingTop: 8 },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceInfo: { flex: 1 },
  priceName: { fontSize: 14, fontWeight: "600", color: Colors.text },
  priceValue: { fontSize: 12, color: Colors.accent, marginTop: 2 },
  detailTitle: { fontSize: 18, fontWeight: "700", color: Colors.text, marginBottom: 8 },
  sparklineContainer: { alignItems: "center", paddingVertical: 10 },
  hintText: { fontSize: 13, color: Colors.textMuted, textAlign: "center", paddingVertical: 8 },
  watchlistButton: { backgroundColor: "rgba(0, 180, 216, 0.15)", borderWidth: 1, borderColor: Colors.accent, borderRadius: 8, padding: 10, alignItems: "center", marginTop: 8 },
  watchlistButtonText: { fontSize: 14, fontWeight: "700", color: Colors.accent },
  profitRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  profitName: { fontSize: 14, fontWeight: "600", color: Colors.text },
  profitMargin: { fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"] },
  profitDetails: { flexDirection: "row", gap: 12, marginTop: 6 },
  profitDetail: { fontSize: 12, color: Colors.textSecondary },
  watchRow: { flexDirection: "row", alignItems: "center" },
  watchInfo: { flex: 1 },
  watchName: { fontSize: 14, fontWeight: "600", color: Colors.text },
  watchPrice: { fontSize: 12, color: Colors.accent, marginTop: 2 },
  removeBtn: { marginLeft: 12, padding: 4 },
  removeText: { fontSize: 14, color: Colors.textMuted },
  errorPanel: { marginBottom: 10, borderColor: Colors.red },
  errorText: { fontSize: 13, color: Colors.red, textAlign: "center" },
});
