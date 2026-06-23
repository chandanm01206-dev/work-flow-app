import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api/client";
import { colors, fontFamily, fontSize, radius, spacing, PRIORITIES } from "@/src/theme";
import type { CalendarEvent, Client, Habit, HabitLog, Project, Task } from "@/src/types";
import {
    endOfDay,
    formatTime,
    isOverdue,
    isSameDay,
    startOfDay,
    todayYMD,
} from "@/src/utils/date";

export default function Dashboard() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [focusText, setFocusText] = useState("");
    const [focusDirty, setFocusDirty] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [habits, setHabits] = useState<Habit[]>([]);
    const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);

    const today = todayYMD();

    const refresh = useCallback(async () => {
        try {
            const [t, e, p, c, h, hl, focus] = await Promise.all([
                api.get<Task[]>("/tasks"),
                api.get<CalendarEvent[]>("/events"),
                api.get<Project[]>("/projects"),
                api.get<Client[]>("/clients"),
                api.get<Habit[]>("/habits"),
                api.get<HabitLog[]>(`/habit-logs?start=${today}&end=${today}`),
                api.get<{ text: string }>(`/daily-focus/${today}`),
            ]);
            setTasks(t);
            setEvents(e);
            setProjects(p);
            setClients(c);
            setHabits(h);
            setHabitLogs(hl);
            setFocusText(focus.text || "");
            setFocusDirty(false);
        } catch (err) {
            console.warn("dashboard load", err);
        } finally {
            setLoading(false);
        }
    }, [today]);

    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [refresh])
    );

    const saveFocus = async () => {
        if (!focusDirty) return;
        try {
            await api.put(`/daily-focus/${today}`, { date: today, text: focusText });
            setFocusDirty(false);
        } catch (err) {
            console.warn(err);
        }
    };

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const todaysTasks = tasks
        .filter((t) => {
            if (t.status === "done") return false;
            if (!t.due_at) return false;
            const d = new Date(t.due_at);
            return d <= todayEnd;
        })
        .sort((a, b) => {
            const pri: Record<string, number> = { high: 0, medium: 1, low: 2 };
            const ao = isOverdue(a.due_at) ? -1 : 0;
            const bo = isOverdue(b.due_at) ? -1 : 0;
            if (ao !== bo) return ao - bo;
            return pri[a.priority] - pri[b.priority];
        })
        .slice(0, 6);

    const todaysEvents = events
        .filter((e) => isSameDay(new Date(e.start_at), now))
        .sort((a, b) => a.start_at.localeCompare(b.start_at));

    const upcomingDeliveries = projects
        .filter((p) => p.deadline && p.status === "active")
        .filter((p) => {
            const d = new Date(p.deadline!);
            return d >= todayStart && d.getTime() - todayStart.getTime() <= 7 * 86400_000;
        })
        .sort((a, b) => a.deadline!.localeCompare(b.deadline!));

    const completedHabitIds = new Set(habitLogs.filter((h) => h.done).map((h) => h.habit_id));

    const toggleHabit = async (habitId: string) => {
        const newSet = new Set(completedHabitIds);
        if (newSet.has(habitId)) newSet.delete(habitId);
        else newSet.add(habitId);
        setHabitLogs(Array.from(newSet).map((id) => ({ id, habit_id: id, date: today, done: true })));
        try {
            await api.post("/habit-logs/toggle", { habit_id: habitId, date: today, done: true });
        } catch (err) {
            console.warn(err);
            refresh();
        }
    };

    const toggleTaskDone = async (t: Task) => {
        const next = t.status === "done" ? "todo" : "done";
        setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: next } : x)));
        try {
            await api.patch(`/tasks/${t.id}`, { status: next });
        } catch {
            refresh();
        }
    };

    if (loading) {
        return (
            <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator color={colors.surfaceDark} />
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <View style={[styles.headerDark, { paddingTop: insets.top + spacing.xl }]}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.greeting}>Hey User!</Text>
                        <Text style={styles.headerTitle}>Let's find your{"\n"}best project!</Text>
                    </View>
                    <View style={styles.avatarPlaceholder} />
                </View>
                
                {/* Simulated wavy lines could be an SVG here, but we use a dark background for now */}
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <Feather name="search" size={20} color={colors.onSurfaceSecondary} />
                    <TextInput 
                        placeholder="Search" 
                        placeholderTextColor={colors.onSurfaceSecondary} 
                        style={styles.searchInput}
                    />
                    <View style={styles.filterBtn}>
                        <Feather name="sliders" size={16} color={colors.onSurfaceDark} />
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl + 120 }} showsVerticalScrollIndicator={false}>
                {/* Projects Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Project</Text>
                    <Text style={styles.sectionLink}>All Task</Text>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.projectsScroll}
                >
                    {/* Dark Card */}
                    <View style={styles.projectCardDark}>
                        <View style={styles.projectIconDark}>
                            <Feather name="box" size={24} color={colors.onSurfaceDark} />
                        </View>
                        <Text style={styles.projectCardTitleDark}>Game Design</Text>
                        <Text style={styles.projectCardDescDark}>Create menu in dashboard & Make user flow</Text>
                        <TouchableOpacity style={styles.projectCardAction}>
                            <Feather name="chevron-right" size={20} color={colors.brand} />
                        </TouchableOpacity>
                    </View>

                    {/* Light Card */}
                    <View style={styles.projectCardLight}>
                        <View style={styles.projectIconLight}>
                            <Feather name="pie-chart" size={24} color={colors.brand} />
                        </View>
                        <Text style={styles.projectCardTitleLight}>Decision</Text>
                        <Text style={styles.projectCardDescLight}>Edit icons for team task for next week</Text>
                    </View>
                </ScrollView>

                {/* Tasks Section */}
                <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
                    <Text style={styles.sectionTitle}>Tasks</Text>
                    <Text style={styles.sectionLink}>View all</Text>
                </View>

                <View style={styles.tasksList}>
                    {todaysTasks.slice(0, 3).map((t, idx) => {
                        const done = t.status === "done";
                        return (
                            <Pressable key={t.id} style={styles.taskCard} onPress={() => toggleTaskDone(t)}>
                                <View style={[styles.circularCheckbox, done && styles.circularCheckboxDone]}>
                                    {done && <Feather name="check" size={14} color={colors.onSurfaceDark} />}
                                </View>
                                <Text style={[styles.taskCardTitle, done && styles.taskDoneText]} numberOfLines={2}>
                                    {t.title}
                                </Text>
                                <View style={styles.taskCardDot} />
                            </Pressable>
                        );
                    })}
                    {todaysTasks.length === 0 && (
                        <Text style={[styles.muted, { paddingHorizontal: spacing.lg }]}>No tasks for today.</Text>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    center: { alignItems: "center", justifyContent: "center" },
    
    headerDark: {
        backgroundColor: colors.surfaceDark,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        paddingBottom: 48,
        paddingHorizontal: spacing.xl,
    },
    headerTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    greeting: {
        color: colors.onSurfaceSecondary,
        fontSize: fontSize.sm,
        fontWeight: "600",
        marginBottom: 8,
    },
    headerTitle: {
        color: colors.onSurfaceDark,
        fontSize: fontSize.xxxl,
        fontWeight: "700",
        lineHeight: 36,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 2,
        borderColor: colors.surfaceTertiary,
    },

    searchContainer: {
        marginTop: -28,
        paddingHorizontal: spacing.xl,
        zIndex: 10,
    },
    searchBox: {
        backgroundColor: colors.surfaceSecondary,
        borderRadius: radius.pill,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.lg,
        paddingVertical: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 4,
    },
    searchInput: {
        flex: 1,
        marginLeft: spacing.md,
        fontFamily: fontFamily.text,
        fontSize: fontSize.base,
        color: colors.onSurface,
    },
    filterBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.surfaceDark,
        alignItems: "center",
        justifyContent: "center",
    },

    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        paddingHorizontal: spacing.xl,
        marginTop: spacing.xl,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: fontSize.xxl,
        fontWeight: "700",
        color: colors.onSurface,
    },
    sectionLink: {
        fontSize: fontSize.sm,
        fontWeight: "600",
        color: colors.onSurfaceSecondary,
    },

    projectsScroll: {
        paddingHorizontal: spacing.xl,
        gap: spacing.lg,
    },
    projectCardDark: {
        backgroundColor: colors.surfaceDark,
        borderRadius: 32,
        padding: spacing.xl,
        width: 220,
        height: 260,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    projectIconDark: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "rgba(255,255,255,0.1)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.xl,
    },
    projectCardTitleDark: {
        color: colors.onSurfaceDark,
        fontSize: fontSize.xl,
        fontWeight: "700",
        marginBottom: spacing.sm,
    },
    projectCardDescDark: {
        color: colors.onSurfaceSecondary,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
    projectCardAction: {
        position: "absolute",
        bottom: spacing.lg,
        right: spacing.lg,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.onSurfaceDark,
        alignItems: "center",
        justifyContent: "center",
    },

    projectCardLight: {
        backgroundColor: "#E8EAF6",
        borderRadius: 32,
        padding: spacing.xl,
        width: 200,
        height: 220,
        alignSelf: "flex-end",
    },
    projectIconLight: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.surfaceSecondary,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.lg,
    },
    projectCardTitleLight: {
        color: colors.onSurface,
        fontSize: fontSize.xl,
        fontWeight: "700",
        marginBottom: spacing.sm,
    },
    projectCardDescLight: {
        color: colors.onSurfaceSecondary,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },

    tasksList: {
        paddingHorizontal: spacing.xl,
        gap: spacing.md,
    },
    taskCard: {
        backgroundColor: colors.surfaceSecondary,
        borderRadius: 20,
        padding: spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    circularCheckbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.surfaceDark,
        alignItems: "center",
        justifyContent: "center",
        marginRight: spacing.md,
    },
    circularCheckboxDone: {
        backgroundColor: colors.surfaceDark,
    },
    taskCardTitle: {
        flex: 1,
        color: colors.onSurface,
        fontSize: fontSize.base,
        fontWeight: "600",
        lineHeight: 20,
    },
    taskDoneText: {
        color: colors.onSurfaceSecondary,
        textDecorationLine: "line-through",
    },
    taskCardDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.surfaceDark,
        marginLeft: spacing.md,
    },
    muted: { color: colors.onSurfaceSecondary, fontSize: fontSize.sm, fontFamily: fontFamily.text, marginTop: 2 },
});