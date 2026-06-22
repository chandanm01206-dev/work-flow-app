import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
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
import { CATEGORIES, colors, fontFamily, fontSize, PRIORITIES, radius, spacing } from "@/src/theme";
import type { Task, TaskCategory, TaskPriority } from "@/src/types";
import { endOfDay, formatDateTime, isOverdue, startOfDay } from "@/src/utils/date";

type ViewMode = "today" | "week" | "all" | "by_category";

export default function Tasks() {
    const insets = useSafeAreaInsets();
    const [view, setView] = useState<ViewMode>("today");
    const [category, setCategory] = useState<TaskCategory | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [quickAdd, setQuickAdd] = useState("");
    const [detailTask, setDetailTask] = useState<Task | null>(null);

    const refresh = useCallback(async () => {
        try {
            const t = await api.get<Task[]>("/tasks");
            setTasks(t);
        } catch (err) {
            console.warn(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

    const filtered = useMemo(() => {
        const now = new Date();
        const todayEnd = endOfDay(now);
        const weekEnd = endOfDay(new Date(now.getTime() + 7 * 86400_000));
        let list = tasks;
        if (view === "today") {
            list = tasks.filter((t) => { if (t.status === "done") return false; if (!t.due_at) return false; return new Date(t.due_at) <= todayEnd; });
        } else if (view === "week") {
            list = tasks.filter((t) => { if (t.status === "done") return false; if (!t.due_at) return true; return new Date(t.due_at) <= weekEnd; });
        } else if (view === "by_category" && category) {
            list = tasks.filter((t) => t.category === category);
        }
        return [...list].sort((a, b) => {
            const ao = a.status !== "done" && isOverdue(a.due_at) ? 0 : 1;
            const bo = b.status !== "done" && isOverdue(b.due_at) ? 0 : 1;
            if (ao !== bo) return ao - bo;
            const pri: Record<string, number> = { high: 0, medium: 1, low: 2 };
            const ap = pri[a.priority] - pri[b.priority];
            if (ap !== 0) return ap;
            return (a.order ?? 0) - (b.order ?? 0);
        });
    }, [tasks, view, category]);

    const onQuickAdd = async () => {
        const title = quickAdd.trim();
        if (!title) return;
        setQuickAdd("");
        const optimistic: Task = {
            id: `tmp-${Date.now()}`, title,
            category: category || "personal",
            priority: "medium", status: "todo",
            created_at: new Date().toISOString(), order: Date.now(),
        };
        setTasks((prev) => [...prev, optimistic]);
        try {
            const created = await api.post<Task>("/tasks", { title, category: category || "personal", priority: "medium" });
            setTasks((prev) => prev.map((t) => (t.id === optimistic.id ? created : t)));
        } catch (err) {
            console.warn(err);
            refresh();
        }
    };

    const toggleDone = async (t: Task) => {
        const next = t.status === "done" ? "todo" : "done";
        setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: next } : x)));
        try { await api.patch(`/tasks/${t.id}`, { status: next }); }
        catch { refresh(); }
    };

    const deleteTask = async (id: string) => {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        try { await api.del(`/tasks/${id}`); }
        catch { refresh(); }
    };

    const renderTask = ({ item }: { item: Task }) => {
        const overdue = item.status !== "done" && isOverdue(item.due_at);
        const pri = PRIORITIES.find((p) => p.key === item.priority)!;
        const cat = CATEGORIES.find((c) => c.key === item.category)!;
        return (
            <Pressable style={styles.row} onPress={() => setDetailTask(item)} testID={`task-row-${item.id}`}>
                <Pressable hitSlop={8} onPress={() => toggleDone(item)} testID={`task-toggle-${item.id}`} style={[styles.checkbox, item.status === "done" && styles.checkboxOn]}>
                    {item.status === "done" && <Feather name="check" size={14} color={colors.onBrand} />}
                </Pressable>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.taskTitle, item.status === "done" && styles.taskDone, overdue && { color: colors.error }]} numberOfLines={1}>
                        {item.title}
                    </Text>
                    <View style={styles.metaRow}>
                        <Text style={[styles.tag, { color: cat.color }]}>{cat.label}</Text>
                        {item.due_at && (
                            <Text style={[styles.meta, overdue && { color: colors.error }]}>
                                {overdue ? "OVERDUE · " : ""}{formatDateTime(item.due_at)}
                            </Text>
                        )}
                    </View>
                </View>
                <View style={[styles.priDot, { backgroundColor: pri.color }]} />
            </Pressable>
        );
    };

    const VIEW_TABS: { key: ViewMode; label: string }[] = [
        { key: "today", label: "Today" },
        { key: "week", label: "This Week" },
        { key: "all", label: "All" },
        { key: "by_category", label: "By Category" },
    ];

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <Text style={styles.h1}>Tasks</Text>
                <Text style={styles.count} testID="task-count">{filtered.length}</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRowContent} style={styles.tabRow}>
                {VIEW_TABS.map((t) => {
                    const active = view === t.key;
                    return (
                        <Pressable key={t.key} onPress={() => setView(t.key)} style={[styles.tabChip, active && styles.tabChipActive]} testID={`task-tab-${t.key}`}>
                            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {view === "by_category" && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRowContent} style={styles.tabRow}>
                    {CATEGORIES.map((c) => {
                        const active = category === c.key;
                        return (
                            <Pressable
                                key={c.key}
                                onPress={() => setCategory(active ? null : (c.key as TaskCategory))}
                                style={[styles.tabChip, active && { borderColor: c.color, backgroundColor: colors.surfaceTertiary }]}
                                testID={`cat-chip-${c.key}`}
                            >
                                <View style={[styles.priDot, { backgroundColor: c.color, marginRight: 6 }]} />
                                <Text style={[styles.tabLabel, active && { color: colors.onSurface }]}>{c.label}</Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            )}

            {loading ? (
                <View style={[styles.center, { flex: 1 }]}><ActivityIndicator color={colors.brand} /></View>
            ) : filtered.length === 0 ? (
                <View style={[styles.center, { flex: 1, paddingHorizontal: spacing.xl }]}>
                    <Feather name="inbox" size={36} color={colors.borderStrong} />
                    <Text style={styles.emptyTitle}>No active tasks</Text>
                    <Text style={styles.muted}>Add one below.</Text>
                </View>
            ) : (
                <FlatList data={filtered} keyExtractor={(t) => t.id} renderItem={renderTask} contentContainerStyle={{ paddingBottom: 160 }} testID="task-list" />
            )}

            <View style={[styles.quickAdd, { paddingBottom: Math.max(insets.bottom, spacing.sm) + 4 }]}>
                <Feather name="plus" size={18} color={colors.brand} />
                <TextInput
                    value={quickAdd}
                    onChangeText={setQuickAdd}
                    placeholder="Add a task and press return"
                    placeholderTextColor={colors.onSurfaceSecondary}
                    onSubmitEditing={onQuickAdd}
                    returnKeyType="done"
                    style={styles.quickInput}
                    testID="quick-add-input"
                />
                <Pressable onPress={onQuickAdd} disabled={!quickAdd.trim()} style={[styles.addBtn, !quickAdd.trim() && { opacity: 0.4 }]} testID="quick-add-submit">
                    <Text style={styles.addBtnText}>Add</Text>
                </Pressable>
            </View>

            <TaskDetailSheet
                task={detailTask}
                onClose={() => setDetailTask(null)}
                onSaved={(t) => { setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x))); setDetailTask(null); }}
                onDeleted={(id) => { deleteTask(id); setDetailTask(null); }}
            />
        </KeyboardAvoidingView>
    );
}

function TaskDetailSheet({ task, onClose, onSaved, onDeleted }: {
    task: Task | null;
    onClose: () => void;
    onSaved: (t: Task) => void;
    onDeleted: (id: string) => void;
}) {
    const insets = useSafeAreaInsets();
    const [title, setTitle] = useState(task?.title || "");
    const [desc, setDesc] = useState(task?.description || "");
    const [priority, setPriority] = useState<TaskPriority>(task?.priority || "medium");
    const [cat, setCat] = useState<TaskCategory>(task?.category || "personal");
    const [dueAt, setDueAt] = useState(task?.due_at || "");

    useMemo(() => {
        setTitle(task?.title || "");
        setDesc(task?.description || "");
        setPriority(task?.priority || "medium");
        setCat(task?.category || "personal");
        setDueAt(task?.due_at || "");
    }, [task]);

    if (!task) return null;

    const save = async () => {
        try {
            const updated = await api.patch<Task>(`/tasks/${task.id}`, {
                title: title.trim() || task.title, description: desc, priority, category: cat, due_at: dueAt || null,
            });
            onSaved(updated);
        } catch (err) { console.warn(err); }
    };

    return (
        <Modal visible={!!task} animationType="slide" transparent onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose} />
            <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
                    <ScrollView>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetLabel}>Title</Text>
                        <TextInput value={title} onChangeText={setTitle} style={styles.field} placeholderTextColor={colors.onSurfaceSecondary} testID="detail-title" />
                        <Text style={styles.sheetLabel}>Description</Text>
                        <TextInput value={desc} onChangeText={setDesc} style={[styles.field, { minHeight: 64 }]} multiline placeholder="Optional notes" placeholderTextColor={colors.onSurfaceSecondary} testID="detail-desc" />
                        <Text style={styles.sheetLabel}>Due (YYYY-MM-DD HH:MM)</Text>
                        <TextInput value={dueAt} onChangeText={setDueAt} placeholder="e.g. 2026-05-15T18:00" placeholderTextColor={colors.onSurfaceSecondary} style={styles.field} testID="detail-due" autoCapitalize="none" />
                        <Text style={styles.sheetLabel}>Category</Text>
                        <View style={styles.chipGroup}>
                            {CATEGORIES.map((c) => (
                                <Pressable key={c.key} onPress={() => setCat(c.key as TaskCategory)} style={[styles.smallChip, cat === c.key && { borderColor: c.color, backgroundColor: colors.surfaceTertiary }]} testID={`detail-cat-${c.key}`}>
                                    <View style={[styles.priDot, { backgroundColor: c.color, marginRight: 6 }]} />
                                    <Text style={styles.smallChipText}>{c.label}</Text>
                                </Pressable>
                            ))}
                        </View>
                        <Text style={styles.sheetLabel}>Priority</Text>
                        <View style={styles.chipGroup}>
                            {PRIORITIES.map((p) => (
                                <Pressable key={p.key} onPress={() => setPriority(p.key as TaskPriority)} style={[styles.smallChip, priority === p.key && { borderColor: p.color, backgroundColor: colors.surfaceTertiary }]} testID={`detail-pri-${p.key}`}>
                                    <View style={[styles.priDot, { backgroundColor: p.color, marginRight: 6 }]} />
                                    <Text style={styles.smallChipText}>{p.label}</Text>
                                </Pressable>
                            ))}
                        </View>
                        <View style={styles.sheetActions}>
                            <Pressable onPress={() => onDeleted(task.id)} style={styles.deleteBtn} testID="detail-delete">
                                <Feather name="trash-2" size={16} color={colors.error} />
                                <Text style={[styles.btnText, { color: colors.error }]}>Delete</Text>
                            </Pressable>
                            <Pressable onPress={save} style={styles.saveBtn} testID="detail-save">
                                <Text style={[styles.btnText, { color: colors.onBrand }]}>Save</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
    h1: { color: colors.onSurface, fontFamily: fontFamily.display, fontSize: fontSize.xxxl, fontWeight: "700" },
    count: { color: colors.brand, fontFamily: fontFamily.display, fontSize: fontSize.xxl, fontWeight: "700" },
    tabRow: { flexGrow: 0, maxHeight: 56 },
    tabRowContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm, alignItems: "center" },
    tabChip: { height: 36, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, flexShrink: 0 },
    tabChipActive: { borderColor: colors.brand, backgroundColor: colors.brandTertiary },
    tabLabel: { color: colors.onSurfaceSecondary, fontSize: fontSize.sm, fontWeight: "600" },
    tabLabelActive: { color: colors.brand },
    row: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
    checkbox: { width: 24, height: 24, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
    checkboxOn: { backgroundColor: colors.brand, borderColor: colors.brand },
    taskTitle: { color: colors.onSurface, fontFamily: fontFamily.text, fontSize: fontSize.lg },
    taskDone: { color: colors.onSurfaceSecondary, textDecorationLine: "line-through" },
    metaRow: { flexDirection: "row", gap: spacing.sm, marginTop: 2, alignItems: "center" },
    tag: { fontSize: fontSize.xs, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
    meta: { color: colors.onSurfaceSecondary, fontSize: fontSize.xs },
    priDot: { width: 8, height: 8, borderRadius: 4 },
    center: { alignItems: "center", justifyContent: "center" },
    emptyTitle: { color: colors.onSurface, fontFamily: fontFamily.display, fontSize: fontSize.xl, marginTop: spacing.md, fontWeight: "700" },
    muted: { color: colors.onSurfaceSecondary, fontSize: fontSize.sm, marginTop: 2 },
    quickAdd: { position: "absolute", left: 0, right: 0, bottom: Platform.OS === "ios" ? 84 : 64, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surfaceSecondary },
    quickInput: { flex: 1, color: colors.onSurface, fontFamily: fontFamily.text, fontSize: fontSize.lg, paddingVertical: spacing.sm },
    addBtn: { backgroundColor: colors.brand, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
    addBtnText: { color: colors.onBrand, fontWeight: "700", fontSize: fontSize.sm },
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
    sheet: { backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, maxHeight: "85%" },
    sheetHandle: { alignSelf: "center", width: 36, height: 4, backgroundColor: colors.borderStrong, borderRadius: 2, marginBottom: spacing.md },
    sheetLabel: { color: colors.onSurfaceSecondary, fontSize: fontSize.xs, letterSpacing: 1.2, textTransform: "uppercase", marginTop: spacing.md, marginBottom: spacing.xs, fontWeight: "700" },
    field: { backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.onSurface, fontSize: fontSize.lg, fontFamily: fontFamily.text },
    chipGroup: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    smallChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    smallChipText: { color: colors.onSurface, fontSize: fontSize.sm, fontWeight: "600" },
    sheetActions: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xl, gap: spacing.md },
    deleteBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.error, borderRadius: radius.md },
    saveBtn: { flex: 1, backgroundColor: colors.brand, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: "center" },
    btnText: { fontWeight: "700", fontSize: fontSize.base },
});