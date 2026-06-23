import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Platform,
    KeyboardAvoidingView,
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
import type { CalendarEvent, Client, Project, EventType } from "@/src/types";
import { formatTime, isSameDay } from "@/src/utils/date";

// ─── Date Picker ──────────────────────────────────────────────
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_NAMES = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function DatePickerModal({ visible, value, onConfirm, onCancel }: {
    visible: boolean; value: string;
    onConfirm: (iso: string) => void; onCancel: () => void;
}) {
    const initial = value ? new Date(value) : new Date();
    const [viewYear, setViewYear] = useState(initial.getFullYear());
    const [viewMonth, setViewMonth] = useState(initial.getMonth());
    const [selDay, setSelDay] = useState<number | null>(value ? initial.getDate() : null);
    const [hour, setHour] = useState(initial.getHours());
    const [minute, setMinute] = useState(Math.round(initial.getMinutes() / 15) * 15 % 60);

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);

    const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
    const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };
    const confirm = () => { if (!selDay) return; onConfirm(new Date(viewYear, viewMonth, selDay, hour, minute).toISOString()); };
    const today = new Date();
    const isToday = (d: number) => d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <Pressable style={dpS.overlay} onPress={onCancel} />
            <View style={dpS.card}>
                <View style={dpS.navRow}>
                    <TouchableOpacity onPress={prevMonth} style={dpS.navBtn}><Feather name="chevron-left" size={18} color="#F0F0F0" /></TouchableOpacity>
                    <Text style={dpS.monthTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
                    <TouchableOpacity onPress={nextMonth} style={dpS.navBtn}><Feather name="chevron-right" size={18} color="#F0F0F0" /></TouchableOpacity>
                </View>
                <View style={dpS.dayHeaderRow}>{DAY_NAMES.map(d => <Text key={d} style={dpS.dayHeader}>{d}</Text>)}</View>
                <View style={dpS.grid}>
                    {cells.map((day, i) => {
                        const sel = day === selDay;
                        const tod = day !== null && isToday(day);
                        return (
                            <TouchableOpacity key={i} style={[dpS.cell, sel && dpS.cellSel, tod && !sel && dpS.cellToday]} onPress={() => day !== null && setSelDay(day)} disabled={day === null}>
                                <Text style={[dpS.cellTxt, sel && dpS.cellTxtSel, tod && !sel && dpS.cellTxtToday]}>{day ?? ""}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <View style={dpS.timeRow}>
                    <Feather name="clock" size={14} color="#9E9E9E" />
                    <Text style={dpS.timeLabel}>Time</Text>
                    <TouchableOpacity onPress={() => setHour(h => (h + 23) % 24)} style={dpS.timeBtn}><Feather name="chevron-left" size={14} color="#F0F0F0" /></TouchableOpacity>
                    <Text style={dpS.timeVal}>{String(hour).padStart(2, "0")}</Text>
                    <TouchableOpacity onPress={() => setHour(h => (h + 1) % 24)} style={dpS.timeBtn}><Feather name="chevron-right" size={14} color="#F0F0F0" /></TouchableOpacity>
                    <Text style={dpS.timeSep}>:</Text>
                    <TouchableOpacity onPress={() => setMinute(m => (m + 45) % 60)} style={dpS.timeBtn}><Feather name="chevron-left" size={14} color="#F0F0F0" /></TouchableOpacity>
                    <Text style={dpS.timeVal}>{String(minute).padStart(2, "0")}</Text>
                    <TouchableOpacity onPress={() => setMinute(m => (m + 15) % 60)} style={dpS.timeBtn}><Feather name="chevron-right" size={14} color="#F0F0F0" /></TouchableOpacity>
                </View>
                <View style={dpS.quickRow}>
                    {[{l:"Today",d:0},{l:"Tomorrow",d:1},{l:"+3 Days",d:3},{l:"Next Week",d:7}].map(({l,d}) => (
                        <TouchableOpacity key={l} style={dpS.quickBtn} onPress={() => { const dt = new Date(); dt.setDate(dt.getDate()+d); setViewYear(dt.getFullYear()); setViewMonth(dt.getMonth()); setSelDay(dt.getDate()); }}>
                            <Text style={dpS.quickTxt}>{l}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={dpS.actions}>
                    <TouchableOpacity style={dpS.cancelBtn} onPress={onCancel}><Text style={dpS.cancelTxt}>Cancel</Text></TouchableOpacity>
                    <TouchableOpacity style={[dpS.confirmBtn, !selDay && {opacity:0.4}]} onPress={confirm} disabled={!selDay}><Text style={dpS.confirmTxt}>Set Date</Text></TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const dpS = StyleSheet.create({
    overlay: {...StyleSheet.absoluteFillObject, backgroundColor:"rgba(0,0,0,0.7)"},
    card: {position:"absolute",left:16,right:16,top:"12%",backgroundColor:"#1A1A1A",borderRadius:16,padding:16,borderWidth:1,borderColor:"#2A2A2A"},
    navRow: {flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:12},
    navBtn: {padding:8,borderRadius:8,backgroundColor:"#262626"},
    monthTitle: {color:"#F0F0F0",fontWeight:"700",fontSize:16},
    dayHeaderRow: {flexDirection:"row",marginBottom:4},
    dayHeader: {flex:1,textAlign:"center",color:"#9E9E9E",fontSize:11,fontWeight:"700"},
    grid: {flexDirection:"row",flexWrap:"wrap"},
    cell: {width:`${100/7}%` as any,aspectRatio:1,alignItems:"center",justifyContent:"center",borderRadius:8},
    cellSel: {backgroundColor:"#FF5722"},
    cellToday: {borderWidth:1,borderColor:"#FF5722"},
    cellTxt: {color:"#F0F0F0",fontSize:13},
    cellTxtSel: {color:"#FFFFFF",fontWeight:"700"},
    cellTxtToday: {color:"#FF5722",fontWeight:"700"},
    timeRow: {flexDirection:"row",alignItems:"center",gap:6,marginTop:14,paddingTop:12,borderTopWidth:1,borderTopColor:"#262626"},
    timeLabel: {color:"#9E9E9E",fontSize:13,flex:1},
    timeBtn: {padding:6,borderRadius:6,backgroundColor:"#262626"},
    timeVal: {color:"#F0F0F0",fontSize:16,fontWeight:"700",minWidth:28,textAlign:"center"},
    timeSep: {color:"#F0F0F0",fontSize:16,fontWeight:"700"},
    quickRow: {flexDirection:"row",gap:6,marginTop:12,flexWrap:"wrap"},
    quickBtn: {paddingHorizontal:10,paddingVertical:6,backgroundColor:"#262626",borderRadius:20,borderWidth:1,borderColor:"#404040"},
    quickTxt: {color:"#F0F0F0",fontSize:11,fontWeight:"600"},
    actions: {flexDirection:"row",gap:8,marginTop:16},
    cancelBtn: {flex:1,padding:12,borderRadius:8,borderWidth:1,borderColor:"#404040",alignItems:"center"},
    cancelTxt: {color:"#9E9E9E",fontWeight:"700"},
    confirmBtn: {flex:1,padding:12,borderRadius:8,backgroundColor:"#FF5722",alignItems:"center"},
    confirmTxt: {color:"#FFFFFF",fontWeight:"700"},
});
import { colors, fontFamily, fontSize, radius, spacing } from "@/src/theme";
import type { CalendarEvent, Client, Project } from "@/src/types";
import { formatTime, isSameDay } from "@/src/utils/date";

export default function Schedule() {
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [showAddEvent, setShowAddEvent] = useState(false);

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
        <View style={[styles.root, { paddingTop: insets.top + spacing.xl }]}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.eyebrow}>
                        {now.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}
                    </Text>
                    <Text style={styles.h1}>Today</Text>
                </View>
                <View style={styles.avatarPlaceholder} />
            </View>

            {/* Horizontal Date Picker */}
            <View style={styles.dateSelector}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateSelectorContent}>
                    {[-3, -2, -1, 0, 1, 2, 3].map((offset) => {
                        const d = new Date(now);
                        d.setDate(d.getDate() + offset);
                        const isSelected = offset === 0;
                        const dayName = d.toLocaleDateString([], { weekday: "short" });
                        const dayNum = d.getDate();
                        return (
                            <View key={offset} style={[styles.datePill, isSelected && styles.datePillSelected]}>
                                <Text style={[styles.dateNum, isSelected && styles.dateNumSelected]}>{dayNum}</Text>
                                <Text style={[styles.dateDay, isSelected && styles.dateDaySelected]}>{dayName}</Text>
                                {isSelected && <View style={styles.dateDot} />}
                            </View>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Timeline View */}
            <ScrollView
                contentContainerStyle={{ paddingBottom: spacing.xxxl + 120, paddingHorizontal: spacing.xl, paddingTop: spacing.xl }}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.timelineLine} />
                
                {todaysEvents.map((ev, index) => {
                    const isMeeting = ev.type === "meeting";
                    return (
                        <View key={ev.id} style={styles.timelineRow}>
                            <View style={[styles.timelineNode, isMeeting && styles.timelineNodeActive]} />
                            
                            {isMeeting ? (
                                <View style={styles.timelineCardDark}>
                                    <View style={styles.cardHeaderRow}>
                                        <Text style={styles.cardTitleWhite}>{ev.title}</Text>
                                        <Text style={styles.cardTimeWhite}>{formatTime(ev.start_at)}</Text>
                                    </View>
                                    <Text style={styles.cardDescWhite}>Discuss team task for the day</Text>
                                    <View style={styles.cardFooter}>
                                        <View style={styles.avatarGroup}>
                                            <View style={[styles.avatarMini, { zIndex: 3 }]} />
                                            <View style={[styles.avatarMini, { zIndex: 2, marginLeft: -8 }]} />
                                            <View style={[styles.avatarMini, { zIndex: 1, marginLeft: -8 }]} />
                                        </View>
                                        <View style={styles.checkBtn}>
                                            <Feather name="check" size={14} color={colors.surfaceDark} />
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.timelineCardLight}>
                                    <View style={styles.cardHeaderRow}>
                                        <Text style={styles.cardTitleDark}>{ev.title}</Text>
                                        <Text style={styles.cardTimeMuted}>{formatTime(ev.start_at)}</Text>
                                    </View>
                                    <Text style={styles.cardDescMuted}>Edit icons for team task for next week</Text>
                                </View>
                            )}
                        </View>
                    );
                })}
                
                {todaysEvents.length === 0 && (
                    <Text style={[styles.muted, { paddingLeft: 24 }]}>No events today.</Text>
                )}
            </ScrollView>

            <TouchableOpacity
                style={[styles.headerAddBtn, { position: "absolute", top: insets.top + spacing.xl, right: spacing.xl + 56 }]}
                onPress={() => setShowAddEvent(true)}
            >
                <Feather name="plus" size={20} color={colors.onBrand} />
            </TouchableOpacity>

            <EventDetailSheet
                visible={showAddEvent}
                onClose={() => setShowAddEvent(false)}
                onSaved={(ev) => {
                    setEvents(prev => [...prev, ev]);
                    setShowAddEvent(false);
                }}
            />
        </View>
    );
}

function EventDetailSheet({ visible, onClose, onSaved }: {
    visible: boolean;
    onClose: () => void;
    onSaved: (e: CalendarEvent) => void;
}) {
    const insets = useSafeAreaInsets();
    const [title, setTitle] = useState("");
    const [type, setType] = useState<EventType>("meeting");
    const [startAt, setStartAt] = useState("");
    const [showPicker, setShowPicker] = useState(false);

    const save = async () => {
        if (!title.trim() || !startAt) return;
        try {
            const ev = await api.post<CalendarEvent>("/events", {
                title: title.trim(), type, start_at: startAt
            });
            onSaved(ev);
            setTitle("");
            setStartAt("");
            setType("meeting");
        } catch (err) { console.warn(err); }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose} />
            <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
                    <ScrollView>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetLabel}>Title</Text>
                        <TextInput value={title} onChangeText={setTitle} style={styles.field} placeholderTextColor={colors.onSurfaceSecondary} placeholder="New Event" />
                        
                        <Text style={styles.sheetLabel}>Time</Text>
                        <DatePickerModal
                            visible={showPicker}
                            value={startAt}
                            onConfirm={(iso) => { setStartAt(iso); setShowPicker(false); }}
                            onCancel={() => setShowPicker(false)}
                        />
                        <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.datePickerBtn}>
                            <Feather name="calendar" size={16} color={startAt ? colors.brand : colors.onSurfaceSecondary} />
                            <Text style={[styles.datePickerText, !startAt && { color: colors.onSurfaceSecondary }]}>
                                {startAt ? new Date(startAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Select Time"}
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.sheetLabel}>Type</Text>
                        <View style={styles.chipGroup}>
                            {["meeting", "deadline", "block"].map((t) => (
                                <Pressable key={t} onPress={() => setType(t as EventType)} style={[styles.smallChip, type === t && { borderColor: colors.brand, backgroundColor: colors.brandTertiary }]}>
                                    <Text style={[styles.smallChipText, type === t && { color: colors.brand }]}>{t.toUpperCase()}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Pressable onPress={save} style={styles.saveBtn} disabled={!title.trim() || !startAt}>
                            <Text style={[styles.btnText, { color: colors.onBrand }]}>Schedule</Text>
                        </Pressable>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </Modal>
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
        alignItems: "flex-start",
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.xl,
    },
    eyebrow: {
        color: colors.onSurfaceSecondary,
        fontFamily: fontFamily.text,
        fontSize: fontSize.sm,
        fontWeight: "600",
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    h1: {
        color: colors.onSurface,
        fontFamily: fontFamily.display,
        fontSize: fontSize.xxxl,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.surfaceTertiary,
    },
    dateSelector: {
        marginBottom: spacing.md,
    },
    dateSelectorContent: {
        paddingHorizontal: spacing.xl,
        gap: spacing.md,
        alignItems: "center",
    },
    datePill: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderRadius: 32,
        width: 48,
        height: 80,
    },
    datePillSelected: {
        backgroundColor: colors.surfaceDark,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    dateNum: {
        color: colors.onSurfaceSecondary,
        fontSize: fontSize.base,
        fontWeight: "700",
        marginBottom: 2,
    },
    dateNumSelected: {
        color: colors.onSurfaceDark,
    },
    dateDay: {
        color: colors.onSurfaceSecondary,
        fontSize: fontSize.xs,
        fontWeight: "600",
        textTransform: "uppercase",
    },
    dateDaySelected: {
        color: colors.onSurfaceDark,
        opacity: 0.8,
    },
    dateDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.onSurfaceDark,
        marginTop: 6,
    },
    timelineLine: {
        position: "absolute",
        left: spacing.xl + 6,
        top: spacing.xl,
        bottom: 0,
        width: 2,
        backgroundColor: colors.surfaceTertiary,
    },
    timelineRow: {
        flexDirection: "row",
        marginBottom: spacing.xl,
        paddingLeft: 24,
        position: "relative",
    },
    timelineNode: {
        position: "absolute",
        left: -3,
        top: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: colors.onSurfaceSecondary,
        backgroundColor: colors.surface,
    },
    timelineNodeActive: {
        borderColor: colors.surfaceDark,
        backgroundColor: colors.surfaceDark,
        borderWidth: 3,
    },
    timelineCardDark: {
        flex: 1,
        backgroundColor: colors.surfaceDark,
        borderRadius: 24,
        padding: spacing.lg,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    cardHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    cardTitleWhite: {
        color: colors.onSurfaceDark,
        fontSize: fontSize.lg,
        fontWeight: "700",
    },
    cardTimeWhite: {
        color: colors.onSurfaceDark,
        opacity: 0.7,
        fontSize: fontSize.xs,
        fontWeight: "600",
    },
    cardDescWhite: {
        color: colors.onSurfaceDark,
        opacity: 0.7,
        fontSize: fontSize.sm,
        lineHeight: 20,
        marginBottom: spacing.md,
    },
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    avatarGroup: {
        flexDirection: "row",
    },
    avatarMini: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.surfaceTertiary,
        borderWidth: 2,
        borderColor: colors.surfaceDark,
    },
    checkBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.onSurfaceDark,
        alignItems: "center",
        justifyContent: "center",
    },
    timelineCardLight: {
        flex: 1,
        paddingTop: 2,
        paddingHorizontal: spacing.sm,
    },
    cardTitleDark: {
        color: colors.onSurface,
        fontSize: fontSize.lg,
        fontWeight: "700",
    },
    cardTimeMuted: {
        color: colors.onSurfaceSecondary,
        fontSize: fontSize.xs,
        fontWeight: "600",
    },
    cardDescMuted: {
        color: colors.onSurfaceSecondary,
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
    muted: { color: colors.onSurfaceSecondary, fontSize: fontSize.sm, fontFamily: fontFamily.text },
    
    headerAddBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.brand,
        alignItems: "center",
        justifyContent: "center",
    },
    headerAddBtnText: {
        color: colors.onBrand,
        fontWeight: "700",
        fontSize: fontSize.sm,
    },
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
    sheet: { backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, maxHeight: "85%" },
    sheetHandle: { alignSelf: "center", width: 36, height: 4, backgroundColor: colors.borderStrong, borderRadius: 2, marginBottom: spacing.md },
    sheetLabel: { color: colors.onSurfaceSecondary, fontSize: fontSize.xs, letterSpacing: 1.2, textTransform: "uppercase", marginTop: spacing.md, marginBottom: spacing.xs, fontWeight: "700" },
    field: { backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.onSurface, fontSize: fontSize.lg, fontFamily: fontFamily.text },
    datePickerBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
    datePickerText: { flex: 1, color: colors.onSurface, fontFamily: fontFamily.text, fontSize: fontSize.base },
    chipGroup: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    smallChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    smallChipText: { color: colors.onSurface, fontSize: fontSize.sm, fontWeight: "600" },
    saveBtn: { backgroundColor: colors.brand, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: "center", marginTop: spacing.xl },
    btnText: { fontWeight: "700", fontSize: fontSize.base },
});
