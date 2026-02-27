/**
 * ARC View — App Entry Point
 *
 * Platform-aware navigation:
 *   Mobile / narrow: Bottom tab navigator
 *   Desktop / wide:  Sidebar rail + content area
 *
 * Overlay mode: Renders OverlayHUD when ?overlay query param is present.
 */

import React, { useState, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, useWindowDimensions, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import IntelScreen from "./src/screens/IntelScreen";
import LoadoutScreen from "./src/screens/LoadoutScreen";
import MarketScreen from "./src/screens/MarketScreen";
import MissionsScreen from "./src/screens/MissionsScreen";
import MoreScreen from "./src/screens/MoreScreen";
import OverlayHUD from "./src/components/OverlayHUD";
import SidebarNav from "./src/components/SidebarNav";
import TitleBar from "./src/components/TitleBar";
import { Colors, breakpoints } from "./src/theme";

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Intel: "\uD83D\uDCE1",
  Loadout: "\uD83C\uDFAF",
  Market: "\uD83D\uDCCA",
  Missions: "\uD83D\uDCCB",
  More: "\u00B7\u00B7\u00B7",
};

const NAV_ITEMS = [
  { key: "Intel", label: "Intel", icon: "\uD83D\uDCE1" },
  { key: "Loadout", label: "Loadout", icon: "\uD83C\uDFAF" },
  { key: "Market", label: "Market", icon: "\uD83D\uDCCA" },
  { key: "Missions", label: "Missions", icon: "\uD83D\uDCCB" },
  { key: "More", label: "More", icon: "\u00B7\u00B7\u00B7" },
];

const SCREENS: Record<string, React.ComponentType> = {
  Intel: IntelScreen,
  Loadout: LoadoutScreen,
  Market: MarketScreen,
  Missions: MissionsScreen,
  More: MoreScreen,
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontSize: 18 }}>{TAB_ICONS[name] || "?"}</Text>
      {focused && (
        <View
          style={{
            width: 14,
            height: 2,
            backgroundColor: Colors.accent,
            borderRadius: 1,
            marginTop: 2,
          }}
        />
      )}
    </View>
  );
}

/** Desktop layout: title bar + sidebar + full-width content area */
function DesktopLayout() {
  const [activeTab, setActiveTab] = useState("Intel");
  const ActiveScreen = SCREENS[activeTab] || IntelScreen;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <TitleBar />
      <View style={{ flex: 1, flexDirection: "row" }}>
        <SidebarNav
          items={NAV_ITEMS}
          activeKey={activeTab}
          onSelect={setActiveTab}
        />
        <View style={{ flex: 1 }}>
          <ActiveScreen />
        </View>
      </View>
    </View>
  );
}

/** Mobile layout: standard bottom tab navigator */
function MobileLayout() {
  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: Colors.accent,
          background: Colors.bg,
          card: Colors.bg,
          text: Colors.text,
          border: Colors.borderAccent,
          notification: Colors.red,
        },
        fonts: {
          regular: { fontFamily: "System", fontWeight: "400" },
          medium: { fontFamily: "System", fontWeight: "500" },
          bold: { fontFamily: "System", fontWeight: "700" },
          heavy: { fontFamily: "System", fontWeight: "900" },
        },
      }}
    >
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon name={route.name} focused={focused} />
          ),
          tabBarActiveTintColor: Colors.accent,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarStyle: {
            backgroundColor: Colors.bg,
            borderTopColor: Colors.borderAccent,
            borderTopWidth: 1,
            paddingTop: 2,
            height: 52,
          },
          tabBarLabelStyle: {
            fontSize: 9,
            fontWeight: "700",
            letterSpacing: 0.8,
            textTransform: "uppercase",
          },
        })}
      >
        <Tab.Screen name="Intel" component={IntelScreen} />
        <Tab.Screen name="Loadout" component={LoadoutScreen} />
        <Tab.Screen name="Market" component={MarketScreen} />
        <Tab.Screen name="Missions" component={MissionsScreen} />
        <Tab.Screen name="More" component={MoreScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const { width } = useWindowDimensions();

  // Overlay mode for electron
  const isOverlay =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("overlay");
  if (isOverlay) return <OverlayHUD />;

  const isDesktop = Platform.OS === "web" && width >= breakpoints.desktop;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={Colors.bg} />
      {isDesktop ? <DesktopLayout /> : <MobileLayout />}
    </SafeAreaProvider>
  );
}
