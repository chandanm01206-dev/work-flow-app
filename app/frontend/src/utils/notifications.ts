/**
 * Local notifications wrapper. Designed to no-op gracefully on web /
 * Expo Go on Android (where remote-push permissions are restricted in SDK 53+),
 * but schedule real local notifications on iOS / dev builds.
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

let configured = false;

async function ensureConfigured() {
    if (configured) return;
    configured = true;
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });

    if (Platform.OS === "web") return;
    try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") {
            await Notifications.requestPermissionsAsync();
        }
        if (Platform.OS === "android") {
            await Notifications.setNotificationChannelAsync("reminders", {
                name: "Reminders",
                importance: Notifications.AndroidImportance.HIGH,
            });
        }
    } catch {
        // permissions API can throw on Expo Go SDK 53+ Android — ignore, banners still work
    }
}

export async function scheduleEventReminder(args: {
    id: string;
    title: string;
    body: string;
    fireAt: Date;
}): Promise<string | null> {
    await ensureConfigured();
    if (Platform.OS === "web") return null;
    const secondsAhead = Math.floor((args.fireAt.getTime() - Date.now()) / 1000);
    if (secondsAhead <= 0) return null;
    try {
        return await Notifications.scheduleNotificationAsync({
            identifier: args.id,
            content: { title: args.title, body: args.body },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: secondsAhead,
                repeats: false,
                channelId: "reminders",
            },
        });
    } catch {
        return null;
    }
}

export async function cancelReminder(id: string) {
    if (Platform.OS === "web") return;
    try {
        await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
        // ignore
    }
}