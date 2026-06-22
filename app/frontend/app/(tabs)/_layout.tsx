import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";

import { colors, fontFamily } from "@/src/theme";

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.surfaceSecondary,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    height: Platform.OS === "ios" ? 84 : 64,
                    paddingTop: 8,
                    paddingBottom: Platform.OS === "ios" ? 24 : 8,
                },
                tabBarActiveTintColor: colors.brand,
                tabBarInactiveTintColor: colors.onSurfaceSecondary,
                tabBarLabelStyle: {
                    fontFamily: fontFamily.text,
                    fontSize: 11,
                    fontWeight: "600",
                    letterSpacing: 0.3,
                    textTransform: "uppercase",
                },
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: "Today",
                    tabBarTestID: "tab-dashboard",
                    tabBarIcon: ({ color, size }) => <Feather name="grid" size={size - 2} color={color} />,
                }}
            />
            <Tabs.Screen
                name="tasks"
                options={{
                    title: "Tasks",
                    tabBarTestID: "tab-tasks",
                    tabBarIcon: ({ color, size }) => <Feather name="check-square" size={size - 2} color={color} />,
                }}
            />
            <Tabs.Screen
                name="schedule"
                options={{
                    title: "Schedule",
                    tabBarTestID: "tab-schedule",
                    tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size - 2} color={color} />,
                }}
            />
            <Tabs.Screen
                name="habits"
                options={{
                    title: "Habits",
                    tabBarTestID: "tab-habits",
                    tabBarIcon: ({ color, size }) => <Feather name="activity" size={size - 2} color={color} />,
                }}
            />
        </Tabs>
    );
}