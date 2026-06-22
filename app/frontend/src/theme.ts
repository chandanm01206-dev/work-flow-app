/**
 * Design tokens for Freelance OS.
 * Source of truth: /app/design_guidelines.json
 */

export const colors = {
    surface: "#101010",
    onSurface: "#F0F0F0",
    surfaceSecondary: "#1A1A1A",
    onSurfaceSecondary: "#9E9E9E",
    surfaceTertiary: "#262626",
    onSurfaceTertiary: "#E0E0E0",
    brand: "#FF5722",
    brandSecondary: "#E64A19",
    brandTertiary: "rgba(255, 87, 34, 0.15)",
    onBrand: "#FFFFFF",
    success: "#00E676",
    warning: "#FFEA00",
    error: "#FF3D00",
    border: "#2A2A2A",
    borderStrong: "#404040",
    divider: "#1F1F1F",
} as const;

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
} as const;

export const radius = {
    sm: 4,
    md: 8,
    lg: 12,
    pill: 999,
} as const;

export const fontFamily = {
    display: "BarlowCondensed_700Bold",
    displayBold: "BarlowCondensed_700Bold",
    text: "IBMPlexSans_400Regular",
    textMedium: "IBMPlexSans_500Medium",
    textBold: "IBMPlexSans_600SemiBold",
    mono: "IBMPlexMono_400Regular",
} as const;

export const fontSize = {
    xs: 11,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
} as const;

export const CATEGORIES = [
    { key: "client_work", label: "Client Work", color: "#FF5722" },
    { key: "startup", label: "Startup", color: "#FFEA00" },
    { key: "learning", label: "Learning", color: "#00E676" },
    { key: "personal", label: "Personal", color: "#9E9E9E" },
] as const;

export const PRIORITIES = [
    { key: "high", label: "High", color: "#FF3D00" },
    { key: "medium", label: "Medium", color: "#FFEA00" },
    { key: "low", label: "Low", color: "#9E9E9E" },
] as const;