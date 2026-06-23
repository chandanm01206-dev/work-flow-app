/**
 * Design tokens for Freelance OS.
 * Source of truth: /app/design_guidelines.json
 */

export const colors = {
    surface: "#F2F4F7",
    surfaceDark: "#1E1E1E",
    onSurface: "#1F1F1F",
    onSurfaceDark: "#FFFFFF",
    surfaceSecondary: "#FFFFFF",
    onSurfaceSecondary: "#8E8E93",
    surfaceTertiary: "#E5E5EA",
    onSurfaceTertiary: "#1F1F1F",
    brand: "#1E1E1E",
    brandSecondary: "#2C2C2E",
    brandTertiary: "rgba(30, 30, 30, 0.1)",
    onBrand: "#FFFFFF",
    success: "#34C759",
    warning: "#FFCC00",
    error: "#FF3B30",
    border: "#E5E5EA",
    borderStrong: "#C7C7CC",
    divider: "#E5E5EA",
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