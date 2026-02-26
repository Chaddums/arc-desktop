/**
 * ARC View — App Entry Point
 *
 * Bottom tab navigation:
 *   Intel | Loadout | Market | Missions | More
 *    📡      🎯        📊       📋        ···
 *
 * Sci-fi dark theme applied globally.
 */

import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import IntelScreen from "./src/screens/IntelScreen";
import LoadoutScreen from "./src/screens/LoadoutScreen";
import MarketScreen from "./src/screens/MarketScreen";
import MissionsScreen from "./src/screens/MissionsScreen";
import MoreScreen from "./src/screens/MoreScreen";
import { Colors } from "./src/theme";

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Intel: "\uD83D\uDCE1",
  Loadout: "\uD83C\uDFAF",
  Market: "\uD83D\uDCCA",
  Missions: "\uD83D\uDCCB",
  More: "\u00B7\u00B7\u00B7",
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontSize: 20 }}>{TAB_ICONS[name] || "?"}</Text>
      {focused && (
        <View
          style={{
            width: 16,
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

export default function App() {
  return (
    <SafeAreaProvider>
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
        <StatusBar style="light" backgroundColor={Colors.bg} />
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
              paddingTop: 4,
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
    </SafeAreaProvider>
  );
}
