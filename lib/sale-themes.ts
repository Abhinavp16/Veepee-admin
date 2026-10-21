// The four sale page looks the admin can pick. They follow the app's own
// header (a diagonal gradient, white text, a warm accent). Keep in step with
// the app's lib/screens/sale/sale_theme.dart (same colours and taglines).

export type SaleThemeKey = "diwali" | "clearance" | "flash" | "kisan"

export interface SaleTheme {
    key: SaleThemeKey
    label: string
    forWhat: string
    tagline: string
    // Header colours, top-left to bottom-right (as on the app's Home header).
    gradient: [string, string]
    // Offer pill, countdown digits, Clearance tape, card outline.
    accent: string
    onAccent: string
    // The small tagline above the sale name.
    eyebrow: string
    // Colour of the moving touches (sparkles, streaks, pollen).
    glow: string
}

export const SALE_THEMES: SaleTheme[] = [
    {
        key: "diwali",
        label: "Diwali / Festival",
        forWhat: "Diwali, Dhanteras, festivals",
        tagline: "Festival of lights",
        gradient: ["#4E1A0A", "#8A3510"],
        accent: "#F6B44B",
        onAccent: "#3A1606",
        eyebrow: "#F9D79B",
        glow: "#FFD27A",
    },
    {
        key: "clearance",
        label: "Stock Clearance",
        forWhat: "Last stock, old models",
        tagline: "Last stock, final prices",
        gradient: ["#7A1414", "#C62828"],
        accent: "#FFD54A",
        onAccent: "#3A2A00",
        eyebrow: "#FFC9C4",
        glow: "#FFE9A8",
    },
    {
        // The app's own dark green-black, with its marigold.
        key: "flash",
        label: "Flash Sale",
        forWhat: "One-day or few-hour deals",
        tagline: "Today only",
        gradient: ["#14261A", "#2A3D31"],
        accent: "#F2A93B",
        onAccent: "#14261A",
        eyebrow: "#F2A93B",
        glow: "#F7C66A",
    },
    {
        // Exactly the app's Home header green.
        key: "kisan",
        label: "Kisan Mela / Harvest",
        forWhat: "Season and farmer offers",
        tagline: "Season special for farmers",
        gradient: ["#0E4A1F", "#1F8A3B"],
        accent: "#F4D27A",
        onAccent: "#0E4A1F",
        eyebrow: "#9EE3B0",
        glow: "#9EE3B0",
    },
]

// The header background, as in the app.
export const saleHeaderBackground = (theme: SaleTheme) =>
    `linear-gradient(to bottom right, ${theme.gradient[0]}, ${theme.gradient[1]})`

// The card outline: the accent softened into the app's border colour.
export const saleCardBorder = (theme: SaleTheme) =>
    `color-mix(in srgb, ${theme.accent} 45%, #DFE6DA)`

export const saleTheme = (key: string | undefined) =>
    SALE_THEMES.find((theme) => theme.key === key) || SALE_THEMES[0]

export type SaleStatus = "draft" | "upcoming" | "live" | "ended"

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
    draft: "Draft",
    upcoming: "Scheduled",
    live: "Live",
    ended: "Ended",
}

// "2d 14h", "5h 20m", "12m": time until a date (for the preview and the list).
export function timeUntil(date: string | Date, now = Date.now()): string {
    const ms = new Date(date).getTime() - now
    if (!Number.isFinite(ms) || ms <= 0) return "0m"
    const minutes = Math.floor(ms / 60000)
    const days = Math.floor(minutes / 1440)
    const hours = Math.floor((minutes % 1440) / 60)
    const mins = minutes % 60
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
}
