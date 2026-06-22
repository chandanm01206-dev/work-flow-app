import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { LogBox, StatusBar, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { colors } from "@/src/theme";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [loaded, error] = useIconFonts();
    // Fallback: if fonts haven't resolved in 3s, render anyway
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setTimedOut(true), 3000);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (loaded || error) {
            SplashScreen.hideAsync();
        }
    }, [loaded, error]);

    // Don't block on font loading — render anyway after timeout or on load/error
    if (!loaded && !error && !timedOut) return null;

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.surface }}>
            <SafeAreaProvider>
                <StatusBar barStyle="light-content" backgroundColor={colors.surface} />
                <View style={{ flex: 1, backgroundColor: colors.surface }}>
                    <Stack
                        screenOptions={{
                            headerShown: false,
                            contentStyle: { backgroundColor: colors.surface },
                            animation: "fade",
                        }}
                    />
                </View>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}