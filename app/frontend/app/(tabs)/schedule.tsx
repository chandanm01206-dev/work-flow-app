import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api/client";
import { colors, fontFamily, fontSize, radius, spacing } from "@/src/theme";
import type { CalendarEvent, Client, Project } from "@/src/types";
import { formatTime, isSameDay } from "@/src/utils/date";

export default function Schedule() {
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);

    const refresh = useCallback(async () => {
        try {
            const [e, p, c] = await Promise.all([
                api.get<CalendarEvent[]>("/events"),
                api.get<Project[]>("/projects"),
                api.get<Client[]>("/clients"),
            ]);
            setEvents(e);
            setProjects(p);
            setClients(c);
        } catch (err) {
            console.warn("schedule load", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [refresh])
    );

    const now = new Date();

    const todaysEvents = events
        .filter((e) => isSameDay(new Date(e.start_at), now))
        .sort((a, b) => a.start_at.localeCompare(b.start_at));

    const upcomingEvents = events
        .filter((e) => new Date(e.start_at) > now)
        .sort((a, b) => a.start_at.localeCompare(b.start_at))
        .slice(0, 20);

    const activeProjects = projects
        .filter((p) => p.status === "active")
        .sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""));

    if (loading) {
        return (
            <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator color={colors.brand} />
            </View>
        );
    }

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.eyebrow}>Calendar</Text>
                    <Text style={styles.h1}>Schedule</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingBottom: spacing.xxxl + 80 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Today */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Today</Text>
                    {todaysEvents.length === 0 ? (
                        <Text style={styles.muted}>Nothing scheduled today.</Text>
                    ) : (
                        todaysEvents.map((ev) => (
                            <EventRow key={ev.id} event={ev} clients={clients} />
                        ))
                    )}
                </View>

                {/* Upcoming */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Upcoming</Text>
                    {upcomingEvents.length === 0 ? (
                        <Text style={styles.muted}>No upcoming events.</Text>
                    ) : (
                        upcomingEvents.map((ev) => (
                            <EventRow key={ev.id} event={ev} clients={clients} showDate />
                        ))
                    )}
                </View>

                {/* Active Projects */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Active Projects</Text>
                    {activeProjects.length === 0 ? (
                        <Text style={styles.muted}>No active projects.</Text>
                    ) : (
                        activeProjects.map((p) => {
                            const client = clients.find((c) => c.id === p.client_id);
                            return (
                                <View key={p.id} style={styles.projectRow}>
                                    <View style={styles.projectDot} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.projectName}>{p.name}</Text>
                                        <Text style={styles.muted}>
                                            {client?.name || "—"}
                                            {p.deadline
                                                ? ` · Due ${new Date(p.deadline).toLocaleDateString([], {
                                                      month: "short",
                                                      day: "numeric",
                                                  })}`
                                                : ""}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

function EventRow({
    event,
    clients,
    showDate,
}: {
    event: CalendarEvent;
    clients: Client[];
    showDate?: boolean;
}) {
    const client = clients.find((c) => c.id === event.client_id);
    return (
        <View style={styles.eventRow} testID={`event-row-${event.id}`}>
            <View style={styles.timeCol}>
                <Text style={styles.eventTime}>{formatTime(event.start_at)}</Text>
                {showDate && (
                    <Text style={styles.eventDate}>
                        {new Date(event.start_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                        })}
                    </Text>
                )}
            </View>
            <View style={styles.eventBar} />
            <View style={{ flex: 1 }}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.muted}>
                    {event.type.toUpperCase()}
                    {client ? ` · ${client.name}` : ""}
                </Text>
            </View>
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
    section: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
    },
    sectionLabel: {
        color: colors.onSurfaceSecondary,
        fontFamily: fontFamily.text,
        fontSize: fontSize.xs,
        letterSpacing: 1.4,
        textTransform: "uppercase",
        marginBottom: spacing.sm,
        fontWeight: "700",
    },
    muted: {
        color: colors.onSurfaceSecondary,
        fontSize: fontSize.sm,
        fontFamily: fontFamily.text,
        marginTop: 2,
    },
    eventRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.sm,
        gap: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    timeCol: { width: 64, gap: 2 },
    eventTime: {
        color: colors.brand,
        fontFamily: fontFamily.display,
        fontSize: fontSize.base,
        fontWeight: "700",
    },
    eventDate: {
        color: colors.onSurfaceSecondary,
        fontSize: fontSize.xs,
    },
    eventBar: { width: 2, height: 28, backgroundColor: colors.border, borderRadius: 1 },
    eventTitle: { color: colors.onSurface, fontFamily: fontFamily.text, fontSize: fontSize.lg },
    projectRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.sm,
        gap: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    projectDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.brand,
    },
    projectName: {
        color: colors.onSurface,
        fontFamily: fontFamily.text,
        fontSize: fontSize.lg,
    },
});
