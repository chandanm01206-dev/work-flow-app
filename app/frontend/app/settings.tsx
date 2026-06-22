import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, BACKEND_URL } from "@/src/api/client";
import { colors, fontFamily, fontSize, radius, spacing } from "@/src/theme";

export default function Settings() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [importJson, setImportJson] = useState("");
    const [status, setStatus] = useState<{ kind: "ok" | "err" | "none"; msg: string }>({
        kind: "none",
        msg: "",
    });
    const [exportText, setExportText] = useState("");

    const doExport = async () => {
        try {
            const data = await api.get<Record<string, unknown>>("/export");
            const text = JSON.stringify(data, null, 2);
            setExportText(text);
            if (Platform.OS === "web" && typeof window !== "undefined") {
                const blob = new Blob([text], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `freelance-os-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
            }
            setStatus({ kind: "ok", msg: "Exported below. Copy/save it somewhere safe." });
        } catch (err: any) {
            setStatus({ kind: "err", msg: err?.message || "Export failed" });
        }
    };

    const doImport = async () => {
        if (!importJson.trim()) return;
        try {
            const parsed = JSON.parse(importJson);
            await api.post("/import", parsed);
            setStatus({ kind: "ok", msg: "Import successful. All data replaced." });
            setImportJson("");
        } catch (err: any) {
            setStatus({ kind: "err", msg: err?.message || "Import failed — check JSON" });
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1, backgroundColor: colors.surface }}
        >
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <Pressable onPress={() => router.back()} style={styles.backBtn} testID="settings-back">
                    <Feather name="arrow-left" size={20} color={colors.onSurface} />
                </Pressable>
                <Text style={styles.h1}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}>
                <Text style={styles.sectionLabel}>Backend</Text>
                <View style={styles.card}>
                    <Text style={styles.muted}>API base</Text>
                    <Text style={styles.mono} numberOfLines={1}>{BACKEND_URL}</Text>
                </View>

                <Text style={styles.sectionLabel}>Backup · JSON Export</Text>
                <View style={styles.card}>
                    <Text style={styles.muted}>
                        Pulls everything (tasks, clients, projects, events, habits, logs, daily focus).
                    </Text>
                    <Pressable onPress={doExport} style={styles.primaryBtn} testID="export-btn">
                        <Feather name="download" size={16} color={colors.onBrand} />
                        <Text style={styles.primaryBtnText}>Export now</Text>
                    </Pressable>
                    {!!exportText && (
                        <TextInput
                            value={exportText}
                            multiline
                            editable={false}
                            style={styles.jsonArea}
                            testID="export-output"
                        />
                    )}
                </View>

                <Text style={styles.sectionLabel}>Restore · JSON Import</Text>
                <View style={styles.card}>
                    <Text style={[styles.muted, { color: colors.warning }]}>
                        ⚠ Import replaces ALL current data. Export first if unsure.
                    </Text>
                    <TextInput
                        value={importJson}
                        onChangeText={setImportJson}
                        multiline
                        placeholder="Paste exported JSON here…"
                        placeholderTextColor={colors.onSurfaceSecondary}
                        style={styles.jsonArea}
                        testID="import-input"
                        autoCapitalize="none"
                    />
                    <Pressable
                        onPress={doImport}
                        style={[styles.primaryBtn, !importJson.trim() && { opacity: 0.4 }]}
                        disabled={!importJson.trim()}
                        testID="import-btn"
                    >
                        <Feather name="upload" size={16} color={colors.onBrand} />
                        <Text style={styles.primaryBtnText}>Replace data with this JSON</Text>
                    </Pressable>
                </View>

                {status.kind !== "none" && (
                    <View
                        style={[styles.statusCard, { borderColor: status.kind === "ok" ? colors.success : colors.error }]}
                        testID="settings-status"
                    >
                        <Text style={{ color: status.kind === "ok" ? colors.success : colors.error, fontWeight: "600" }}>
                            {status.msg}
                        </Text>
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.md,
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    h1: { color: colors.onSurface, fontFamily: fontFamily.display, fontSize: fontSize.xxl, fontWeight: "700" },
    sectionLabel: {
        color: colors.onSurfaceSecondary,
        fontSize: fontSize.xs,
        letterSpacing: 1.4,
        textTransform: "uppercase",
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
        fontWeight: "700",
    },
    card: {
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: spacing.md,
        gap: spacing.sm,
    },
    muted: { color: colors.onSurfaceSecondary, fontSize: fontSize.sm },
    mono: { color: colors.onSurface, fontFamily: fontFamily.mono, fontSize: fontSize.sm },
    primaryBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        backgroundColor: colors.brand,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        alignSelf: "flex-start",
    },
    primaryBtnText: { color: colors.onBrand, fontWeight: "700", fontSize: fontSize.sm },
    jsonArea: {
        minHeight: 140,
        backgroundColor: colors.surfaceTertiary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: spacing.md,
        color: colors.onSurface,
        fontFamily: fontFamily.mono,
        fontSize: fontSize.xs,
        textAlignVertical: "top",
    },
    statusCard: {
        marginTop: spacing.lg,
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        backgroundColor: colors.surfaceSecondary,
    },
});