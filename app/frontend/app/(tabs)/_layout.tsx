import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, View, TouchableOpacity, StyleSheet } from "react-native";

import { colors } from "@/src/theme";

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.surfaceSecondary,
                    borderTopWidth: 0,
                    elevation: 10,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 12,
                    height: Platform.OS === "ios" ? 84 : 70,
                    paddingTop: 8,
                    paddingBottom: Platform.OS === "ios" ? 24 : 12,
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    position: "absolute",
                },
                tabBarShowLabel: false,
                tabBarActiveTintColor: colors.brand,
                tabBarInactiveTintColor: colors.onSurfaceSecondary,
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: "Dashboard",
                    tabBarIcon: ({ color, size }) => <Feather name="home" size={20} color={color} />,
                }}
            />
            <Tabs.Screen
                name="tasks"
                options={{
                    title: "Tasks",
                    tabBarIcon: ({ color, size }) => <Feather name="file-text" size={20} color={color} />,
                }}
            />
            <Tabs.Screen
                name="add"
                options={{
                    title: "Add",
                    tabBarButton: (props) => (
                        <TouchableOpacity style={styles.fabContainer} activeOpacity={0.8}>
                            <View style={styles.fab}>
                                <Feather name="plus" size={24} color={colors.onSurfaceDark} />
                            </View>
                        </TouchableOpacity>
                    ),
                }}
                listeners={() => ({
                    tabPress: (e) => {
                        e.preventDefault();
                    },
                })}
            />
            <Tabs.Screen
                name="schedule"
                options={{
                    title: "Schedule",
                    tabBarIcon: ({ color, size }) => <Feather name="bell" size={20} color={color} />,
                }}
            />
            <Tabs.Screen
                name="habits"
                options={{
                    title: "Habits",
                    tabBarIcon: ({ color, size }) => <Feather name="user" size={20} color={color} />,
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    fabContainer: {
        top: -24,
        justifyContent: "center",
        alignItems: "center",
        width: 64,
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.surfaceDark,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 4,
        borderColor: colors.surfaceSecondary,
    }
});