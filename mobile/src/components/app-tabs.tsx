import { Tabs } from "expo-router";
import { Text } from "react-native";
import { Colors } from "../constants/theme";

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.dark.background,
          borderTopColor: "rgba(255,255,255,0.1)",
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: "#10B981",
        tabBarInactiveTintColor: Colors.dark.textSecondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: () => <TabIcon icon="🏠" />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: () => <TabIcon icon="🔍" />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ icon }: { icon: string }) {
  return <Text style={{ fontSize: 22 }}>{icon}</Text>;
}
