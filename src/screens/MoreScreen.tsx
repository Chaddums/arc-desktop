/**
 * MoreScreen — Tab 5: Account, squad coordination, settings, about.
 * Flat layout — all sections on one scrollable page with collapsible headers.
 * Includes fast loadout search for squad members.
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "../theme/ThemeContext";
import {
  Panel,
  Divider,
  EmptyState,
  Toggle,
  SearchBar,
} from "../components";
import type { SearchResult } from "../components/SearchBar";
import { useSettings } from "../hooks/useSettings";
import { useAlertSettings } from "../hooks/useAlertSettings";
import { useOCRSettings } from "../hooks/useOCRSettings";
import { useTheme } from "../hooks/useTheme";
import { useSquad } from "../hooks/useSquad";
import { useQuestTracker } from "../hooks/useQuestTracker";
import { useCompletedQuests } from "../hooks/useCompletedQuests";
import { useItemBrowser } from "../hooks/useItemBrowser";
import { clearAllCaches } from "../services/metaforge";
import { exportSettings, importSettings } from "../utils/settingsIO";
import { loc } from "../utils/loc";
import type { RaidTheoryQuest } from "../types";
import { useState, useCallback, useEffect, useMemo } from "react";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Fran\u00e7ais" },
  { code: "es", label: "Espa\u00f1ol" },
  { code: "pt", label: "Portugu\u00eas" },
  { code: "ja", label: "\u65e5\u672c\u8a9e" },
  { code: "ko", label: "\ud55c\uad6d\uc5b4" },
  { code: "zh", label: "\u4e2d\u6587" },
];

const DATA_SOURCES = [
  { name: "MetaForge", url: "https://metaforge.app", description: "Items, traders, event schedule" },
  { name: "RaidTheory", url: "https://github.com/RaidTheory/arcraiders-data", description: "Quests, bots, skill tree, hideout stations (MIT)" },
  { name: "ardb.app", url: "https://ardb.app", description: "Crafting recipes, item details, recycling data" },
];

const ACCOUNT_ID_KEY = "@arcview/account-id";

type SectionKey = "account" | "squad" | "settings" | "about";

const GEAR_SLOTS = ["weapon", "shield", "backpack", "explosive"] as const;
type GearSlot = (typeof GEAR_SLOTS)[number];

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { language, setLanguage } = useSettings();
  const { settings: alertSettings, update: updateAlertSettings } = useAlertSettings();
  const { settings: ocrSettings, update: updateOCRSettings } = useOCRSettings();
  const isDesktop = typeof window !== "undefined" && !!window.arcDesktop;
  const [testResult, setTestResult] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const { theme, preset, setTheme, setColorPreset } = useTheme();
  const { squad, createSquad, addMember, leaveSquad, roleAdvisory, toggleMemberQuest, addMemberQuest, removeMemberQuest, updateMemberLoadout } = useSquad();
  const { questsByTrader } = useQuestTracker();
  const { completedIds } = useCompletedQuests();
  const { items } = useItemBrowser();

  const allQuests = Object.values(questsByTrader).flat();

  // ─── Collapsible sections ─────────────────────────────────────
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    account: false,
    squad: true,
    settings: false,
    about: false,
  });

  const toggleExpand = useCallback((key: SectionKey) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ─── Account ─────────────────────────────────────────────────
  const [accountId, setAccountId] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(ACCOUNT_ID_KEY);
        if (saved) setAccountId(saved);
      } catch {}
    })();
  }, []);
  const handleAccountIdChange = useCallback((text: string) => {
    setAccountId(text);
    AsyncStorage.setItem(ACCOUNT_ID_KEY, text).catch(() => {});
  }, []);

  // ─── Squad join mode ─────────────────────────────────────────
  const [joinMode, setJoinMode] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  // ─── Squad quest board ────────────────────────────────────────
  const [questSearch, setQuestSearch] = useState("");
  const [addQuestForMember, setAddQuestForMember] = useState<string | null>(null);

  // ─── Fast loadout search ──────────────────────────────────────
  const [loadoutSearch, setLoadoutSearch] = useState("");
  const [loadoutTarget, setLoadoutTarget] = useState<{ accountId: string; slot: GearSlot } | null>(null);

  const loadoutResults = useMemo((): SearchResult[] => {
    if (!loadoutSearch || !loadoutTarget) return [];
    const q = loadoutSearch.toLowerCase();
    return items
      .filter((it) => it.name.toLowerCase().includes(q))
      .slice(0, 12)
      .map((it) => ({
        id: it.id,
        label: it.name,
        sublabel: it.item_type || undefined,
        rightLabel: it.rarity || undefined,
      }));
  }, [items, loadoutSearch, loadoutTarget]);

  const handleLoadoutSelect = useCallback(
    (result: SearchResult) => {
      if (!loadoutTarget) return;
      updateMemberLoadout(loadoutTarget.accountId, { [loadoutTarget.slot]: result.label });
      setLoadoutSearch("");
      // Auto-advance to next slot
      const idx = GEAR_SLOTS.indexOf(loadoutTarget.slot);
      if (idx < GEAR_SLOTS.length - 1) {
        setLoadoutTarget({ accountId: loadoutTarget.accountId, slot: GEAR_SLOTS[idx + 1] });
      } else {
        setLoadoutTarget(null);
      }
    },
    [loadoutTarget, updateMemberLoadout],
  );

  // ─── Quest autocomplete ──────────────────────────────────────
  const questResults = useMemo((): SearchResult[] => {
    if (!questSearch || !addQuestForMember) return [];
    const member = squad?.members.find((m) => m.accountId === addQuestForMember);
    const active = member?.activeQuestIds ?? [];
    const completed = member?.completedQuestIds ?? [];
    const q = questSearch.toLowerCase();
    return allQuests
      .filter(
        (quest) =>
          !active.includes(quest.id) &&
          !completed.includes(quest.id) &&
          loc(quest.name).toLowerCase().includes(q),
      )
      .slice(0, 12)
      .map((quest) => ({
        id: quest.id,
        label: loc(quest.name),
        sublabel: quest.trader || undefined,
      }));
  }, [questSearch, addQuestForMember, allQuests, squad]);

  // ─── Cache status ─────────────────────────────────────────────
  const [cacheStatus, setCacheStatus] = useState<string | null>(null);

  // ─── OCR Debug Log ────────────────────────────────────────────
  const [debugLogExpanded, setDebugLogExpanded] = useState(false);
  const [debugLogEntries, setDebugLogEntries] = useState<{ time: string; zone: string; confidence: number; text: string; empty: boolean }[]>([]);

  useEffect(() => {
    if (!debugLogExpanded || !isDesktop) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const entries = await window.arcDesktop?.getOCRDebugLog?.(50);
        if (!cancelled && entries) setDebugLogEntries(entries);
      } catch {}
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => { cancelled = true; clearInterval(id); };
  }, [debugLogExpanded, isDesktop]);

  // ─── Section Header ──────────────────────────────────────────
  const SectionHeader = ({ label, icon, sectionKey }: { label: string; icon: string; sectionKey: SectionKey }) => (
    <TouchableOpacity
      onPress={() => toggleExpand(sectionKey)}
      style={[styles.sectionHeader, { borderColor: C.border }]}
      activeOpacity={0.7}
    >
      <Text style={styles.sectionIcon}>{icon}</Text>
      <Text style={[styles.sectionLabel, { color: C.text }]}>{label}</Text>
      <Text style={[styles.chevron, { color: C.textMuted }]}>
        {expanded[sectionKey] ? "\u25B4" : "\u25BE"}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: C.bg }]}>
      <Text style={[styles.header, { color: C.text }]}>More</Text>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* ═══ ACCOUNT ═══ */}
        <SectionHeader label="Account" icon={"\ud83d\udc64"} sectionKey="account" />
        {expanded.account && (
          <Panel style={styles.sectionBody}>
            <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Account ID</Text>
            <TextInput
              style={[styles.fieldInput, { color: C.text, borderColor: C.border, backgroundColor: C.input }]}
              value={accountId}
              onChangeText={handleAccountIdChange}
              placeholder="Enter your account ID"
              placeholderTextColor={C.textMuted}
            />
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Sync</Text>
              <Text style={[styles.fieldValue, { color: C.accent }]}>Local Storage</Text>
            </View>
          </Panel>
        )}

        {/* ═══ SQUAD ═══ */}
        <SectionHeader label="Squad" icon={"\ud83d\udc65"} sectionKey="squad" />
        {expanded.squad && (
          <>
            {squad ? (
              <>
                {/* Squad code */}
                <Panel variant="glow" style={styles.sectionBody}>
                  <View style={styles.codeRow}>
                    <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Code</Text>
                    <TouchableOpacity
                      onPress={() => {
                        if (typeof navigator !== "undefined" && navigator.clipboard) {
                          navigator.clipboard.writeText(squad.code);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.squadCode, { color: C.accent }]}>{squad.code}</Text>
                    </TouchableOpacity>
                  </View>
                </Panel>

                {/* Members + fast loadout */}
                {squad.members.length > 0 ? (
                  squad.members.map((member) => {
                    const isLoadoutTarget = loadoutTarget?.accountId === member.accountId;

                    return (
                      <Panel key={member.accountId} style={styles.memberPanel}>
                        <View style={styles.memberRow}>
                          <View style={[styles.statusDot, { backgroundColor: member.isOnline ? C.statusOnline : C.statusOffline }]} />
                          <Text style={[styles.memberName, { color: C.text }]}>{member.displayName}</Text>
                          {member.suggestedRole && (
                            <Text style={[styles.memberRole, { color: C.accent }]}>{member.suggestedRole}</Text>
                          )}
                        </View>

                        {/* Gear slots — tap to quick-assign */}
                        <View style={styles.gearRow}>
                          {GEAR_SLOTS.map((slot) => {
                            const value = member[slot] || "--";
                            const isActive = isLoadoutTarget && loadoutTarget?.slot === slot;
                            return (
                              <TouchableOpacity
                                key={slot}
                                style={[
                                  styles.gearSlot,
                                  { borderColor: C.border },
                                  isActive && { borderColor: C.accent, backgroundColor: C.accentBg },
                                ]}
                                onPress={() => {
                                  if (isActive) {
                                    setLoadoutTarget(null);
                                    setLoadoutSearch("");
                                  } else {
                                    setLoadoutTarget({ accountId: member.accountId, slot });
                                    setLoadoutSearch("");
                                  }
                                }}
                                activeOpacity={0.6}
                              >
                                <Text style={[styles.gearSlotLabel, { color: isActive ? C.accent : C.textMuted }]}>
                                  {slot.charAt(0).toUpperCase() + slot.slice(1, 3)}
                                </Text>
                                <Text
                                  style={[styles.gearSlotValue, { color: value === "--" ? C.textMuted : C.text }]}
                                  numberOfLines={1}
                                >
                                  {value}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Fast loadout search when a slot is selected */}
                        {isLoadoutTarget && (
                          <View style={styles.loadoutSearchWrap}>
                            <SearchBar
                              value={loadoutSearch}
                              onChangeText={setLoadoutSearch}
                              placeholder={`Search ${loadoutTarget!.slot}...`}
                              results={loadoutResults}
                              onSelect={handleLoadoutSelect}
                              autoFocus
                            />
                          </View>
                        )}
                      </Panel>
                    );
                  })
                ) : (
                  <EmptyState icon={"\ud83d\udc65"} title="No members yet" hint="Share the squad code" />
                )}

                {/* Role gaps */}
                {roleAdvisory && roleAdvisory.gaps.length > 0 && (
                  <Panel style={styles.sectionBody}>
                    <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Role Gaps</Text>
                    {roleAdvisory.gaps.map((gap, i) => (
                      <Text key={i} style={[styles.gapText, { color: C.amber }]}>{gap}</Text>
                    ))}
                  </Panel>
                )}

                {/* Quest Board */}
                {squad.members.length > 0 && (
                  <>
                    <Text style={[styles.subTitle, { color: C.textSecondary }]}>Quest Board</Text>
                    {squad.members.map((member) => {
                      const active = member.activeQuestIds ?? [];
                      const completed = member.completedQuestIds ?? [];
                      const isAddingForThis = addQuestForMember === member.accountId;
                      const questMap = new Map<string, RaidTheoryQuest>();
                      allQuests.forEach((q) => questMap.set(q.id, q));

                      return (
                        <Panel key={member.accountId} style={styles.memberPanel}>
                          <View style={styles.questMemberHeader}>
                            <View style={[styles.statusDot, { backgroundColor: member.isOnline ? C.statusOnline : C.statusOffline }]} />
                            <Text style={[styles.memberName, { color: C.text, flex: 1 }]}>{member.displayName}</Text>
                            <Text style={[styles.questCount, { color: active.length > 0 ? C.accent : C.textMuted }]}>
                              {completed.length}/{active.length}
                            </Text>
                            <TouchableOpacity
                              onPress={() => setAddQuestForMember(isAddingForThis ? null : member.accountId)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Text style={[styles.addQuestIcon, { color: C.accent }]}>{isAddingForThis ? "\u2212" : "+"}</Text>
                            </TouchableOpacity>
                          </View>

                          {[...active, ...completed.filter((id) => !active.includes(id))].map((questId) => {
                            const quest = questMap.get(questId);
                            const isDone = completed.includes(questId);
                            return (
                              <View key={questId} style={styles.questRow}>
                                <TouchableOpacity
                                  style={[styles.questCheckbox, { borderColor: C.borderAccent }, isDone && { backgroundColor: C.green, borderColor: C.green }]}
                                  onPress={() => toggleMemberQuest(member.accountId, questId)}
                                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                >
                                  {isDone && <Text style={styles.questCheckmark}>{"\u2713"}</Text>}
                                </TouchableOpacity>
                                <Text
                                  style={[styles.questName, { color: C.text }, isDone && { textDecorationLine: "line-through", color: C.textMuted }]}
                                  numberOfLines={1}
                                >
                                  {quest ? loc(quest.name) : questId}
                                </Text>
                                <TouchableOpacity
                                  onPress={() => removeMemberQuest(member.accountId, questId)}
                                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                >
                                  <Text style={[styles.questRemove, { color: C.textMuted }]}>{"\u2715"}</Text>
                                </TouchableOpacity>
                              </View>
                            );
                          })}

                          {active.length === 0 && completed.length === 0 && !isAddingForThis && (
                            <Text style={[styles.hintText, { color: C.textMuted }]}>No quests — tap +</Text>
                          )}

                          {isAddingForThis && (
                            <View style={[styles.questPickerWrap, { borderColor: C.border }]}>
                              <SearchBar
                                value={questSearch}
                                onChangeText={setQuestSearch}
                                placeholder="Search quests..."
                                results={questResults}
                                onSelect={(result) => {
                                  addMemberQuest(member.accountId, result.id);
                                  setQuestSearch("");
                                }}
                                autoFocus
                              />
                            </View>
                          )}
                        </Panel>
                      );
                    })}
                  </>
                )}

                <TouchableOpacity
                  style={[styles.dangerBtn, { borderColor: C.red }]}
                  onPress={leaveSquad}
                >
                  <Text style={[styles.dangerBtnText, { color: C.red }]}>Leave Squad</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Panel style={styles.sectionBody}>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: C.accent, backgroundColor: C.accentBg }]}
                  onPress={createSquad}
                >
                  <Text style={[styles.actionBtnText, { color: C.accent }]}>Create Squad</Text>
                </TouchableOpacity>

                {!joinMode ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: C.border, marginTop: 4 }]}
                    onPress={() => setJoinMode(true)}
                  >
                    <Text style={[styles.actionBtnText, { color: C.textSecondary }]}>Join Squad</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.joinRow}>
                    <TextInput
                      style={[styles.joinInput, { color: C.text, borderColor: C.border, backgroundColor: C.input }]}
                      value={joinCode}
                      onChangeText={setJoinCode}
                      placeholder="Paste code"
                      placeholderTextColor={C.textMuted}
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity
                      style={[styles.joinBtn, { borderColor: C.accent, backgroundColor: C.accentBg }]}
                      onPress={() => { setJoinMode(false); setJoinCode(""); }}
                    >
                      <Text style={[styles.actionBtnText, { color: C.accent }]}>Join</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.joinBtn, { borderColor: C.border }]}
                      onPress={() => { setJoinMode(false); setJoinCode(""); }}
                    >
                      <Text style={[styles.actionBtnText, { color: C.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Panel>
            )}
          </>
        )}

        {/* ═══ SETTINGS ═══ */}
        <SectionHeader label="Settings" icon={"\u2699"} sectionKey="settings" />
        {expanded.settings && (
          <>
            {/* Language */}
            <Panel style={styles.sectionBody}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Language</Text>
              <View style={styles.pillRow}>
                {LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.pill, { borderColor: C.border }, language === lang.code && { borderColor: C.accent, backgroundColor: C.accentBg }]}
                    onPress={() => setLanguage(lang.code)}
                  >
                    <Text style={[styles.pillText, { color: C.textSecondary }, language === lang.code && { color: C.accent }]}>{lang.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Panel>

            {/* Theme + Preset */}
            <Panel style={styles.sectionBody}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Theme</Text>
              <View style={styles.pillRow}>
                {([{ label: "Clean", value: "clean" as const }, { label: "Tactical", value: "tactical" as const }]).map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.pill, { borderColor: C.border }, theme === opt.value && { borderColor: C.accent, backgroundColor: C.accentBg }]}
                    onPress={() => setTheme(opt.value)}
                  >
                    <Text style={[styles.pillText, { color: C.textSecondary }, theme === opt.value && { color: C.accent }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.fieldLabel, { color: C.textSecondary, marginTop: 6 }]}>Color Preset</Text>
              <View style={styles.pillRow}>
                {([{ label: "Default", value: "default" as const }, { label: "Colorblind", value: "colorblind" as const }, { label: "High Contrast", value: "highContrast" as const }]).map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.pill, { borderColor: C.border }, preset === opt.value && { borderColor: C.accent, backgroundColor: C.accentBg }]}
                    onPress={() => setColorPreset(opt.value)}
                  >
                    <Text style={[styles.pillText, { color: C.textSecondary }, preset === opt.value && { color: C.accent }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Panel>

            {/* Desktop-only: Notifications + OCR */}
            {isDesktop && (
              <>
                <Panel style={styles.sectionBody}>
                  <View style={styles.toggleRow}>
                    <Text style={[styles.toggleLabel, { color: C.text }]}>Event Notifications</Text>
                    <Toggle value={alertSettings.notifyOnEvent} onToggle={() => updateAlertSettings({ notifyOnEvent: !alertSettings.notifyOnEvent })} size="small" />
                  </View>
                  <View style={styles.toggleRow}>
                    <Text style={[styles.toggleLabel, { color: C.text }]}>Audio Alerts</Text>
                    <Toggle value={alertSettings.audioAlerts} onToggle={() => updateAlertSettings({ audioAlerts: !alertSettings.audioAlerts })} size="small" />
                  </View>
                  {alertSettings.audioAlerts && (
                    <>
                      <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Volume</Text>
                      <View style={styles.pillRow}>
                        {[0.25, 0.5, 0.75, 1.0].map((vol) => (
                          <TouchableOpacity
                            key={vol}
                            style={[styles.pill, { borderColor: C.border }, alertSettings.audioVolume === vol && { borderColor: C.accent, backgroundColor: C.accentBg }]}
                            onPress={() => updateAlertSettings({ audioVolume: vol })}
                          >
                            <Text style={[styles.pillText, { color: C.textSecondary }, alertSettings.audioVolume === vol && { color: C.accent }]}>{Math.round(vol * 100)}%</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                </Panel>

                <Panel style={styles.sectionBody}>
                  <View style={styles.toggleRow}>
                    <Text style={[styles.toggleLabel, { color: C.text }]}>Quest Auto-Tracker</Text>
                    <Toggle value={ocrSettings.enabled} onToggle={() => updateOCRSettings({ enabled: !ocrSettings.enabled })} size="small" />
                  </View>
                  {ocrSettings.enabled && (
                    <>
                      <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Capture Speed</Text>
                      <View style={styles.pillRow}>
                        {[{ label: "Fast", ms: 1000 }, { label: "Normal", ms: 1500 }, { label: "Battery", ms: 3000 }].map((opt) => (
                          <TouchableOpacity
                            key={opt.ms}
                            style={[styles.pill, { borderColor: C.border }, ocrSettings.captureIntervalMs === opt.ms && { borderColor: C.accent, backgroundColor: C.accentBg }]}
                            onPress={() => updateOCRSettings({ captureIntervalMs: opt.ms })}
                          >
                            <Text style={[styles.pillText, { color: C.textSecondary }, ocrSettings.captureIntervalMs === opt.ms && { color: C.accent }]}>{opt.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Match Sensitivity</Text>
                      <View style={styles.pillRow}>
                        {[{ label: "Strict", val: 0.85 }, { label: "Normal", val: 0.7 }, { label: "Loose", val: 0.55 }].map((opt) => (
                          <TouchableOpacity
                            key={opt.val}
                            style={[styles.pill, { borderColor: C.border }, ocrSettings.matchThreshold === opt.val && { borderColor: C.accent, backgroundColor: C.accentBg }]}
                            onPress={() => updateOCRSettings({ matchThreshold: opt.val })}
                          >
                            <Text style={[styles.pillText, { color: C.textSecondary }, ocrSettings.matchThreshold === opt.val && { color: C.accent }]}>{opt.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Active Zones</Text>
                      {[
                        { id: "objectiveComplete", label: "Objective Complete" },
                        { id: "itemPickup", label: "Item Pickup" },
                        { id: "killFeed", label: "Kill Feed" },
                        { id: "centerPopup", label: "Center Popup" },
                      ].map((zone) => {
                        const active = ocrSettings.activeZones.includes(zone.id);
                        return (
                          <View key={zone.id} style={styles.toggleRow}>
                            <Text style={[styles.zoneLabel, { color: C.text }]}>{zone.label}</Text>
                            <Toggle
                              value={active}
                              onToggle={() => {
                                const zones = active
                                  ? ocrSettings.activeZones.filter((z) => z !== zone.id)
                                  : [...ocrSettings.activeZones, zone.id];
                                updateOCRSettings({ activeZones: zones });
                              }}
                              size="small"
                            />
                          </View>
                        );
                      })}

                      <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: C.borderAccent, backgroundColor: C.accentBg, marginTop: 4 }]}
                        onPress={async () => {
                          setTestResult("Capturing...");
                          const result = await window.arcDesktop?.testOCRCapture?.();
                          if (result) {
                            setTestResult(`Screen: ${result.screenWidth}x${result.screenHeight} | ${result.zones.length} zones`);
                          } else {
                            setTestResult("Capture failed");
                          }
                        }}
                      >
                        <Text style={[styles.actionBtnText, { color: C.accent }]}>Test Capture</Text>
                      </TouchableOpacity>
                      {testResult && <Text style={[styles.hintText, { color: C.textSecondary }]}>{testResult}</Text>}

                      {/* Debug log */}
                      <TouchableOpacity
                        style={styles.debugToggle}
                        onPress={() => setDebugLogExpanded(!debugLogExpanded)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.fieldLabel, { color: C.textSecondary, flex: 1 }]}>OCR Debug Log</Text>
                        <Text style={{ color: C.textMuted, fontSize: 12 }}>{debugLogExpanded ? "\u25B4" : "\u25BE"}</Text>
                      </TouchableOpacity>

                      {debugLogExpanded && (
                        <View>
                          <View style={styles.debugActions}>
                            <TouchableOpacity
                              style={[styles.smallBtn, { borderColor: C.border }]}
                              onPress={() => { window.arcDesktop?.clearOCRDebugLog?.(); setDebugLogEntries([]); }}
                            >
                              <Text style={{ color: C.red, fontSize: 11, fontWeight: "600" }}>Clear</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.smallBtn, { borderColor: C.border }]}
                              onPress={async () => {
                                const logPath = await window.arcDesktop?.getOCRLogPath?.();
                                if (logPath) Linking.openURL("file://" + logPath);
                              }}
                            >
                              <Text style={{ color: C.accent, fontSize: 11, fontWeight: "600" }}>Open File</Text>
                            </TouchableOpacity>
                          </View>
                          <ScrollView style={styles.debugScroll} nestedScrollEnabled>
                            {debugLogEntries.length === 0 ? (
                              <Text style={[styles.hintText, { color: C.textMuted }]}>No results yet</Text>
                            ) : (
                              debugLogEntries.map((entry, i) => (
                                <View key={i} style={[styles.debugRow, entry.empty && { opacity: 0.4 }]}>
                                  <Text style={[styles.debugTime, { color: C.textMuted }]}>{entry.time}</Text>
                                  <Text style={[styles.debugZone, { color: C.accent }]}>{entry.zone}</Text>
                                  <Text style={[styles.debugConf, { color: entry.confidence >= 70 ? C.green : entry.confidence >= 40 ? C.amber : C.red }]}>{entry.confidence}%</Text>
                                  <Text style={[styles.debugText, { color: C.text }]} numberOfLines={1}>{entry.text || "(empty)"}</Text>
                                </View>
                              ))
                            )}
                          </ScrollView>
                        </View>
                      )}
                    </>
                  )}
                </Panel>

                {/* Window Size */}
                <Panel style={styles.sectionBody}>
                  <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Window Size</Text>
                  <View style={styles.pillRow}>
                    {[{ label: "Default", preset: "default" as const }, { label: "Large", preset: "large" as const }, { label: "XL", preset: "xl" as const }].map((opt) => (
                      <TouchableOpacity
                        key={opt.preset}
                        style={[styles.pill, { borderColor: C.border }]}
                        onPress={() => window.arcDesktop?.windowSetSize(opt.preset)}
                      >
                        <Text style={[styles.pillText, { color: C.textSecondary }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Panel>
              </>
            )}

            {/* Data + Backup */}
            <Panel style={styles.sectionBody}>
              <TouchableOpacity onPress={() => { clearAllCaches(); setCacheStatus("Cleared!"); setTimeout(() => setCacheStatus(null), 3000); }}>
                <Text style={{ color: C.amber, fontSize: 13, fontWeight: "600" }}>Clear All Caches</Text>
              </TouchableOpacity>
              {cacheStatus && <Text style={[styles.hintText, { color: C.green }]}>{cacheStatus}</Text>}
              <Divider />
              <View style={styles.backupRow}>
                <TouchableOpacity
                  style={[styles.smallBtn, { borderColor: C.borderAccent, backgroundColor: C.accentBg }]}
                  onPress={async () => {
                    try {
                      const json = await exportSettings();
                      if (navigator?.clipboard) { await navigator.clipboard.writeText(json); setExportStatus("Copied!"); }
                    } catch { setExportStatus("Failed"); }
                    setTimeout(() => setExportStatus(null), 3000);
                  }}
                >
                  <Text style={{ color: C.accent, fontSize: 11, fontWeight: "700" }}>Export</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallBtn, { borderColor: C.borderAccent, backgroundColor: C.accentBg }]}
                  onPress={async () => {
                    try {
                      if (navigator?.clipboard) {
                        const json = await navigator.clipboard.readText();
                        const count = await importSettings(json);
                        setExportStatus(`Imported ${count} — reload to apply`);
                      }
                    } catch { setExportStatus("Invalid data"); }
                    setTimeout(() => setExportStatus(null), 4000);
                  }}
                >
                  <Text style={{ color: C.accent, fontSize: 11, fontWeight: "700" }}>Import</Text>
                </TouchableOpacity>
              </View>
              {exportStatus && <Text style={[styles.hintText, { color: C.textSecondary }]}>{exportStatus}</Text>}
            </Panel>
          </>
        )}

        {/* ═══ ABOUT ═══ */}
        <SectionHeader label="About" icon={"\u2139"} sectionKey="about" />
        {expanded.about && (
          <>
            <Panel style={styles.sectionBody}>
              <Text style={[styles.appName, { color: C.accent }]}>ARC View</Text>
              <Text style={[styles.hintText, { color: C.textSecondary }]}>v0.2.0 by Couloir</Text>
            </Panel>
            {DATA_SOURCES.map((src) => (
              <TouchableOpacity key={src.name} onPress={() => Linking.openURL(src.url)} activeOpacity={0.7}>
                <Panel style={styles.memberPanel}>
                  <Text style={[styles.memberName, { color: C.text }]}>{src.name}</Text>
                  <Text style={[styles.hintText, { color: C.textSecondary }]}>{src.description}</Text>
                </Panel>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: 12 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 18, fontWeight: "700", paddingHorizontal: 8, paddingTop: 4, paddingBottom: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 6, paddingBottom: 8 },

  // ─── Section Headers ──────────────────────────────────────────
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    marginTop: 2,
  },
  sectionIcon: { fontSize: 16, marginRight: 8 },
  sectionLabel: { flex: 1, fontSize: 15, fontWeight: "700" },
  chevron: { fontSize: 14 },
  sectionBody: { marginBottom: 4 },
  subTitle: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginTop: 8, marginBottom: 4, paddingHorizontal: 4 },

  // ─── Fields ───────────────────────────────────────────────────
  fieldLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  fieldValue: { fontSize: 13, fontWeight: "600" },
  fieldInput: { fontSize: 13, fontWeight: "600", marginTop: 2, marginBottom: 4, borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  fieldRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },

  // ─── Squad ────────────────────────────────────────────────────
  codeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  squadCode: { fontSize: 20, fontWeight: "700", letterSpacing: 4 },
  memberPanel: { marginBottom: 4 },
  memberRow: { flexDirection: "row", alignItems: "center" },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 8 },
  memberName: { fontSize: 13, fontWeight: "600" },
  memberRole: { fontSize: 10, fontWeight: "700", marginLeft: 8 },

  // ─── Gear slots (fast assign) ─────────────────────────────────
  gearRow: { flexDirection: "row", gap: 3, marginTop: 4 },
  gearSlot: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  gearSlotLabel: { fontSize: 8, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  gearSlotValue: { fontSize: 10, fontWeight: "600", marginTop: 1 },
  loadoutSearchWrap: { marginTop: 4 },

  // ─── Quest board ──────────────────────────────────────────────
  questMemberHeader: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  questCount: { fontSize: 12, fontWeight: "700", fontVariant: ["tabular-nums"], marginRight: 6 },
  addQuestIcon: { fontSize: 18, fontWeight: "700", width: 22, textAlign: "center" },
  questRow: { flexDirection: "row", alignItems: "center", paddingVertical: 3, paddingLeft: 15 },
  questCheckbox: { width: 16, height: 16, borderRadius: 3, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginRight: 6 },
  questCheckmark: { fontSize: 10, fontWeight: "700", color: "#fff" },
  questName: { fontSize: 12, fontWeight: "500", flex: 1 },
  questRemove: { fontSize: 12, padding: 3 },
  questPickerWrap: { borderTopWidth: 1, marginTop: 4, paddingTop: 4 },
  hintText: { fontSize: 11, textAlign: "center", paddingVertical: 2 },

  // ─── Actions ──────────────────────────────────────────────────
  actionBtn: { borderWidth: 1, borderRadius: 4, paddingVertical: 6, alignItems: "center" },
  actionBtnText: { fontSize: 13, fontWeight: "700" },
  dangerBtn: { borderWidth: 1, borderRadius: 4, paddingVertical: 6, alignItems: "center", marginTop: 6, marginBottom: 4 },
  dangerBtnText: { fontSize: 13, fontWeight: "700" },
  joinRow: { flexDirection: "row", gap: 4, alignItems: "center", marginTop: 4 },
  joinInput: { flex: 1, fontSize: 13, borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, letterSpacing: 2 },
  joinBtn: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4 },

  // ─── Pills / Toggles ─────────────────────────────────────────
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2, marginBottom: 4 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: "600" },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  toggleLabel: { fontSize: 13, fontWeight: "600" },
  zoneLabel: { fontSize: 12, fontWeight: "500" },
  gapText: { fontSize: 11, fontWeight: "500", marginBottom: 2 },

  // ─── Backup ───────────────────────────────────────────────────
  backupRow: { flexDirection: "row", gap: 4, marginTop: 4 },
  smallBtn: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4 },

  // ─── Debug log ────────────────────────────────────────────────
  debugToggle: { flexDirection: "row", alignItems: "center", paddingVertical: 4, marginTop: 4 },
  debugActions: { flexDirection: "row", gap: 4, marginBottom: 4 },
  debugScroll: { maxHeight: 200 },
  debugRow: { flexDirection: "row", alignItems: "center", paddingVertical: 2, gap: 4 },
  debugTime: { fontSize: 9, fontFamily: "monospace", width: 48 },
  debugZone: { fontSize: 9, fontWeight: "700", width: 70 },
  debugConf: { fontSize: 9, fontWeight: "700", fontFamily: "monospace", width: 28, textAlign: "right" },
  debugText: { fontSize: 10, fontFamily: "monospace", flex: 1 },

  // ─── About ────────────────────────────────────────────────────
  appName: { fontSize: 20, fontWeight: "700", textAlign: "center" },
});
