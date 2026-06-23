import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { LogBox, StatusBar, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { colors } from "@/src/theme";
import { AuthProvider, useAuth } from "@/src/context/AuthContext";

// Suppress noisy logs
LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
    const { token, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === "login";

        if (!token && !inAuthGroup) {
            router.replace("/login");
        } else if (token && inAuthGroup) {
            router.replace("/");
        }
    }, [token, isLoading, segments]);

    if (isLoading) return null;

    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }} />
    );
}

export default function RootLayout() {
    const [fontsLoaded, fontError] = useIconFonts();
    const [timedOut, setTimedOut] = useState(false);

    // Never block render longer than 4 seconds
    useEffect(() => {
        const t = setTimeout(() => setTimedOut(true), 4000);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (fontsLoaded || fontError || timedOut) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded, fontError, timedOut]);

    // Wait for fonts (but never more than 4s)
    if (!fontsLoaded && !fontError && !timedOut) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: colors.onSurfaceSecondary, fontSize: 13 }}>Loading…</Text>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.surface }}>
            <SafeAreaProvider>
                <StatusBar barStyle="light-content" backgroundColor={colors.surface} />
                <AuthProvider>
                    <RootLayoutNav />
                </AuthProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
