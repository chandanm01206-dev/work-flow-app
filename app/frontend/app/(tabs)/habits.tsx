import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api/client";
import { colors, fontFamily, fontSize, radius, spacing } from "@/src/theme";
import type { Habit, HabitLog } from "@/src/types";
import { addDays, todayYMD } from "@/src/utils/date";

const DAYS_BACK = 14;
const CELL = 26;

export default function HabitsScreen() {
    const insets = useSafeAreaInsets();
    const [habits, setHabits] = useState<Habit[]>([]);
    const [logs, setLogs] = useState<HabitLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [editor, setEditor] = useState<{ open: boolean; habit?: Habit | null }>({ open: false });

    const today = todayYMD();
    const start = useMemo(() => {
        const d = addDays(new Date(), -(DAYS_BACK - 1));
        return todayYMD(d);
    }, []);

    const days = useMemo(() => {
        const out: string[] = [];
        for (let i = DAYS_BACK - 1; i >= 0; i--) {
            out.push(todayYMD(addDays(new Date(), -i)));
        }
        return out;
    }, []);

    const refresh = useCallback(async () => {
        try {
            const [h, l] = await Promise.all([
                api.get<Habit[]>("/habits"),
                api.get<HabitLog[]>(`/habit-logs?start=${start}&end=${today}`),
            ]);
            setHabits(h);
            setLogs(l);
        } catch (err) {
            console.warn(err);
        } finally {
            setLoading(false);
        }
    }, [start, today]);

    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [refresh])
    );

    const logMap = useMemo(() => {
        const m: Record<string, Set<string>> = {};
        for (const log of logs) {
            if (!log.done) continue;
            if (!m[log.habit_id]) m[log.habit_id] = new Set();
            m[log.habit_id].add(log.date);
        }
        return m;
    }, [logs]);

    const computeStreak = (habitId: string) => {
        const set = logMap[habitId] || new Set();
        let curr = 0;
        let longest = 0;
        let run = 0;
        for (const d of days) {
            if (set.has(d)) { run += 1; longest = Math.max(longest, run); }
            else { run = 0; }
        }
        for (let i = days.length - 1; i >= 0; i--) {
            if (set.has(days[i])) curr += 1;
            else break;
        }
        return { current: curr, longest };
    };

    const toggle = async (habitId: string, date: string) => {
        setLogs((prev) => {
            const existing = prev.find((p) => p.habit_id === habitId && p.date === date);
            if (existing && existing.done) return prev.filter((p) => p.id !== existing.id);
            const nl: HabitLog = { id: `tmp-${habitId}-${date}`, habit_id: habitId, date, done: true };
            return [...prev.filter((p) => !(p.habit_id === habitId && p.date === date)), nl];
        });
        try {
            await api.post("/habit-logs/toggle", { habit_id: habitId, date, done: true });
            refresh();
        } catch { refresh(); }
    };

    const deleteHabit = async (id: string) => {
        setHabits((prev) => prev.filter((h) => h.id !== id));
        try { await api.del(`/habits/${id}`); }
        catch { refresh(); }
    };

    const weeklyRate = useMemo(() => {
        if (habits.length === 0) return 0;
        const last7 = days.slice(-7);
        let done = 0;
        for (const h of habits) for (const d of last7) if (logMap[h.id]?.has(d)) done += 1;
        return Math.round((done / (habits.length * 7)) * 100);
    }, [habits, days, logMap]);

    const topStreak = useMemo(() => {
        let best = 0;
        for (const h of habits) best = Math.max(best, computeStreak(h.id).current);
        return best;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [habits, logMap]);

    return (
        <View style={{ flex: 1, backgroundColor: colors.surface }}>
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <View>
                    <Text style={styles.eyebrow}>Discipline</Text>
                    <Text style={styles.h1}>Habits</Text>
                </View>
                <Pressable
                    style={styles.addBtn}
                    onPress={() => setEditor({ open: true })}
                    testID="habit-add"
                    disabled={habits.length >= 7}
                >
                    <Feather name="plus" size={18} color={colors.onBrand} />
                </Pressable>
            </View>

            {loading ? (
                <View style={[styles.center, { flex: 1 }]}>
                    <ActivityIndicator color={colors.brand} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
                    <View style={styles.metrics}>
                        <View style={styles.metric}>
                            <Text style={styles.metricLabel}>Top streak</Text>
                            <Text style={styles.metricValue}>{topStreak}</Text>
                        </View>
                        <View style={styles.metric}>
                            <Text style={styles.metricLabel}>Weekly rate</Text>
                            <Text style={styles.metricValue}>{weeklyRate}%</Text>
                        </View>
                        <View style={styles.metric}>
                            <Text style={styles.metricLabel}>Habits</Text>
                            <Text style={styles.metricValue}>
                                {habits.length}
                                <Text style={{ color: colors.onSurfaceSecondary, fontSize: fontSize.base }}>/7</Text>
                            </Text>
                        </View>
                    </View>

                    {habits.length === 0 ? (
                        <View style={[styles.center, { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl }]}>
                            <Feather name="activity" size={36} color={colors.borderStrong} />
                            <Text style={styles.emptyTitle}>No habits yet</Text>
                            <Text style={styles.muted}>Add up to 7 daily habits.</Text>
                            <Pressable onPress={() => setEditor({ open: true })} style={styles.primaryBtn} testID="empty-add-habit">
                                <Text style={styles.primaryBtnText}>Add first habit</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.grid}>
                                <View style={styles.dateRow}>
                                    <View style={{ width: 130 }} />
                                    {days.map((d) => {
                                        const isToday = d === today;
                                        return (
                                            <View key={d} style={[styles.dateCell, { width: CELL }]}>
                                                <Text style={[styles.dateLabel, isToday && { color: colors.brand }]}>
                                                    {new Date(d).getDate()}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                                {habits.map((h) => {
                                    const set = logMap[h.id] || new Set();
                                    const streak = computeStreak(h.id);
                                    return (
                                        <View key={h.id} style={styles.habitRow}>
                                            <Pressable
                                                style={styles.habitLabel}
                                                onPress={() => setEditor({ open: true, habit: h })}
                                                testID={`habit-edit-${h.id}`}
                                            >
                                                <Text style={styles.habitName} numberOfLines={1}>
                                                    {h.emoji ? `${h.emoji} ` : ""}{h.name}
                                                </Text>
                                                <Text style={styles.muted}>Streak: {streak.current} · Best: {streak.longest}</Text>
                                            </Pressable>
                                            {days.map((d) => {
                                                const done = set.has(d);
                                                const isToday = d === today;
                                                return (
                                                    <Pressable
                                                        key={d}
                                                        onPress={() => toggle(h.id, d)}
                                                        style={[styles.cell, done && styles.cellOn, isToday && !done && styles.cellToday]}
                                                        testID={`heat-${h.id}-${d}`}
                                                    />
                                                );
                                            })}
                                        </View>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    )}

                    {habits.length > 0 && (
                        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
                            <Text style={styles.sectionLabel}>Manage habits</Text>
                            {habits.map((h) => (
                                <View key={h.id} style={styles.manageRow}>
                                    <Text style={styles.habitName}>{h.emoji ? `${h.emoji} ` : ""}{h.name}</Text>
                                    <Pressable onPress={() => setEditor({ open: true, habit: h })} hitSlop={8}>
                                        <Feather name="edit-2" size={16} color={colors.onSurfaceSecondary} />
                                    </Pressable>
                                    <Pressable onPress={() => deleteHabit(h.id)} hitSlop={8} style={{ marginLeft: spacing.md }} testID={`habit-delete-${h.id}`}>
                                        <Feather name="trash-2" size={16} color={colors.error} />
                                    </Pressable>
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            )}

            <HabitEditor
                visible={editor.open}
                habit={editor.habit ?? null}
                onClose={() => setEditor({ open: false })}
                onSaved={(saved) => {
                    setHabits((prev) => {
                        const i = prev.findIndex((p) => p.id === saved.id);
                        if (i === -1) return [...prev, saved];
                        const next = [...prev];
                        next[i] = saved;
                        return next;
                    });
                    setEditor({ open: false });
                }}
            />
        </View>
    );
}

function HabitEditor({
    visible, habit, onClose, onSaved,
}: {
    visible: boolean;
    habit: Habit | null;
    onClose: () => void;
    onSaved: (h: Habit) => void;
}) {
    const insets = useSafeAreaInsets();
    const [name, setName] = useState("");
    const [emoji, setEmoji] = useState("");
    const [error, setError] = useState("");

    useMemo(() => {
        setName(habit?.name || "");
        setEmoji(habit?.emoji || "");
        setError("");
    }, [habit, visible]);

    const save = async () => {
        if (!name.trim()) return;
        try {
            const saved = habit
                ? await api.patch<Habit>(`/habits/${habit.id}`, { name: name.trim(), emoji })
                : await api.post<Habit>("/habits", { name: name.trim(), emoji });
            onSaved(saved);
        } catch (err: any) {
            setError(err?.message || "Failed to save");
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose} />
            <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
                    <View style={styles.sheetHandle} />
                    <Text style={styles.sheetLabel}>Habit name</Text>
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        style={styles.field}
                        placeholder="e.g. 3 hrs focused freelance work"
                        placeholderTextColor={colors.onSurfaceSecondary}
                        testID="habit-name"
                    />
                    <Text style={styles.sheetLabel}>Emoji (optional)</Text>
                    <TextInput
                        value={emoji}
                        onChangeText={setEmoji}
                        style={styles.field}
                        maxLength={2}
                        testID="habit-emoji"
                    />
                    {!!error && <Text style={{ color: colors.error, marginTop: 8 }}>{error}</Text>}
                    <View style={styles.sheetActions}>
                        <Pressable onPress={save} style={styles.saveBtn} testID="habit-save">
                            <Text style={[styles.btnText, { color: colors.onBrand }]}>Save</Text>
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
    eyebrow: { color: colors.onSurfaceSecondary, fontSize: fontSize.sm, letterSpacing: 1.2, textTransform: "uppercase" },
    h1: { color: colors.onSurface, fontFamily: fontFamily.display, fontSize: fontSize.xxxl, fontWeight: "700" },
    addBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
    center: { alignItems: "center", justifyContent: "center" },
    metrics: { flexDirection: "row", paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, gap: spacing.md },
    metric: { flex: 1, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
    metricLabel: { color: colors.onSurfaceSecondary, fontSize: fontSize.xs, letterSpacing: 1, textTransform: "uppercase" },
    metricValue: { color: colors.onSurface, fontFamily: fontFamily.display, fontSize: fontSize.xxxl, fontWeight: "700" },
    grid: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
    dateRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
    dateCell: { alignItems: "center", height: CELL },
    dateLabel: { color: colors.onSurfaceSecondary, fontSize: fontSize.xs },
    habitRow: { flexDirection: "row", alignItems: "center", marginVertical: 3 },
    habitLabel: { width: 130, paddingRight: spacing.sm },
    habitName: { color: colors.onSurface, fontSize: fontSize.base, fontFamily: fontFamily.text },
    muted: { color: colors.onSurfaceSecondary, fontSize: fontSize.xs },
    cell: { width: CELL - 4, height: CELL - 4, margin: 2, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
    cellOn: { backgroundColor: colors.brand },
    cellToday: { borderWidth: 1, borderColor: colors.brand },
    sectionLabel: { color: colors.onSurfaceSecondary, fontSize: fontSize.xs, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: spacing.sm, fontWeight: "700" },
    manageRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
    emptyTitle: { color: colors.onSurface, fontFamily: fontFamily.display, fontSize: fontSize.xl, marginTop: spacing.md, fontWeight: "700" },
    primaryBtn: { marginTop: spacing.lg, backgroundColor: colors.brand, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.md },
    primaryBtnText: { color: colors.onBrand, fontWeight: "700" },
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
    sheet: { backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    sheetHandle: { alignSelf: "center", width: 36, height: 4, backgroundColor: colors.borderStrong, borderRadius: 2, marginBottom: spacing.md },
    sheetLabel: { color: colors.onSurfaceSecondary, fontSize: fontSize.xs, letterSpacing: 1.2, textTransform: "uppercase", marginTop: spacing.md, marginBottom: spacing.xs, fontWeight: "700" },
    field: { backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.onSurface, fontSize: fontSize.lg, fontFamily: fontFamily.text },
    sheetActions: { flexDirection: "row", marginTop: spacing.xl, gap: spacing.md, justifyContent: "flex-end" },
    saveBtn: { flex: 1, backgroundColor: colors.brand, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: "center" },
    btnText: { fontWeight: "700", fontSize: fontSize.base },
});