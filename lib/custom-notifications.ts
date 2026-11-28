import { apiFetch } from "@/lib/api"

// Customers → Custom notification: who it goes to, what tapping it opens,
// saved messages (Settings.notificationTemplates) and the History rows.
// The server rules live in Veepee-backend services/customNotificationService.

export type Audience = "selected" | "buyers" | "wholesalers" | "cart" | "saved" | "guests"
export type Segment = "all" | "buyers" | "wholesalers"
export type Role = "buyer" | "wholesaler"

export const audienceLabels: Record<Audience, string> = {
    selected: "Chosen people",
    buyers: "All customers",
    wholesalers: "All wholesalers",
    cart: "Items in cart",
    saved: "Saved a product",
    guests: "Not signed in",
}

/** "Not signed in": phones that joined in the last 7 or 30 days, or any time (null). */
export type InstalledWithin = 7 | 30 | null
export const installedLabels: { value: InstalledWithin; label: string }[] = [
    { value: 7, label: "Last 7 days" },
    { value: 30, label: "Last 30 days" },
    { value: null, label: "Any time" },
]

export const segmentLabels: Record<Segment, string> = {
    all: "Everyone",
    buyers: "Customers",
    wholesalers: "Wholesalers",
}

export type PageKey =
    | "signup" | "cart" | "wishlist" | "coupons" | "orders" | "hot-deals" | "popular" | "coming-soon" | "wholesaler" | "negotiations"

export const pageLabels: Record<PageKey, string> = {
    signup: "Create account",
    cart: "Cart",
    wishlist: "Wishlist",
    coupons: "My coupons",
    orders: "My orders",
    "hot-deals": "Hot deals",
    popular: "Popular products",
    "coming-soon": "Coming soon",
    wholesaler: "Apply for Wholesaler",
    negotiations: "Ask your price",
}

export const pageKeys = Object.keys(pageLabels) as PageKey[]

/** Pages only one kind of account can use. */
export const pageRoles: Partial<Record<PageKey, Role>> = {
    wholesaler: "buyer",
    negotiations: "wholesaler",
}

/** Pages that work without an account: the only ones "Not signed in" can open. */
export const guestPages: PageKey[] = ["signup", "coupons", "hot-deals", "popular", "coming-soon"]
/** Create account is only for phones that aren't signed in. */
export const guestOnlyPages: PageKey[] = ["signup"]

/** Offered when sending to phones that aren't signed in. */
export const guestWelcome: NotificationTemplate = {
    name: "Welcome: create your account",
    title: "Welcome to OXON",
    body: "Create your account to order OXON tools and sprayers and track your orders.",
    titleHi: "OXON में आपका स्वागत है",
    bodyHi: "OXON के औज़ार और स्प्रेयर ऑर्डर करने और अपने ऑर्डर देखने के लिए अपना खाता बनाएँ।",
    link: { type: "page", page: "signup" },
    imageUrl: "",
}

export const roleWords: Record<Role, string> = { buyer: "customers", wholesaler: "wholesalers" }

/**
 * The one account type a group has, or null when it mixes both (or is a list
 * of people). Phones that aren't signed in become customers when they sign up.
 */
export function audienceRole(audience: Audience, segment: Segment): Role | null {
    if (audience === "buyers" || audience === "guests") return "buyer"
    if (audience === "wholesalers") return "wholesaler"
    if (audience === "cart" || audience === "saved") {
        if (segment === "buyers") return "buyer"
        if (segment === "wholesalers") return "wholesaler"
    }
    return null
}

/** What a saved message (or a History row) opens. */
export interface StoredLink {
    type: "product" | "category" | "sale" | "page"
    id?: string
    page?: PageKey
    name?: string
}

export interface NotificationTemplate {
    name: string
    title: string
    body: string
    titleHi?: string
    bodyHi?: string
    link: StoredLink | null
    imageUrl?: string
}

export const MAX_TEMPLATES = 50

/** The saved messages, or null when they couldn't be loaded. */
export async function fetchNotificationTemplates(): Promise<NotificationTemplate[] | null> {
    try {
        const res = await apiFetch("/admin/settings")
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data?.data) return null
        return Array.isArray(data.data.notificationTemplates) ? data.data.notificationTemplates : []
    } catch {
        return null
    }
}

/** Saves the whole list (nothing else in Settings changes). */
export async function saveNotificationTemplates(templates: NotificationTemplate[]): Promise<NotificationTemplate[]> {
    const res = await apiFetch("/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
            notificationTemplates: templates.map((t) => ({
                name: t.name.trim(),
                title: t.title,
                body: t.body,
                titleHi: t.titleHi || "",
                bodyHi: t.bodyHi || "",
                link: t.link
                    ? t.link.type === "page"
                        ? { type: "page", page: t.link.page }
                        : { type: t.link.type, id: t.link.id, name: t.link.name || "" }
                    : null,
                imageUrl: t.imageUrl || "",
            })),
        }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || "Could not save the saved messages")
    return Array.isArray(data.data?.notificationTemplates) ? data.data.notificationTemplates : templates
}

export interface Campaign {
    _id: string
    title: string
    body: string
    titleHi?: string
    bodyHi?: string
    audience: Audience
    segment?: Segment | null
    installedWithinDays?: number | null
    productId?: string | null
    productName?: string
    link: StoredLink | null
    couponCode?: string
    imageUrl?: string
    sentBy?: { id?: string | null; name?: string }
    recipients: number
    phones: number
    delivered: number
    failed: number
    pushConfigured?: boolean
    skipped?: number
    status?: "sending" | "sent" | "failed"
    pushError?: string
    createdAt: string
}

/** "Product: Pump X", "Cart", "the message". */
export function linkLabel(link: StoredLink | null | undefined): string {
    if (!link) return "The message"
    if (link.type === "page") return link.page ? pageLabels[link.page] || link.page : "A page"
    const kind = link.type === "product" ? "Product" : link.type === "category" ? "Category" : "Sale"
    return link.name ? `${kind}: ${link.name}` : kind
}

/** "Items in cart · Customers", "Saved a product · Pump X". */
export function audienceSummary(audience: Audience, segment?: Segment | null, productName?: string, people?: number, installedWithinDays?: number | null): string {
    let text = audienceLabels[audience] || audience
    if (audience === "guests") text += installedWithinDays ? ` · installed in the last ${installedWithinDays} days` : " · installed any time"
    if (audience === "saved" && productName) text += `: ${productName}`
    if ((audience === "cart" || audience === "saved") && segment && segment !== "all") text += ` · ${segmentLabels[segment]}`
    if (audience === "selected" && people != null) text += ` (${people})`
    return text
}

const NAME = /\{\s*name\s*\}/gi
export const fillName = (text: string, name = "Ramesh") => text.replace(NAME, name)
