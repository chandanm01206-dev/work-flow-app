import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api/client";
import { colors, fontFamily, fontSize, radius, spacing } from "@/src/theme";
import type { CalendarEvent, Client, Habit, HabitLog, Project, Task } from "@/src/types";
import {
    endOfDay,
    isOverdue,
    isSameDay,
    startOfDay,
    todayYMD,
} from "@/src/utils/date";

// ─── Project Status colors ────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
    active: "#34C759",
    delivered: "#007AFF",
    on_hold: "#FF9500",
};

// ─── Add Project Modal ────────────────────────────────────────────────────────
function AddProjectModal({
    visible,
    clients,
    onClose,
    onCreated,
}: {
    visible: boolean;
    clients: Client[];
    onClose: () => void;
    onCreated: (p: Project) => void;
}) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [clientQuery, setClientQuery] = useState("");
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [showClientList, setShowClientList] = useState(false);
    const [status, setStatus] = useState<"active" | "delivered" | "on_hold">("active");
    const [saving, setSaving] = useState(false);

    const filteredClients = clients.filter((c) =>
        c.name.toLowerCase().includes(clientQuery.toLowerCase())
    );

    const reset = () => {
        setName("");
        setDescription("");
        setClientQuery("");
        setSelectedClientId(null);
        setShowClientList(false);
        setStatus("active");
        setSaving(false);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert("Error", "Project name is required.");
            return;
        }
        setSaving(true);
        try {
            let clientId = selectedClientId;

            // If user typed a new client name that doesn't match any existing, create it
            if (!clientId && clientQuery.trim()) {
                const newClient = await api.post<Client>("/clients", {
                    name: clientQuery.trim(),
                });
                clientId = newClient.id;
            }

            if (!clientId) {
                Alert.alert("Error", "Please select or enter a client name.");
                setSaving(false);
                return;
            }

            const project = await api.post<Project>("/projects", {
                name: name.trim(),
                description: description.trim(),
                client_id: clientId,
                status,
            });
            onCreated(project);
            reset();
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to create project.");
            setSaving(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
            <Pressable style={sheet.backdrop} onPress={handleClose} />
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={sheet.kav}>
                <View style={sheet.container}>
                    <View style={sheet.handle} />
                    <Text style={sheet.title}>New Project</Text>

                    {/* Project Name */}
                    <Text style={sheet.label}>Project Name *</Text>
                    <TextInput
                        style={sheet.input}
                        placeholder="e.g. My Awesome App"
                        placeholderTextColor={colors.onSurfaceSecondary}
                        value={name}
                        onChangeText={setName}
                        autoFocus
                    />

                    {/* Description */}
                    <Text style={sheet.label}>Description</Text>
                    <TextInput
                        style={[sheet.input, { height: 72, textAlignVertical: "top" }]}
                        placeholder="What is this project about?"
                        placeholderTextColor={colors.onSurfaceSecondary}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                    />

                    {/* Client */}
                    <Text style={sheet.label}>Client (select or create)</Text>
                    <View>
                        <TextInput
                            style={sheet.input}
                            placeholder="Type client name…"
                            placeholderTextColor={colors.onSurfaceSecondary}
                            value={clientQuery}
                            onChangeText={(t) => {
                                setClientQuery(t);
                                setSelectedClientId(null);
                                setShowClientList(true);
                            }}
                            onFocus={() => setShowClientList(true)}
                        />
                        {showClientList && clientQuery.length > 0 && (
                            <View style={sheet.dropdown}>
                                {filteredClients.length > 0 ? (
                                    filteredClients.slice(0, 4).map((c) => (
                                        <TouchableOpacity
                                            key={c.id}
                                            style={sheet.dropdownItem}
                                            onPress={() => {
                                                setClientQuery(c.name);
                                                setSelectedClientId(c.id);
                                                setShowClientList(false);
                                            }}
                                        >
                                            <Text style={sheet.dropdownText}>{c.name}</Text>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <View style={sheet.dropdownItem}>
                                        <Text style={sheet.dropdownHint}>
                                            ✦ Will create "{clientQuery}" as new client
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Status */}
                    <Text style={sheet.label}>Status</Text>
                    <View style={sheet.chipRow}>
                        {(["active", "on_hold", "delivered"] as const).map((s) => (
                            <Pressable
                                key={s}
                                style={[sheet.chip, status === s && { backgroundColor: colors.surfaceDark, borderColor: colors.surfaceDark }]}
                                onPress={() => setStatus(s)}
                            >
                                <Text style={[sheet.chipText, status === s && { color: colors.onSurfaceDark }]}>
                                    {s === "on_hold" ? "On Hold" : s.charAt(0).toUpperCase() + s.slice(1)}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Save */}
                    <TouchableOpacity
                        style={[sheet.saveBtn, saving && { opacity: 0.6 }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color={colors.onBrand} />
                        ) : (
                            <Text style={sheet.saveBtnText}>Create Project</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const sheet = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
    kav: { justifyContent: "flex-end" },
    container: {
        backgroundColor: colors.surfaceSecondary,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: spacing.xxxl,
        maxHeight: "90%",
    },
    handle: {
        alignSelf: "center",
        width: 36,
        height: 4,
        backgroundColor: colors.borderStrong,
        borderRadius: 2,
        marginBottom: spacing.lg,
    },
    title: {
        fontFamily: fontFamily.displayBold,
        fontSize: fontSize.xxl,
        color: colors.onSurface,
        marginBottom: spacing.lg,
    },
    label: {
        fontFamily: fontFamily.textMedium,
        fontSize: fontSize.sm,
        color: colors.onSurfaceSecondary,
        letterSpacing: 0.8,
        textTransform: "uppercase",
        marginBottom: spacing.xs,
        marginTop: spacing.md,
    },
    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        color: colors.onSurface,
        fontFamily: fontFamily.text,
        fontSize: fontSize.base,
    },
    dropdown: {
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        marginTop: 2,
        zIndex: 999,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    dropdownItem: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    dropdownText: {
        fontFamily: fontFamily.text,
        fontSize: fontSize.base,
        color: colors.onSurface,
    },
    dropdownHint: {
        fontFamily: fontFamily.text,
        fontSize: fontSize.sm,
        color: colors.onSurfaceSecondary,
        fontStyle: "italic",
    },
    chipRow: {
        flexDirection: "row",
        gap: spacing.sm,
        flexWrap: "wrap",
    },
    chip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    chipText: {
        fontFamily: fontFamily.textMedium,
        fontSize: fontSize.sm,
        color: colors.onSurface,
    },
    saveBtn: {
        backgroundColor: colors.surfaceDark,
        paddingVertical: spacing.md + 2,
        borderRadius: radius.md,
        alignItems: "center",
        marginTop: spacing.xl,
    },
    saveBtnText: {
        fontFamily: fontFamily.textBold,
        fontSize: fontSize.base,
        color: colors.onBrand,
    },
});

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [habits, setHabits] = useState<Habit[]>([]);
    const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
    const [showAddProject, setShowAddProject] = useState(false);
    const [focusText, setFocusText] = useState("");
    const [focusDirty, setFocusDirty] = useState(false);

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
    const todayEnd = endOfDay(now);
    const todayStart = startOfDay(now);

    const todaysTasks = tasks
        .filter((t) => {
            if (t.status === "done") return false;
            if (!t.due_at) return false;
            return new Date(t.due_at) <= todayEnd;
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

    const completedHabitIds = new Set(habitLogs.filter((h) => h.done).map((h) => h.habit_id));

    const toggleHabit = async (habitId: string) => {
        const newSet = new Set(completedHabitIds);
        if (newSet.has(habitId)) newSet.delete(habitId);
        else newSet.add(habitId);
        setHabitLogs(Array.from(newSet).map((id) => ({ id, habit_id: id, date: today, done: true })));
        try {
            await api.post("/habit-logs/toggle", { habit_id: habitId, date: today, done: true });
        } catch {
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

    const getClientName = (clientId: string) =>
        clients.find((c) => c.id === clientId)?.name ?? "—";

    if (loading) {
        return (
            <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator color={colors.surfaceDark} />
            </View>
        );
    }

    return (
        <View style={styles.root}>
            {/* Dark Header */}
            <View style={[styles.headerDark, { paddingTop: insets.top + spacing.xl }]}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.greeting}>
                            {now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
                        </Text>
                        <Text style={styles.headerTitle}>
                            {projects.length > 0
                                ? `${projects.length} project${projects.length > 1 ? "s" : ""} in flight`
                                : "Let's build\nsomething great!"}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => setShowAddProject(true)}
                        accessibilityLabel="Add project"
                    >
                        <Feather name="plus" size={22} color={colors.onSurfaceDark} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <Feather name="search" size={18} color={colors.onSurfaceSecondary} />
                    <TextInput
                        placeholder="Search tasks or projects"
                        placeholderTextColor={colors.onSurfaceSecondary}
                        style={styles.searchInput}
                    />
                </View>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingBottom: spacing.xxxl + 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Projects Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Projects</Text>
                    <TouchableOpacity onPress={() => router.push("/(tabs)/tasks" as any)}>
                        <Text style={styles.sectionLink}>All Tasks →</Text>
                    </TouchableOpacity>
                </View>

                {projects.length === 0 ? (
                    <TouchableOpacity
                        style={styles.emptyCard}
                        onPress={() => setShowAddProject(true)}
                    >
                        <Feather name="folder-plus" size={32} color={colors.onSurfaceSecondary} />
                        <Text style={styles.emptyTitle}>No projects yet</Text>
                        <Text style={styles.emptyHint}>Tap here to create your first project</Text>
                    </TouchableOpacity>
                ) : (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.projectsScroll}
                    >
                        {/* Add new project card */}
                        <TouchableOpacity
                            style={styles.addProjectCard}
                            onPress={() => setShowAddProject(true)}
                        >
                            <View style={styles.addProjectIcon}>
                                <Feather name="plus" size={24} color={colors.onSurfaceSecondary} />
                            </View>
                            <Text style={styles.addProjectLabel}>New{"\n"}Project</Text>
                        </TouchableOpacity>

                        {projects.map((p, i) => {
                            const isDark = i % 2 === 0;
                            const taskCount = tasks.filter((t) => t.project_id === p.id).length;
                            const doneCount = tasks.filter((t) => t.project_id === p.id && t.status === "done").length;
                            const statusColor = STATUS_COLORS[p.status] ?? colors.onSurfaceSecondary;

                            return (
                                <TouchableOpacity
                                    key={p.id}
                                    style={isDark ? styles.projectCardDark : styles.projectCardLight}
                                    onPress={() => router.push("/(tabs)/tasks" as any)}
                                    activeOpacity={0.85}
                                >
                                    <View style={isDark ? styles.projectIconDark : styles.projectIconLight}>
                                        <Feather name="box" size={22} color={isDark ? colors.onSurfaceDark : colors.brand} />
                                    </View>

                                    {/* Status dot */}
                                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />

                                    <Text
                                        style={isDark ? styles.projectCardTitleDark : styles.projectCardTitleLight}
                                        numberOfLines={2}
                                    >
                                        {p.name}
                                    </Text>
                                    <Text
                                        style={isDark ? styles.projectCardDescDark : styles.projectCardDescLight}
                                        numberOfLines={2}
                                    >
                                        {getClientName(p.client_id)}
                                    </Text>

                                    {taskCount > 0 && (
                                        <Text style={[isDark ? styles.projectCardDescDark : styles.projectCardDescLight, { marginTop: 4, fontWeight: "700" }]}>
                                            {doneCount}/{taskCount} tasks
                                        </Text>
                                    )}

                                    {isDark && (
                                        <View style={styles.projectCardAction}>
                                            <Feather name="chevron-right" size={18} color={colors.surfaceDark} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                )}

                {/* Today's Events */}
                {todaysEvents.length > 0 && (
                    <>
                        <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
                            <Text style={styles.sectionTitle}>Today's Schedule</Text>
                        </View>
                        <View style={styles.eventsList}>
                            {todaysEvents.slice(0, 3).map((ev) => (
                                <View key={ev.id} style={styles.eventRow}>
                                    <View style={[styles.eventDot, { backgroundColor: ev.type === "meeting" ? colors.surfaceDark : colors.warning }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.eventTitle}>{ev.title}</Text>
                                        <Text style={styles.eventMeta}>{ev.type.toUpperCase()}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                )}

                {/* Daily Focus */}
                <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
                    <Text style={styles.sectionTitle}>Today's Focus</Text>
                </View>
                <View style={styles.focusCard}>
                    <TextInput
                        style={styles.focusInput}
                        placeholder="What's your #1 priority today?"
                        placeholderTextColor={colors.onSurfaceSecondary}
                        value={focusText}
                        onChangeText={(t) => { setFocusText(t); setFocusDirty(true); }}
                        onBlur={saveFocus}
                        multiline
                    />
                </View>

                {/* Tasks Section */}
                <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
                    <Text style={styles.sectionTitle}>Tasks Due Today</Text>
                    <TouchableOpacity onPress={() => router.push("/(tabs)/tasks" as any)}>
                        <Text style={styles.sectionLink}>View all →</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.tasksList}>
                    {todaysTasks.slice(0, 5).map((t) => {
                        const done = t.status === "done";
                        return (
                            <Pressable key={t.id} style={styles.taskCard} onPress={() => toggleTaskDone(t)}>
                                <View style={[styles.circularCheckbox, done && styles.circularCheckboxDone]}>
                                    {done && <Feather name="check" size={12} color={colors.onSurfaceDark} />}
                                </View>
                                <Text style={[styles.taskCardTitle, done && styles.taskDoneText]} numberOfLines={2}>
                                    {t.title}
                                </Text>
                                <View style={[styles.priorityBadge, { backgroundColor: t.priority === "high" ? "#FF3B3020" : t.priority === "medium" ? "#FFCC0020" : "#E5E5EA" }]}>
                                    <Text style={[styles.priorityText, { color: t.priority === "high" ? "#FF3B30" : t.priority === "medium" ? "#B8860B" : colors.onSurfaceSecondary }]}>
                                        {t.priority}
                                    </Text>
                                </View>
                            </Pressable>
                        );
                    })}
                    {todaysTasks.length === 0 && (
                        <View style={styles.emptyCard}>
                            <Feather name="check-circle" size={28} color={colors.borderStrong} />
                            <Text style={styles.emptyTitle}>All clear!</Text>
                            <Text style={styles.emptyHint}>No tasks due today.</Text>
                        </View>
                    )}
                </View>

                {/* Habits */}
                {habits.length > 0 && (
                    <>
                        <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
                            <Text style={styles.sectionTitle}>Habits</Text>
                            <Text style={styles.sectionLink}>{Array.from(completedHabitIds).length}/{habits.length} done</Text>
                        </View>
                        <View style={styles.habitsRow}>
                            {habits.map((h) => {
                                const done = completedHabitIds.has(h.id);
                                return (
                                    <TouchableOpacity key={h.id} style={[styles.habitChip, done && styles.habitChipDone]} onPress={() => toggleHabit(h.id)}>
                                        <Text style={styles.habitEmoji}>{h.emoji || "✦"}</Text>
                                        <Text style={[styles.habitName, done && { color: colors.onSurfaceDark }]} numberOfLines={1}>{h.name}</Text>
                                        {done && <Feather name="check" size={12} color={colors.onSurfaceDark} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Add Project Modal */}
            <AddProjectModal
                visible={showAddProject}
                clients={clients}
                onClose={() => setShowAddProject(false)}
                onCreated={(p) => {
                    setProjects((prev) => [p, ...prev]);
                    setShowAddProject(false);
                }}
            />
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
        paddingBottom: 52,
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
        fontFamily: fontFamily.textMedium,
        marginBottom: 6,
    },
    headerTitle: {
        color: colors.onSurfaceDark,
        fontSize: fontSize.xxl,
        fontFamily: fontFamily.displayBold,
        lineHeight: 30,
        maxWidth: 240,
    },
    addBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.1)",
        alignItems: "center",
        justifyContent: "center",
    },

    searchContainer: {
        marginTop: -26,
        paddingHorizontal: spacing.xl,
        zIndex: 10,
    },
    searchBox: {
        backgroundColor: colors.surfaceSecondary,
        borderRadius: radius.pill,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.lg,
        paddingVertical: 11,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
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

    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: spacing.xl,
        marginTop: spacing.xl,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: fontSize.xl,
        fontFamily: fontFamily.displayBold,
        color: colors.onSurface,
    },
    sectionLink: {
        fontSize: fontSize.sm,
        fontFamily: fontFamily.textMedium,
        color: colors.onSurfaceSecondary,
    },

    projectsScroll: {
        paddingHorizontal: spacing.xl,
        gap: spacing.md,
        alignItems: "flex-start",
    },

    addProjectCard: {
        width: 110,
        height: 160,
        backgroundColor: colors.surfaceSecondary,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: "dashed",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
        padding: spacing.md,
    },
    addProjectIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surfaceTertiary,
        alignItems: "center",
        justifyContent: "center",
    },
    addProjectLabel: {
        fontFamily: fontFamily.textMedium,
        fontSize: fontSize.sm,
        color: colors.onSurfaceSecondary,
        textAlign: "center",
    },

    projectCardDark: {
        backgroundColor: colors.surfaceDark,
        borderRadius: 28,
        padding: spacing.xl,
        width: 200,
        minHeight: 220,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    projectCardLight: {
        backgroundColor: colors.surfaceSecondary,
        borderRadius: 28,
        padding: spacing.xl,
        width: 185,
        minHeight: 200,
        alignSelf: "flex-end",
        borderWidth: 1,
        borderColor: colors.border,
    },
    projectIconDark: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.12)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.lg,
    },
    projectIconLight: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surfaceTertiary,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.lg,
    },
    statusDot: {
        position: "absolute",
        top: spacing.lg,
        right: spacing.lg,
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    projectCardTitleDark: {
        color: colors.onSurfaceDark,
        fontFamily: fontFamily.displayBold,
        fontSize: fontSize.lg,
        marginBottom: spacing.xs,
    },
    projectCardTitleLight: {
        color: colors.onSurface,
        fontFamily: fontFamily.displayBold,
        fontSize: fontSize.lg,
        marginBottom: spacing.xs,
    },
    projectCardDescDark: {
        color: "rgba(255,255,255,0.5)",
        fontFamily: fontFamily.text,
        fontSize: fontSize.sm,
        lineHeight: 18,
    },
    projectCardDescLight: {
        color: colors.onSurfaceSecondary,
        fontFamily: fontFamily.text,
        fontSize: fontSize.sm,
        lineHeight: 18,
    },
    projectCardAction: {
        position: "absolute",
        bottom: spacing.lg,
        right: spacing.lg,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.onSurfaceDark,
        alignItems: "center",
        justifyContent: "center",
    },

    emptyCard: {
        marginHorizontal: spacing.xl,
        backgroundColor: colors.surfaceSecondary,
        borderRadius: 20,
        padding: spacing.xl,
        alignItems: "center",
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    emptyTitle: {
        fontFamily: fontFamily.displayBold,
        fontSize: fontSize.lg,
        color: colors.onSurface,
    },
    emptyHint: {
        fontFamily: fontFamily.text,
        fontSize: fontSize.sm,
        color: colors.onSurfaceSecondary,
        textAlign: "center",
    },

    eventsList: {
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
    },
    eventRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.surfaceSecondary,
        borderRadius: 14,
        padding: spacing.md,
        gap: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    eventDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    eventTitle: {
        fontFamily: fontFamily.textMedium,
        fontSize: fontSize.base,
        color: colors.onSurface,
    },
    eventMeta: {
        fontFamily: fontFamily.text,
        fontSize: fontSize.xs,
        color: colors.onSurfaceSecondary,
        marginTop: 2,
    },

    focusCard: {
        marginHorizontal: spacing.xl,
        backgroundColor: colors.surfaceSecondary,
        borderRadius: 16,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    focusInput: {
        fontFamily: fontFamily.text,
        fontSize: fontSize.base,
        color: colors.onSurface,
        minHeight: 56,
        textAlignVertical: "top",
    },

    tasksList: {
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
    },
    taskCard: {
        backgroundColor: colors.surfaceSecondary,
        borderRadius: 16,
        padding: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    circularCheckbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: colors.surfaceDark,
        alignItems: "center",
        justifyContent: "center",
    },
    circularCheckboxDone: {
        backgroundColor: colors.surfaceDark,
        borderColor: colors.surfaceDark,
    },
    taskCardTitle: {
        flex: 1,
        color: colors.onSurface,
        fontFamily: fontFamily.textMedium,
        fontSize: fontSize.base,
        lineHeight: 20,
    },
    taskDoneText: {
        color: colors.onSurfaceSecondary,
        textDecorationLine: "line-through",
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radius.pill,
    },
    priorityText: {
        fontFamily: fontFamily.textMedium,
        fontSize: fontSize.xs,
        textTransform: "capitalize",
    },

    habitsRow: {
        paddingHorizontal: spacing.xl,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.sm,
    },
    habitChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceSecondary,
    },
    habitChipDone: {
        backgroundColor: colors.surfaceDark,
        borderColor: colors.surfaceDark,
    },
    habitEmoji: { fontSize: 14 },
    habitName: {
        fontFamily: fontFamily.textMedium,
        fontSize: fontSize.sm,
        color: colors.onSurface,
        maxWidth: 100,
    },
    muted: { color: colors.onSurfaceSecondary, fontSize: fontSize.sm, fontFamily: fontFamily.text },
});