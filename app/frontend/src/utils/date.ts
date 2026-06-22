/**
 * Date helpers — keep all date math in one place so views stay consistent.
 */

export function todayYMD(d: Date = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export function ymdToDate(ymd: string): Date {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
}

export function startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

export function endOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
}

export function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

export function isOverdue(iso?: string | null): boolean {
    if (!iso) return false;
    return new Date(iso).getTime() < Date.now();
}

export function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatDateTime(iso: string): string {
    return `${formatDate(iso)} · ${formatTime(iso)}`;
}

export function daysUntil(iso: string): number {
    const ms = new Date(iso).getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function getWeekDays(anchor: Date = new Date()): Date[] {
    const start = startOfDay(anchor);
    // Monday-based week
    const dow = (start.getDay() + 6) % 7;
    const monday = addDays(start, -dow);
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}