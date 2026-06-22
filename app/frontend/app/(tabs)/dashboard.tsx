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
                <ActivityIndicator color={colors.brand} />
            </View>
        );
    }

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <View style={styles.header} testID="dashboard-header">
                <View>
                    <Text style={styles.eyebrow}>
                        {new Date().toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
                    </Text>
                    <Text style={styles.h1}>Today</Text>
                </View>
                <Pressable testID="open-settings" onPress={() => router.push("/settings")} style={styles.iconBtn}>
                    <Feather name="settings" size={18} color={colors.onSurface} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl + 80 }} showsVerticalScrollIndicator={false}>
                {/* Daily Focus */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Daily Focus</Text>
                    <TextInput
                        testID="daily-focus-input"
                        value={focusText}
                        onChangeText={(v) => { setFocusText(v); setFocusDirty(true); }}
                        onBlur={saveFocus}
                        placeholder="What's the ONE thing today?"
                        placeholderTextColor={colors.onSurfaceSecondary}
                        style={styles.focusInput}
                        returnKeyType="done"
                        onSubmitEditing={saveFocus}
                    />
                </View>

                {/* Upcoming deliveries */}
                {upcomingDeliveries.length > 0 && (
                    <View style={{ marginTop: spacing.lg }}>
                        <Text style={[styles.sectionLabel, { paddingHorizontal: spacing.lg }]}>
                            Upcoming Deliveries · Next 7 days
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
                            style={styles.chipRow}
                        >
                            {upcomingDeliveries.map((p) => {
                                const client = clients.find((c) => c.id === p.client_id);
                                return (
                                    <View key={p.id} style={styles.deliveryChip} testID={`delivery-${p.id}`}>
                                        <Text style={styles.chipClient}>{client?.name || "—"}</Text>
                                        <Text style={styles.chipProject} numberOfLines={1}>{p.name}</Text>
                                        <Text style={styles.chipDate}>
                                            {new Date(p.deadline!).toLocaleDateString([], { month: "short", day: "numeric" })}
                                        </Text>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* Today's Schedule */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Today's Schedule</Text>
                    {todaysEvents.length === 0 ? (
                        <Text style={styles.muted}>Nothing scheduled.</Text>
                    ) : (
                        todaysEvents.map((ev) => (
                            <View key={ev.id} style={styles.eventRow} testID={`event-row-${ev.id}`}>
                                <Text style={styles.eventTime}>{formatTime(ev.start_at)}</Text>
                                <View style={styles.eventBar} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.eventTitle}>{ev.title}</Text>
                                    <Text style={styles.muted}>{ev.type.toUpperCase()}</Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                {/* Habits */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Today's Habits</Text>
                    {habits.length === 0 ? (
                        <Pressable onPress={() => router.push("/(tabs)/habits")}>
                            <Text style={styles.muted}>No habits yet. Tap the Habits tab to add up to 7.</Text>
                        </Pressable>
                    ) : (
                        habits.map((h) => {
                            const done = completedHabitIds.has(h.id);
                            return (
                                <Pressable
                                    key={h.id}
                                    onPress={() => toggleHabit(h.id)}
                                    style={styles.habitRow}
                                    testID={`habit-toggle-${h.id}`}
                                >
                                    <View style={[styles.checkbox, done && styles.checkboxOn]}>
                                        {done && <Feather name="check" size={14} color={colors.onBrand} />}
                                    </View>
                                    <Text style={[styles.habitName, done && styles.habitDone]}>{h.name}</Text>
                                </Pressable>
                            );
                        })
                    )}
                </View>

                {/* Priority Tasks */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Priority Tasks</Text>
                    {todaysTasks.length === 0 ? (
                        <Text style={styles.muted}>You're clear for today.</Text>
                    ) : (
                        todaysTasks.map((t) => {
                            const overdue = isOverdue(t.due_at);
                            const pri = PRIORITIES.find((p) => p.key === t.priority)!;
                            return (
                                <Pressable
                                    key={t.id}
                                    style={styles.taskRow}
                                    onPress={() => toggleTaskDone(t)}
                                    testID={`dashboard-task-${t.id}`}
                                >
                                    <View style={[styles.checkbox, t.status === "done" && styles.checkboxOn]}>
                                        {t.status === "done" && <Feather name="check" size={14} color={colors.onBrand} />}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text
                                            style={[styles.taskTitle, t.status === "done" && styles.taskDone, overdue && { color: colors.error }]}
                                            numberOfLines={1}
                                        >
                                            {t.title}
                                        </Text>
                                        {t.due_at && (
                                            <Text style={[styles.muted, overdue && { color: colors.error }]}>
                                                {overdue ? "OVERDUE · " : ""}
                                                {new Date(t.due_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={[styles.priDot, { backgroundColor: pri.color }]} />
                                </Pressable>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    center: { alignItems: "center", justifyContent: "center" },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    eyebrow: {
        color: colors.onSurfaceSecondary,
        fontFamily: fontFamily.text,
        fontSize: fontSize.sm,
        letterSpacing: 1.2,
        textTransform: "uppercase",
    },
    h1: {
        color: colors.onSurface,
        fontFamily: fontFamily.display,
        fontSize: fontSize.xxxl,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    iconBtn: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.md,
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    section: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
    sectionLabel: {
        color: colors.onSurfaceSecondary,
        fontFamily: fontFamily.text,
        fontSize: fontSize.xs,
        letterSpacing: 1.4,
        textTransform: "uppercase",
        marginBottom: spacing.sm,
        fontWeight: "700",
    },
    focusInput: {
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: spacing.md,
        color: colors.onSurface,
        fontFamily: fontFamily.text,
        fontSize: fontSize.lg,
    },
    chipRow: { paddingVertical: spacing.sm },
    deliveryChip: {
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 3,
        borderLeftColor: colors.brand,
        borderRadius: radius.md,
        padding: spacing.md,
        minWidth: 180,
        flexShrink: 0,
    },
    chipClient: { color: colors.onSurfaceSecondary, fontSize: fontSize.xs, textTransform: "uppercase", letterSpacing: 1 },
    chipProject: { color: colors.onSurface, fontSize: fontSize.lg, fontWeight: "600", marginTop: 2, fontFamily: fontFamily.text },
    chipDate: { color: colors.brand, fontSize: fontSize.sm, fontWeight: "600", marginTop: spacing.xs, fontFamily: fontFamily.display, letterSpacing: 0.5 },
    eventRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, gap: spacing.md },
    eventTime: { color: colors.brand, fontFamily: fontFamily.display, fontSize: fontSize.lg, width: 64, fontWeight: "700" },
    eventBar: { width: 2, height: 28, backgroundColor: colors.border, borderRadius: 1 },
    eventTitle: { color: colors.onSurface, fontFamily: fontFamily.text, fontSize: fontSize.lg },
    muted: { color: colors.onSurfaceSecondary, fontSize: fontSize.sm, fontFamily: fontFamily.text, marginTop: 2 },
    habitRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, gap: spacing.md },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: radius.sm,
        borderWidth: 1.5,
        borderColor: colors.borderStrong,
        backgroundColor: colors.surfaceSecondary,
        alignItems: "center",
        justifyContent: "center",
    },
    checkboxOn: { backgroundColor: colors.brand, borderColor: colors.brand },
    habitName: { color: colors.onSurface, fontFamily: fontFamily.text, fontSize: fontSize.lg, flex: 1 },
    habitDone: { color: colors.onSurfaceSecondary, textDecorationLine: "line-through" },
    taskRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.sm,
        gap: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    taskTitle: { color: colors.onSurface, fontFamily: fontFamily.text, fontSize: fontSize.lg },
    taskDone: { color: colors.onSurfaceSecondary, textDecorationLine: "line-through" },
    priDot: { width: 8, height: 8, borderRadius: 4 },
});