/**
 * MoreScreen — Tab 5: Account, squad coordination, settings, about.
 * Absorbs AboutScreen.
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
  BackHeader,
  EmptyState,
  ProgressBar,
  Toggle,
} from "../components";
import { useSettings } from "../hooks/useSettings";
import { useAlertSettings } from "../hooks/useAlertSettings";
import { useOCRSettings } from "../hooks/useOCRSettings";
import { useTheme } from "../hooks/useTheme";
import { useSquad } from "../hooks/useSquad";
import { useQuestTracker } from "../hooks/useQuestTracker";
import { useCompletedQuests } from "../hooks/useCompletedQuests";
import { clearAllCaches } from "../services/metaforge";
import { exportSettings, importSettings } from "../utils/settingsIO";
import { loc } from "../utils/loc";
import type { MoreViewMode, SquadMember, RaidTheoryQuest } from "../types";
import { useState, useCallback, useEffect } from "react";
import { SearchBar } from "../components";

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
  const { squad, createSquad, addMember, leaveSquad, roleAdvisory, toggleMemberQuest, addMemberQuest, removeMemberQuest } = useSquad();
  const { questsByTrader } = useQuestTracker();
  const { completedIds } = useCompletedQuests();

  // All quests flat for quest picker
  const allQuests = Object.values(questsByTrader).flat();

  const [viewMode, setViewMode] = useState<MoreViewMode>("menu");
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  // Phase 8a: Squad join mode
  const [joinMode, setJoinMode] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  // Phase 8b: Account ID
  const [accountId, setAccountId] = useState("");

  // Phase 8d: Cache status feedback
  const [cacheStatus, setCacheStatus] = useState<string | null>(null);

  // Squad quest board
  const [questSearch, setQuestSearch] = useState("");
  const [addQuestForMember, setAddQuestForMember] = useState<string | null>(null);

  // Load account ID on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(ACCOUNT_ID_KEY);
        if (saved) setAccountId(saved);
      } catch {}
    })();
  }, []);

  // Save account ID on change
  const handleAccountIdChange = useCallback((text: string) => {
    setAccountId(text);
    AsyncStorage.setItem(ACCOUNT_ID_KEY, text).catch(() => {});
  }, []);

  const goBack = useCallback(() => {
    if (viewMode === "squadMember") {
      setSelectedMember(null);
      setViewMode("squad");
    } else {
      setViewMode("menu");
    }
  }, [viewMode]);

  const renderMenu = () => (
    <>
      {[
        { label: "Account", icon: "\ud83d\udc64", mode: "account" as MoreViewMode },
        { label: "Squad", icon: "\ud83d\udc65", mode: "squad" as MoreViewMode },
        { label: "Settings", icon: "\u2699", mode: "settings" as MoreViewMode },
        { label: "About", icon: "\u2139", mode: "about" as MoreViewMode },
      ].map((item) => (
        <TouchableOpacity
          key={item.mode}
          onPress={() => setViewMode(item.mode)}
          activeOpacity={0.7}
        >
          <Panel style={styles.menuItem}>
            <View style={styles.menuRow}>
              <Text style={[styles.menuIcon]}>{item.icon}</Text>
              <Text style={[styles.menuLabel, { color: C.text }]}>{item.label}</Text>
              <Text style={[styles.chevron, { color: C.textMuted }]}>&#x203A;</Text>
            </View>
          </Panel>
        </TouchableOpacity>
      ))}
    </>
  );

  const renderAccount = () => (
    <>
      <BackHeader title="More" onBack={goBack} />
      <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Account</Text>
      <Panel>
        <Text style={[styles.accountLabel, { color: C.textSecondary }]}>Account ID</Text>
        <TextInput
          style={[styles.accountInput, { color: C.text, borderColor: C.border, backgroundColor: C.input }]}
          value={accountId}
          onChangeText={handleAccountIdChange}
          placeholder="Enter your account ID"
          placeholderTextColor={C.textMuted}
        />
        <Divider />
        <Text style={[styles.accountLabel, { color: C.textSecondary }]}>Sync Status</Text>
        <Text style={[styles.accountValue, { color: C.accent }]}>Local Storage</Text>
        <Text style={[styles.accountHint, { color: C.textMuted }]}>
          Your data is stored on this device. Use the export/import buttons in Settings to back up or transfer your data.
        </Text>
      </Panel>
    </>
  );

  const renderSquad = () => (
    <>
      <BackHeader title="More" onBack={goBack} />
      <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Squad</Text>

      {squad ? (
        <>
          <Panel variant="glow">
            <Text style={[styles.squadCodeLabel, { color: C.textSecondary }]}>Squad Code</Text>
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
            <Text style={[styles.squadHint, { color: C.textMuted }]}>Tap code to copy. Share with your team.</Text>
          </Panel>

          {squad.members.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: C.textSecondary, marginTop: 10 }]}>Members</Text>
              {squad.members.map((member) => (
                <TouchableOpacity
                  key={member.accountId}
                  onPress={() => {
                    setSelectedMember(member.accountId);
                    setViewMode("squadMember");
                  }}
                >
                  <Panel style={styles.memberCard}>
                    <View style={styles.memberRow}>
                      <View style={[styles.statusDot, {
                        backgroundColor: member.isOnline ? C.statusOnline : C.statusOffline
                      }]} />
                      <View style={styles.memberInfo}>
                        <Text style={[styles.memberName, { color: C.text }]}>{member.displayName}</Text>
                        {member.loadoutSummary && (
                          <Text style={[styles.memberLoadout, { color: C.textSecondary }]}>{member.loadoutSummary}</Text>
                        )}
                      </View>
                      {member.suggestedRole && (
                        <Text style={[styles.memberRole, { color: C.accent }]}>{member.suggestedRole}</Text>
                      )}
                      <Text style={[styles.chevron, { color: C.textMuted }]}>&#x203A;</Text>
                    </View>
                  </Panel>
                </TouchableOpacity>
              ))}
            </>
          )}

          {squad.members.length === 0 && (
            <EmptyState icon="\ud83d\udc65" title="No members yet" hint="Share the squad code" />
          )}

          {roleAdvisory && roleAdvisory.gaps.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: C.textSecondary, marginTop: 10 }]}>Role Gaps</Text>
              <Panel>
                {roleAdvisory.gaps.map((gap, i) => (
                  <Text key={i} style={[styles.roleGapText, { color: C.amber }]}>{gap}</Text>
                ))}
              </Panel>
            </>
          )}

          {/* ── Quest Board ── */}
          <Text style={[styles.sectionTitle, { color: C.textSecondary, marginTop: 12 }]}>Quest Board</Text>
          <Text style={[styles.questBoardHint, { color: C.textMuted }]}>
            Track what quests your squad is working on. Tap a quest to mark it done.
          </Text>

          {squad.members.length === 0 ? (
            <EmptyState icon={"\ud83d\udcdd"} title="Add members to track quests" />
          ) : (
            squad.members.map((member) => {
              const active = member.activeQuestIds ?? [];
              const completed = member.completedQuestIds ?? [];
              const totalQuests = active.length;
              const doneCount = completed.length;
              const isAddingForThis = addQuestForMember === member.accountId;

              // Resolve quest names
              const questMap = new Map<string, RaidTheoryQuest>();
              allQuests.forEach((q) => questMap.set(q.id, q));

              // Filtered quest list for adding
              const searchLower = questSearch.toLowerCase();
              const availableQuests = allQuests.filter(
                (q) =>
                  !active.includes(q.id) &&
                  !completed.includes(q.id) &&
                  (searchLower === "" || loc(q.name).toLowerCase().includes(searchLower))
              );

              return (
                <Panel key={member.accountId} style={{ marginBottom: 6 }}>
                  <View style={styles.questMemberHeader}>
                    <View style={[styles.statusDot, { backgroundColor: member.isOnline ? C.statusOnline : C.statusOffline }]} />
                    <Text style={[styles.memberName, { color: C.text, flex: 1 }]}>{member.displayName}</Text>
                    <Text style={[styles.questCount, { color: totalQuests > 0 ? C.accent : C.textMuted }]}>
                      {doneCount}/{totalQuests}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setAddQuestForMember(isAddingForThis ? null : member.accountId)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={[styles.addQuestIcon, { color: C.accent }]}>{isAddingForThis ? "\u2212" : "+"}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Active & completed quests */}
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
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.questName, { color: C.text }, isDone && { textDecorationLine: "line-through", color: C.textMuted }]}
                            numberOfLines={1}
                          >
                            {quest ? loc(quest.name) : questId}
                          </Text>
                          {quest?.trader && (
                            <Text style={[styles.questTrader, { color: C.textSecondary }]}>{quest.trader}</Text>
                          )}
                        </View>
                        <TouchableOpacity
                          onPress={() => removeMemberQuest(member.accountId, questId)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Text style={[styles.questRemove, { color: C.textMuted }]}>{"\u2715"}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}

                  {totalQuests === 0 && !isAddingForThis && (
                    <Text style={[styles.noQuestsHint, { color: C.textMuted }]}>No quests tracked — tap + to add</Text>
                  )}

                  {/* Quest picker */}
                  {isAddingForThis && (
                    <View style={[styles.questPickerContainer, { borderColor: C.border }]}>
                      <SearchBar value={questSearch} onChangeText={setQuestSearch} placeholder="Search quests..." />
                      <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                        {availableQuests.slice(0, 20).map((q) => (
                          <TouchableOpacity
                            key={q.id}
                            style={[styles.questPickerRow, { borderBottomColor: C.border }]}
                            onPress={() => {
                              addMemberQuest(member.accountId, q.id);
                              setQuestSearch("");
                            }}
                          >
                            <Text style={[styles.questPickerName, { color: C.text }]} numberOfLines={1}>{loc(q.name)}</Text>
                            {q.trader && <Text style={[styles.questPickerTrader, { color: C.accent }]}>{q.trader}</Text>}
                          </TouchableOpacity>
                        ))}
                        {availableQuests.length === 0 && (
                          <Text style={[styles.noQuestsHint, { color: C.textMuted, paddingVertical: 8 }]}>No matching quests</Text>
                        )}
                      </ScrollView>
                    </View>
                  )}
                </Panel>
              );
            })
          )}

          <View style={{ marginTop: 12 }}>
            <TouchableOpacity
              style={[styles.squadButton, { borderColor: C.red, backgroundColor: "transparent" }]}
              onPress={() => { leaveSquad(); }}
            >
              <Text style={[styles.squadButtonText, { color: C.red }]}>Leave Squad</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <Panel>
          <Text style={[styles.squadHint, { color: C.textMuted }]}>
            Create or join a squad to coordinate loadouts and get role suggestions.
          </Text>
          <TouchableOpacity
            style={[styles.squadButton, { borderColor: C.accent, backgroundColor: C.accentBg }]}
            onPress={() => { createSquad(); }}
          >
            <Text style={[styles.squadButtonText, { color: C.accent }]}>Create Squad</Text>
          </TouchableOpacity>

          {!joinMode ? (
            <TouchableOpacity
              style={[styles.squadButton, styles.squadButtonSecondary, { borderColor: C.border }]}
              onPress={() => setJoinMode(true)}
            >
              <Text style={[styles.squadButtonTextSecondary, { color: C.textSecondary }]}>Join Squad</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.joinRow}>
              <TextInput
                style={[styles.joinInput, { color: C.text, borderColor: C.border, backgroundColor: C.input }]}
                value={joinCode}
                onChangeText={setJoinCode}
                placeholder="Paste squad code"
                placeholderTextColor={C.textMuted}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[styles.joinConfirmButton, { borderColor: C.accent, backgroundColor: C.accentBg }]}
                onPress={() => {
                  // Join logic placeholder — would need backend
                  setJoinMode(false);
                  setJoinCode("");
                }}
              >
                <Text style={[styles.squadButtonText, { color: C.accent }]}>Join</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.joinCancelButton, { borderColor: C.border }]}
                onPress={() => { setJoinMode(false); setJoinCode(""); }}
              >
                <Text style={[styles.squadButtonTextSecondary, { color: C.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </Panel>
      )}
    </>
  );

  const renderSquadMember = () => {
    const members = squad?.members ?? [];
    const member = members.find((m) => m.accountId === selectedMember);
    if (!member) return <EmptyState title="Member not found" />;

    return (
      <>
        <BackHeader title="Squad" onBack={goBack} />
        <Panel>
          <View style={styles.memberDetailHeader}>
            <View style={[styles.statusDotLarge, {
              backgroundColor: member.isOnline ? C.statusOnline : C.statusOffline
            }]} />
            <Text style={[styles.detailTitle, { color: C.text }]}>{member.displayName}</Text>
          </View>
          {member.loadoutSummary && (
            <Text style={[styles.memberLoadout, { color: C.textSecondary }]}>{member.loadoutSummary}</Text>
          )}
          {member.suggestedRole && (
            <>
              <Divider />
              <Text style={[styles.subHeading, { color: C.textSecondary }]}>Suggested Role</Text>
              <Text style={[styles.roleText, { color: C.accent }]}>{member.suggestedRole}</Text>
            </>
          )}
        </Panel>

        {/* Member's quests */}
        {((member.activeQuestIds ?? []).length > 0 || (member.completedQuestIds ?? []).length > 0) && (
          <>
            <Text style={[styles.sectionTitle, { color: C.textSecondary, marginTop: 10 }]}>Quests</Text>
            <Panel>
              {[...(member.activeQuestIds ?? []), ...(member.completedQuestIds ?? []).filter((id) => !(member.activeQuestIds ?? []).includes(id))].map((questId) => {
                const quest = allQuests.find((q) => q.id === questId);
                const isDone = (member.completedQuestIds ?? []).includes(questId);
                return (
                  <View key={questId} style={styles.questRow}>
                    <TouchableOpacity
                      style={[styles.questCheckbox, { borderColor: C.borderAccent }, isDone && { backgroundColor: C.green, borderColor: C.green }]}
                      onPress={() => toggleMemberQuest(member.accountId, questId)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      {isDone && <Text style={styles.questCheckmark}>{"\u2713"}</Text>}
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.questName, { color: C.text }, isDone && { textDecorationLine: "line-through", color: C.textMuted }]}
                        numberOfLines={2}
                      >
                        {quest ? loc(quest.name) : questId}
                      </Text>
                      {quest?.trader && <Text style={[styles.questTrader, { color: C.textSecondary }]}>{quest.trader}</Text>}
                    </View>
                  </View>
                );
              })}
            </Panel>
          </>
        )}
      </>
    );
  };

  const renderSettings = () => (
    <>
      <BackHeader title="More" onBack={goBack} />
      <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Language</Text>
      <Panel>
        <View style={styles.langGrid}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langPill, { borderColor: C.border }, language === lang.code && { borderColor: C.accent, backgroundColor: C.accentBg }]}
              onPress={() => setLanguage(lang.code)}
            >
              <Text style={[styles.langText, { color: C.textSecondary }, language === lang.code && { color: C.accent }]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.langHint, { color: C.textMuted }]}>
          Affects game data (enemies, maps, quests). UI is English.
        </Text>
      </Panel>

      <Divider />

      <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Theme</Text>
      <Panel>
        <View style={styles.volumeRow}>
          {[
            { label: "Clean", value: "clean" as const },
            { label: "Tactical", value: "tactical" as const },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.volumePill, { borderColor: C.border }, theme === opt.value && { borderColor: C.accent, backgroundColor: C.accentBg }]}
              onPress={() => setTheme(opt.value)}
            >
              <Text style={[styles.volumeText, { color: C.textSecondary }, theme === opt.value && { color: C.accent }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Panel>

      <Divider />

      <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Color Preset</Text>
      <Panel>
        <View style={styles.volumeRow}>
          {[
            { label: "Default", value: "default" as const },
            { label: "Colorblind", value: "colorblind" as const },
            { label: "High Contrast", value: "highContrast" as const },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.volumePill, { borderColor: C.border }, preset === opt.value && { borderColor: C.accent, backgroundColor: C.accentBg }]}
              onPress={() => setColorPreset(opt.value)}
            >
              <Text style={[styles.volumeText, { color: C.textSecondary }, preset === opt.value && { color: C.accent }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.langHint, { color: C.textMuted }]}>
          Adjusts green/red indicators for accessibility
        </Text>
      </Panel>

      {isDesktop && (
        <>
          <Divider />

          <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Notifications</Text>
          <Panel>
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: C.text }]}>Event Notifications</Text>
              <Toggle value={alertSettings.notifyOnEvent} onToggle={() => updateAlertSettings({ notifyOnEvent: !alertSettings.notifyOnEvent })} size="small" />
            </View>

            <Divider />

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: C.text }]}>Audio Alerts</Text>
              <Toggle value={alertSettings.audioAlerts} onToggle={() => updateAlertSettings({ audioAlerts: !alertSettings.audioAlerts })} size="small" />
            </View>

            {alertSettings.audioAlerts && (
              <>
                <Divider />
                <Text style={[styles.volumeLabel, { color: C.textSecondary }]}>Volume</Text>
                <View style={styles.volumeRow}>
                  {[0.25, 0.5, 0.75, 1.0].map((vol) => (
                    <TouchableOpacity
                      key={vol}
                      style={[
                        styles.volumePill,
                        { borderColor: C.border },
                        alertSettings.audioVolume === vol && { borderColor: C.accent, backgroundColor: C.accentBg },
                      ]}
                      onPress={() => updateAlertSettings({ audioVolume: vol })}
                    >
                      <Text
                        style={[
                          styles.volumeText,
                          { color: C.textSecondary },
                          alertSettings.audioVolume === vol && { color: C.accent },
                        ]}
                      >
                        {Math.round(vol * 100)}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </Panel>

          <Divider />

          <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Quest Auto-Tracker</Text>
          <Panel>
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: C.text }]}>Auto-Track</Text>
              <Toggle value={ocrSettings.enabled} onToggle={() => updateOCRSettings({ enabled: !ocrSettings.enabled })} size="small" />
            </View>
            <Text style={[styles.autoTrackDesc, { color: C.textMuted }]}>
              Captures your game screen to auto-detect quest completion, item pickups, and kills
            </Text>

            {ocrSettings.enabled && (
              <>
                <Divider />
                <Text style={[styles.volumeLabel, { color: C.textSecondary }]}>Capture Speed</Text>
                <View style={styles.volumeRow}>
                  {[
                    { label: "Fast", ms: 1000 },
                    { label: "Normal", ms: 1500 },
                    { label: "Battery Saver", ms: 3000 },
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.ms}
                      style={[
                        styles.volumePill,
                        { borderColor: C.border },
                        ocrSettings.captureIntervalMs === opt.ms && { borderColor: C.accent, backgroundColor: C.accentBg },
                      ]}
                      onPress={() => updateOCRSettings({ captureIntervalMs: opt.ms })}
                    >
                      <Text
                        style={[
                          styles.volumeText,
                          { color: C.textSecondary },
                          ocrSettings.captureIntervalMs === opt.ms && { color: C.accent },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Divider />
                <Text style={[styles.volumeLabel, { color: C.textSecondary }]}>Match Sensitivity</Text>
                <View style={styles.volumeRow}>
                  {[
                    { label: "Strict", val: 0.85 },
                    { label: "Normal", val: 0.7 },
                    { label: "Loose", val: 0.55 },
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.val}
                      style={[
                        styles.volumePill,
                        { borderColor: C.border },
                        ocrSettings.matchThreshold === opt.val && { borderColor: C.accent, backgroundColor: C.accentBg },
                      ]}
                      onPress={() => updateOCRSettings({ matchThreshold: opt.val })}
                    >
                      <Text
                        style={[
                          styles.volumeText,
                          { color: C.textSecondary },
                          ocrSettings.matchThreshold === opt.val && { color: C.accent },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Divider />
                <Text style={[styles.volumeLabel, { color: C.textSecondary }]}>Active Zones</Text>
                {[
                  { id: "objectiveComplete", label: "Objective Complete (top-center)" },
                  { id: "itemPickup", label: "Item Pickup (lower-right)" },
                  { id: "killFeed", label: "Kill Feed (upper-right)" },
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

                <Divider />
                <TouchableOpacity
                  style={[styles.testButton, { borderColor: C.borderAccent, backgroundColor: C.accentBg }]}
                  onPress={async () => {
                    setTestResult("Capturing...");
                    const result = await window.arcDesktop?.testOCRCapture?.();
                    if (result) {
                      setTestResult(
                        JSON.stringify({
                          screen: `${result.screenWidth}x${result.screenHeight}`,
                          zones: result.zones.map((z: any) => ({ zone: z.zone, size: `${z.width}x${z.height}` })),
                        })
                      );
                    } else {
                      setTestResult("Capture failed \u2014 is the game running?");
                    }
                  }}
                >
                  <Text style={[styles.testButtonText, { color: C.accent }]}>Test Capture</Text>
                </TouchableOpacity>
                {testResult && testResult !== "Capturing..." && testResult.startsWith("{") ? (
                  (() => {
                    try {
                      const data = JSON.parse(testResult);
                      return (
                        <Panel style={{ marginTop: 8 }}>
                          <View style={styles.testResultRow}>
                            <Text style={[styles.testResultLabel, { color: C.textSecondary }]}>Screen</Text>
                            <Text style={[styles.testResultValue, { color: C.text }]}>{data.screen}</Text>
                          </View>
                          {data.zones?.map((z: any, i: number) => (
                            <View key={i} style={styles.testResultRow}>
                              <Text style={[styles.testResultLabel, { color: C.textSecondary }]}>{z.zone}</Text>
                              <Text style={[styles.testResultValue, { color: C.text }]}>{z.size}</Text>
                            </View>
                          ))}
                        </Panel>
                      );
                    } catch {
                      return <Text style={[styles.testResultText, { color: C.textSecondary }]}>{testResult}</Text>;
                    }
                  })()
                ) : testResult ? (
                  <Text style={[styles.testResultText, { color: C.textSecondary }]}>{testResult}</Text>
                ) : null}
              </>
            )}
          </Panel>
        </>
      )}

      {isDesktop && (
        <>
          <Divider />
          <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Window Size</Text>
          <Panel>
            <View style={styles.volumeRow}>
              {[
                { label: "Default", preset: "default" as const },
                { label: "Large", preset: "large" as const },
                { label: "XL", preset: "xl" as const },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.preset}
                  style={[styles.volumePill, { borderColor: C.border }]}
                  onPress={() => window.arcDesktop?.windowSetSize(opt.preset)}
                >
                  <Text style={[styles.volumeText, { color: C.textSecondary }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Panel>
        </>
      )}

      <Divider />

      <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Data</Text>
      <TouchableOpacity
        onPress={() => {
          clearAllCaches();
          setCacheStatus("Caches cleared!");
          setTimeout(() => setCacheStatus(null), 3000);
        }}
        activeOpacity={0.7}
      >
        <Panel>
          <Text style={[styles.cacheButton, { color: C.amber }]}>Clear All Caches</Text>
          <Text style={[styles.cacheHint, { color: C.textMuted }]}>Forces fresh data on next load (15-min TTL)</Text>
        </Panel>
      </TouchableOpacity>
      {cacheStatus && (
        <Text style={[styles.cacheStatusText, { color: C.green }]}>{cacheStatus}</Text>
      )}

      <Divider />

      <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Settings Backup</Text>
      <Panel>
        <TouchableOpacity
          style={[styles.testButton, { borderColor: C.borderAccent, backgroundColor: C.accentBg }]}
          onPress={async () => {
            try {
              const json = await exportSettings();
              if (typeof navigator !== "undefined" && navigator.clipboard) {
                await navigator.clipboard.writeText(json);
                setExportStatus("Copied to clipboard!");
              } else {
                setExportStatus("Export ready (check console)");
                console.log(json);
              }
            } catch (e) {
              setExportStatus("Export failed");
            }
            setTimeout(() => setExportStatus(null), 3000);
          }}
        >
          <Text style={[styles.testButtonText, { color: C.accent }]}>Export Settings to Clipboard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.testButton, { marginTop: 6, borderColor: C.borderAccent, backgroundColor: C.accentBg }]}
          onPress={async () => {
            try {
              if (typeof navigator !== "undefined" && navigator.clipboard) {
                const json = await navigator.clipboard.readText();
                const count = await importSettings(json);
                setExportStatus(`Imported ${count} settings \u2014 reload to apply`);
              } else {
                setExportStatus("Clipboard not available");
              }
            } catch {
              setExportStatus("Invalid settings data");
            }
            setTimeout(() => setExportStatus(null), 4000);
          }}
        >
          <Text style={[styles.testButtonText, { color: C.accent }]}>Import Settings from Clipboard</Text>
        </TouchableOpacity>
        {exportStatus && (
          <Text style={[styles.testResultText, { color: C.textSecondary }]}>{exportStatus}</Text>
        )}
      </Panel>

      {__DEV__ && (
        <>
          <Divider />
          <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Developer</Text>
          <TouchableOpacity
            onPress={() => {
              const { DevSettings } = require("react-native");
              DevSettings?.reload?.();
            }}
            activeOpacity={0.7}
          >
            <Panel>
              <Text style={[styles.devButton, { color: C.accent }]}>Reload App</Text>
            </Panel>
          </TouchableOpacity>
        </>
      )}
    </>
  );

  const renderAbout = () => (
    <>
      <BackHeader title="More" onBack={goBack} />
      <Panel>
        <Text style={[styles.appName, { color: C.accent }]}>ARC View</Text>
        <Text style={[styles.appVersion, { color: C.textSecondary }]}>v0.2.0</Text>
        <Text style={[styles.appDev, { color: C.textMuted }]}>by Couloir</Text>
        <Text style={[styles.appDesc, { color: C.text }]}>
          Arc Raiders companion — intel, loadouts, market, missions, and squad coordination.
        </Text>
      </Panel>

      <Divider />

      <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Data Sources</Text>
      {DATA_SOURCES.map((src) => (
        <TouchableOpacity
          key={src.name}
          onPress={() => Linking.openURL(src.url)}
          activeOpacity={0.7}
        >
          <Panel style={styles.sourceCard}>
            <Text style={[styles.sourceName, { color: C.text }]}>{src.name}</Text>
            <Text style={[styles.sourceDesc, { color: C.textSecondary }]}>{src.description}</Text>
            <Text style={[styles.sourceUrl, { color: C.accent }]}>{src.url}</Text>
          </Panel>
        </TouchableOpacity>
      ))}
    </>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: C.bg }]}>
      <Text style={[styles.header, { color: C.text }]}>More</Text>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {viewMode === "menu" && renderMenu()}
        {viewMode === "account" && renderAccount()}
        {viewMode === "squad" && renderSquad()}
        {viewMode === "squadMember" && renderSquadMember()}
        {viewMode === "settings" && renderSettings()}
        {viewMode === "about" && renderAbout()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    fontSize: 20,
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 2,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 10, paddingBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  subHeading: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  menuItem: { marginBottom: 4 },
  menuRow: { flexDirection: "row", alignItems: "center" },
  menuIcon: { fontSize: 18, marginRight: 8 },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: "600" },
  chevron: { fontSize: 24 },
  detailTitle: { fontSize: 18, fontWeight: "700" },
  accountLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  accountValue: { fontSize: 15, fontWeight: "600", marginTop: 2, marginBottom: 8 },
  accountHint: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  accountInput: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  squadCodeLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  squadCode: { fontSize: 24, fontWeight: "700", marginTop: 4, textAlign: "center", letterSpacing: 4 },
  squadHint: { fontSize: 12, textAlign: "center", marginTop: 4, marginBottom: 8 },
  squadButton: { borderWidth: 1, borderRadius: 6, padding: 8, alignItems: "center", marginBottom: 6 },
  squadButtonSecondary: { backgroundColor: "transparent" },
  squadButtonText: { fontSize: 14, fontWeight: "700" },
  squadButtonTextSecondary: { fontSize: 14, fontWeight: "700" },
  memberCard: { marginBottom: 6 },
  memberRow: { flexDirection: "row", alignItems: "center" },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  statusDotLarge: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: "600" },
  memberLoadout: { fontSize: 12, marginTop: 2 },
  memberRole: { fontSize: 11, fontWeight: "700", marginRight: 8 },
  memberDetailHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  roleText: { fontSize: 15, fontWeight: "600" },
  roleGapText: { fontSize: 12, fontWeight: "500", marginBottom: 4 },
  langGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  langPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  langText: { fontSize: 12, fontWeight: "600" },
  langHint: { fontSize: 11, marginTop: 8 },
  cacheButton: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  cacheHint: { fontSize: 11, textAlign: "center", marginTop: 4 },
  cacheStatusText: { fontSize: 12, fontWeight: "600", textAlign: "center", marginTop: 6 },
  devButton: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  appName: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  appVersion: { fontSize: 13, textAlign: "center", marginTop: 2 },
  appDev: { fontSize: 13, textAlign: "center", marginTop: 2 },
  appDesc: { fontSize: 13, textAlign: "center", marginTop: 8, lineHeight: 18 },
  sourceCard: { marginBottom: 8 },
  sourceName: { fontSize: 15, fontWeight: "700" },
  sourceDesc: { fontSize: 12, marginTop: 2 },
  sourceUrl: { fontSize: 11, marginTop: 4 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  toggleLabel: { fontSize: 14, fontWeight: "600" },
  toggleValue: { fontSize: 13, fontWeight: "700" },
  volumeLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4, marginBottom: 6 },
  volumeRow: { flexDirection: "row", gap: 6 },
  volumePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  volumeText: { fontSize: 12, fontWeight: "600" },
  zoneLabel: { fontSize: 13, fontWeight: "500" },
  testButton: { borderWidth: 1, borderRadius: 6, padding: 8, alignItems: "center", marginTop: 4 },
  testButtonText: { fontSize: 13, fontWeight: "700" },
  testResultText: { fontSize: 11, marginTop: 6, fontFamily: "monospace" },
  testResultRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  testResultLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  testResultValue: { fontSize: 13, fontWeight: "600", fontFamily: "monospace" },
  autoTrackDesc: { fontSize: 11, marginTop: 4, lineHeight: 16 },
  joinRow: { flexDirection: "row", gap: 6, alignItems: "center", marginBottom: 6 },
  joinInput: { flex: 1, fontSize: 14, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, letterSpacing: 2 },
  joinConfirmButton: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, alignItems: "center" },
  joinCancelButton: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center" },
  questBoardHint: { fontSize: 12, marginBottom: 8, lineHeight: 16 },
  questMemberHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  questCount: { fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"], marginRight: 8 },
  addQuestIcon: { fontSize: 20, fontWeight: "700", width: 24, textAlign: "center" },
  questRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4, paddingLeft: 18 },
  questCheckbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginRight: 8 },
  questCheckmark: { fontSize: 12, fontWeight: "700", color: "#fff" },
  questName: { fontSize: 13, fontWeight: "500" },
  questTrader: { fontSize: 10, fontWeight: "600", marginTop: 1 },
  questRemove: { fontSize: 14, padding: 4 },
  noQuestsHint: { fontSize: 12, textAlign: "center", paddingVertical: 4 },
  questPickerContainer: { borderTopWidth: 1, marginTop: 6, paddingTop: 6 },
  questPickerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1 },
  questPickerName: { fontSize: 13, fontWeight: "500", flex: 1 },
  questPickerTrader: { fontSize: 11, fontWeight: "600", marginLeft: 8 },
});
