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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../theme";
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
import { clearAllCaches } from "../services/metaforge";
import { exportSettings, importSettings } from "../utils/settingsIO";
import type { MoreViewMode, SquadMember } from "../types";
import { useState, useCallback } from "react";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "zh", label: "中文" },
];

const DATA_SOURCES = [
  { name: "MetaForge", url: "https://metaforge.app", description: "Items, traders, event schedule" },
  { name: "RaidTheory", url: "https://github.com/RaidTheory/arcraiders-data", description: "Quests, bots, skill tree, hideout stations (MIT)" },
  { name: "ardb.app", url: "https://ardb.app", description: "Crafting recipes, item details, recycling data" },
];

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useSettings();
  const { settings: alertSettings, update: updateAlertSettings } = useAlertSettings();
  const { settings: ocrSettings, update: updateOCRSettings } = useOCRSettings();
  const isDesktop = typeof window !== "undefined" && !!window.arcDesktop;
  const [testResult, setTestResult] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const { theme, preset, setTheme, setColorPreset } = useTheme();

  const [viewMode, setViewMode] = useState<MoreViewMode>("menu");
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  // Placeholder squad data (local-only for now)
  const [squadMembers] = useState<SquadMember[]>([]);
  const [squadCode] = useState<string | null>(null);

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
        { label: "Account", icon: "👤", mode: "account" as MoreViewMode },
        { label: "Squad", icon: "👥", mode: "squad" as MoreViewMode },
        { label: "Settings", icon: "⚙", mode: "settings" as MoreViewMode },
        { label: "About", icon: "ℹ", mode: "about" as MoreViewMode },
      ].map((item) => (
        <TouchableOpacity
          key={item.mode}
          onPress={() => setViewMode(item.mode)}
          activeOpacity={0.7}
        >
          <Panel style={styles.menuItem}>
            <View style={styles.menuRow}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.chevron}>&#x203A;</Text>
            </View>
          </Panel>
        </TouchableOpacity>
      ))}
    </>
  );

  const renderAccount = () => (
    <>
      <BackHeader title="More" onBack={goBack} />
      <Text style={styles.sectionTitle}>Account</Text>
      <Panel>
        <Text style={styles.accountLabel}>Account ID</Text>
        <Text style={styles.accountValue}>Local Only</Text>
        <Divider />
        <Text style={styles.accountLabel}>Sync Status</Text>
        <Text style={styles.accountValue}>Not Connected</Text>
        <Text style={styles.accountHint}>
          Account sync allows exporting and importing your progress across devices.
        </Text>
      </Panel>
    </>
  );

  const renderSquad = () => (
    <>
      <BackHeader title="More" onBack={goBack} />
      <Text style={styles.sectionTitle}>Squad</Text>

      {squadCode ? (
        <Panel variant="glow">
          <Text style={styles.squadCodeLabel}>Squad Code</Text>
          <Text style={styles.squadCode}>{squadCode}</Text>
          <Text style={styles.squadHint}>Share this code with your team</Text>
        </Panel>
      ) : (
        <Panel>
          <Text style={styles.squadHint}>
            Create or join a squad to coordinate loadouts and get role suggestions.
          </Text>
          <TouchableOpacity style={styles.squadButton}>
            <Text style={styles.squadButtonText}>Create Squad</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.squadButton, styles.squadButtonSecondary]}>
            <Text style={styles.squadButtonTextSecondary}>Join Squad</Text>
          </TouchableOpacity>
        </Panel>
      )}

      {squadMembers.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Members</Text>
          {squadMembers.map((member) => (
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
                    backgroundColor: member.isOnline ? Colors.statusOnline : Colors.statusOffline
                  }]} />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.displayName}</Text>
                    {member.loadoutSummary && (
                      <Text style={styles.memberLoadout}>{member.loadoutSummary}</Text>
                    )}
                  </View>
                  {member.suggestedRole && (
                    <Text style={styles.memberRole}>{member.suggestedRole}</Text>
                  )}
                  <Text style={styles.chevron}>&#x203A;</Text>
                </View>
              </Panel>
            </TouchableOpacity>
          ))}
        </>
      )}

      {squadMembers.length === 0 && squadCode && (
        <EmptyState icon="👥" title="No members yet" hint="Share the squad code" />
      )}
    </>
  );

  const renderSquadMember = () => {
    const member = squadMembers.find((m) => m.accountId === selectedMember);
    if (!member) return <EmptyState title="Member not found" />;

    return (
      <>
        <BackHeader title="Squad" onBack={goBack} />
        <Panel>
          <View style={styles.memberDetailHeader}>
            <View style={[styles.statusDotLarge, {
              backgroundColor: member.isOnline ? Colors.statusOnline : Colors.statusOffline
            }]} />
            <Text style={styles.detailTitle}>{member.displayName}</Text>
          </View>
          {member.loadoutSummary && (
            <Text style={styles.memberLoadout}>{member.loadoutSummary}</Text>
          )}
          {member.suggestedRole && (
            <>
              <Divider />
              <Text style={styles.subHeading}>Suggested Role</Text>
              <Text style={styles.roleText}>{member.suggestedRole}</Text>
            </>
          )}
        </Panel>
      </>
    );
  };

  const renderSettings = () => (
    <>
      <BackHeader title="More" onBack={goBack} />
      <Text style={styles.sectionTitle}>Language</Text>
      <Panel>
        <View style={styles.langGrid}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langPill, language === lang.code && styles.langPillActive]}
              onPress={() => setLanguage(lang.code)}
            >
              <Text style={[styles.langText, language === lang.code && styles.langTextActive]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.langHint}>
          Affects RaidTheory localized data (bot names, maps, quests)
        </Text>
      </Panel>

      <Divider />

      <Text style={styles.sectionTitle}>Theme</Text>
      <Panel>
        <View style={styles.volumeRow}>
          {[
            { label: "Clean", value: "clean" as const },
            { label: "Tactical", value: "tactical" as const },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.volumePill, theme === opt.value && styles.volumePillActive]}
              onPress={() => setTheme(opt.value)}
            >
              <Text style={[styles.volumeText, theme === opt.value && styles.volumeTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Panel>

      <Divider />

      <Text style={styles.sectionTitle}>Color Preset</Text>
      <Panel>
        <View style={styles.volumeRow}>
          {[
            { label: "Default", value: "default" as const },
            { label: "Colorblind", value: "colorblind" as const },
            { label: "High Contrast", value: "highContrast" as const },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.volumePill, preset === opt.value && styles.volumePillActive]}
              onPress={() => setColorPreset(opt.value)}
            >
              <Text style={[styles.volumeText, preset === opt.value && styles.volumeTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.langHint}>
          Adjusts green/red indicators for accessibility
        </Text>
      </Panel>

      {isDesktop && (
        <>
          <Divider />

          <Text style={styles.sectionTitle}>Notifications</Text>
          <Panel>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Event Notifications</Text>
              <Toggle value={alertSettings.notifyOnEvent} onToggle={() => updateAlertSettings({ notifyOnEvent: !alertSettings.notifyOnEvent })} size="small" />
            </View>

            <Divider />

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Audio Alerts</Text>
              <Toggle value={alertSettings.audioAlerts} onToggle={() => updateAlertSettings({ audioAlerts: !alertSettings.audioAlerts })} size="small" />
            </View>

            {alertSettings.audioAlerts && (
              <>
                <Divider />
                <Text style={styles.volumeLabel}>Volume</Text>
                <View style={styles.volumeRow}>
                  {[0.25, 0.5, 0.75, 1.0].map((vol) => (
                    <TouchableOpacity
                      key={vol}
                      style={[
                        styles.volumePill,
                        alertSettings.audioVolume === vol && styles.volumePillActive,
                      ]}
                      onPress={() => updateAlertSettings({ audioVolume: vol })}
                    >
                      <Text
                        style={[
                          styles.volumeText,
                          alertSettings.audioVolume === vol && styles.volumeTextActive,
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

          <Text style={styles.sectionTitle}>Quest Auto-Tracker</Text>
          <Panel>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Auto-Track</Text>
              <Toggle value={ocrSettings.enabled} onToggle={() => updateOCRSettings({ enabled: !ocrSettings.enabled })} size="small" />
            </View>

            {ocrSettings.enabled && (
              <>
                <Divider />
                <Text style={styles.volumeLabel}>Capture Speed</Text>
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
                        ocrSettings.captureIntervalMs === opt.ms && styles.volumePillActive,
                      ]}
                      onPress={() => updateOCRSettings({ captureIntervalMs: opt.ms })}
                    >
                      <Text
                        style={[
                          styles.volumeText,
                          ocrSettings.captureIntervalMs === opt.ms && styles.volumeTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Divider />
                <Text style={styles.volumeLabel}>Match Sensitivity</Text>
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
                        ocrSettings.matchThreshold === opt.val && styles.volumePillActive,
                      ]}
                      onPress={() => updateOCRSettings({ matchThreshold: opt.val })}
                    >
                      <Text
                        style={[
                          styles.volumeText,
                          ocrSettings.matchThreshold === opt.val && styles.volumeTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Divider />
                <Text style={styles.volumeLabel}>Active Zones</Text>
                {[
                  { id: "objectiveComplete", label: "Objective Complete (top-center)" },
                  { id: "itemPickup", label: "Item Pickup (lower-right)" },
                  { id: "killFeed", label: "Kill Feed (upper-right)" },
                  { id: "centerPopup", label: "Center Popup" },
                ].map((zone) => {
                  const active = ocrSettings.activeZones.includes(zone.id);
                  return (
                    <View key={zone.id} style={styles.toggleRow}>
                      <Text style={styles.zoneLabel}>{zone.label}</Text>
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
                  style={styles.testButton}
                  onPress={async () => {
                    setTestResult("Capturing...");
                    const result = await window.arcDesktop?.testOCRCapture?.();
                    if (result) {
                      setTestResult(
                        `Screen: ${result.screenWidth}x${result.screenHeight}\n` +
                        result.zones.map((z) => `${z.zone}: ${z.width}x${z.height}`).join("\n")
                      );
                    } else {
                      setTestResult("Capture failed — is the game running?");
                    }
                  }}
                >
                  <Text style={styles.testButtonText}>Test Capture</Text>
                </TouchableOpacity>
                {testResult && (
                  <Text style={styles.testResultText}>{testResult}</Text>
                )}
              </>
            )}
          </Panel>
        </>
      )}

      {isDesktop && (
        <>
          <Divider />
          <Text style={styles.sectionTitle}>Window Size</Text>
          <Panel>
            <View style={styles.volumeRow}>
              {[
                { label: "Default", preset: "default" as const },
                { label: "Large", preset: "large" as const },
                { label: "XL", preset: "xl" as const },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.preset}
                  style={styles.volumePill}
                  onPress={() => window.arcDesktop?.windowSetSize(opt.preset)}
                >
                  <Text style={styles.volumeText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Panel>
        </>
      )}

      <Divider />

      <Text style={styles.sectionTitle}>Data</Text>
      <TouchableOpacity onPress={clearAllCaches} activeOpacity={0.7}>
        <Panel>
          <Text style={styles.cacheButton}>Clear All Caches</Text>
          <Text style={styles.cacheHint}>Forces fresh data on next load (15-min TTL)</Text>
        </Panel>
      </TouchableOpacity>

      <Divider />

      <Text style={styles.sectionTitle}>Settings Backup</Text>
      <Panel>
        <TouchableOpacity
          style={styles.testButton}
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
          <Text style={styles.testButtonText}>Export to Clipboard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.testButton, { marginTop: 6 }]}
          onPress={async () => {
            try {
              if (typeof navigator !== "undefined" && navigator.clipboard) {
                const json = await navigator.clipboard.readText();
                const count = await importSettings(json);
                setExportStatus(`Imported ${count} settings — reload to apply`);
              } else {
                setExportStatus("Clipboard not available");
              }
            } catch {
              setExportStatus("Invalid settings data");
            }
            setTimeout(() => setExportStatus(null), 4000);
          }}
        >
          <Text style={styles.testButtonText}>Import from Clipboard</Text>
        </TouchableOpacity>
        {exportStatus && (
          <Text style={styles.testResultText}>{exportStatus}</Text>
        )}
      </Panel>

      {__DEV__ && (
        <>
          <Divider />
          <Text style={styles.sectionTitle}>Developer</Text>
          <TouchableOpacity
            onPress={() => {
              const { DevSettings } = require("react-native");
              DevSettings?.reload?.();
            }}
            activeOpacity={0.7}
          >
            <Panel>
              <Text style={styles.devButton}>Reload App</Text>
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
        <Text style={styles.appName}>ARC View</Text>
        <Text style={styles.appVersion}>v0.2.0</Text>
        <Text style={styles.appDev}>by Couloir</Text>
        <Text style={styles.appDesc}>
          Arc Raiders companion — intel, loadouts, market, missions, and squad coordination.
        </Text>
      </Panel>

      <Divider />

      <Text style={styles.sectionTitle}>Data Sources</Text>
      {DATA_SOURCES.map((src) => (
        <TouchableOpacity
          key={src.name}
          onPress={() => Linking.openURL(src.url)}
          activeOpacity={0.7}
        >
          <Panel style={styles.sourceCard}>
            <Text style={styles.sourceName}>{src.name}</Text>
            <Text style={styles.sourceDesc}>{src.description}</Text>
            <Text style={styles.sourceUrl}>{src.url}</Text>
          </Panel>
        </TouchableOpacity>
      ))}
    </>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.header}>More</Text>
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
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 2,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 10, paddingBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  subHeading: { fontSize: 11, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  menuItem: { marginBottom: 4 },
  menuRow: { flexDirection: "row", alignItems: "center" },
  menuIcon: { fontSize: 18, marginRight: 8 },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: "600", color: Colors.text },
  chevron: { fontSize: 24, color: Colors.textMuted },
  detailTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  accountLabel: { fontSize: 11, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  accountValue: { fontSize: 15, fontWeight: "600", color: Colors.text, marginTop: 2, marginBottom: 8 },
  accountHint: { fontSize: 12, color: Colors.textMuted, marginTop: 4, lineHeight: 16 },
  squadCodeLabel: { fontSize: 11, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  squadCode: { fontSize: 24, fontWeight: "700", color: Colors.accent, marginTop: 4, textAlign: "center", letterSpacing: 4 },
  squadHint: { fontSize: 12, color: Colors.textMuted, textAlign: "center", marginTop: 4, marginBottom: 8 },
  squadButton: { backgroundColor: "rgba(0, 180, 216, 0.15)", borderWidth: 1, borderColor: Colors.accent, borderRadius: 6, padding: 8, alignItems: "center", marginBottom: 6 },
  squadButtonSecondary: { backgroundColor: "transparent", borderColor: Colors.border },
  squadButtonText: { fontSize: 14, fontWeight: "700", color: Colors.accent },
  squadButtonTextSecondary: { fontSize: 14, fontWeight: "700", color: Colors.textSecondary },
  memberCard: { marginBottom: 6 },
  memberRow: { flexDirection: "row", alignItems: "center" },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  statusDotLarge: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: "600", color: Colors.text },
  memberLoadout: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  memberRole: { fontSize: 11, fontWeight: "700", color: Colors.accent, marginRight: 8 },
  memberDetailHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  roleText: { fontSize: 15, fontWeight: "600", color: Colors.accent },
  langGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  langPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  langPillActive: { borderColor: Colors.accent, backgroundColor: "rgba(0, 180, 216, 0.15)" },
  langText: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  langTextActive: { color: Colors.accent },
  langHint: { fontSize: 11, color: Colors.textMuted, marginTop: 8 },
  cacheButton: { fontSize: 14, fontWeight: "600", color: Colors.amber, textAlign: "center" },
  cacheHint: { fontSize: 11, color: Colors.textMuted, textAlign: "center", marginTop: 4 },
  devButton: { fontSize: 14, fontWeight: "600", color: Colors.accent, textAlign: "center" },
  appName: { fontSize: 24, fontWeight: "700", color: Colors.accent, textAlign: "center" },
  appVersion: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", marginTop: 2 },
  appDev: { fontSize: 13, color: Colors.textMuted, textAlign: "center", marginTop: 2 },
  appDesc: { fontSize: 13, color: Colors.text, textAlign: "center", marginTop: 8, lineHeight: 18 },
  sourceCard: { marginBottom: 8 },
  sourceName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  sourceDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  sourceUrl: { fontSize: 11, color: Colors.accent, marginTop: 4 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: Colors.text },
  toggleValue: { fontSize: 13, fontWeight: "700", color: Colors.textMuted },
  toggleOn: { color: Colors.accent },
  volumeLabel: { fontSize: 11, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4, marginBottom: 6 },
  volumeRow: { flexDirection: "row", gap: 6 },
  volumePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  volumePillActive: { borderColor: Colors.accent, backgroundColor: "rgba(0, 180, 216, 0.15)" },
  volumeText: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  volumeTextActive: { color: Colors.accent },
  zoneLabel: { fontSize: 13, fontWeight: "500", color: Colors.text },
  testButton: { backgroundColor: "rgba(0, 180, 216, 0.12)", borderWidth: 1, borderColor: Colors.borderAccent, borderRadius: 6, padding: 8, alignItems: "center", marginTop: 4 },
  testButtonText: { fontSize: 13, fontWeight: "700", color: Colors.accent },
  testResultText: { fontSize: 11, color: Colors.textSecondary, marginTop: 6, fontFamily: "monospace" },
});
