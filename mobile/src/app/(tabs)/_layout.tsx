import { Tabs, Redirect } from "expo-router";
import { authClient } from "../../lib/auth-client";
import { Colors } from "../../constants/theme";

export default function TabsLayout() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return null;
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

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
          tabBarLabel: "Home",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon="🏠" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarLabel: "Explore",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon="🔍" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

import { Text } from "react-native";

function TabBarIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
      {icon}
    </Text>
  );
}
