import type { DashboardRole } from "@/lib/navigation"

// "What's new" in the admin: new admin FEATURES (not new data) stay
// highlighted until each staff member has seen them, for 30 days at most.
//
// Adding an entry when you ship a feature:
//   1. Add an object to `whatsNew` below. `id` is permanent: lowercase
//      letters, digits, "-" or "_" (the server refuses anything else), and
//      never reused. `addedOn` is the release date (YYYY-MM-DD); the entry
//      stops counting as new 30 days later, so old entries can be deleted.
//   2. `navHref` is the sidebar link that gets the NEW pill; `href` is where
//      "Open …" in the What's new panel goes. `roles` lists who can use the
//      feature (don't announce admin-only features to staff).
//   3. On the feature's page, highlight the new section:
//        const feature = useNewOnPage("my-feature-id")
//        <Card className={feature.isNew ? "whats-new-glow" : ""}>
//          <CardTitle>Title {feature.isNew && <NewPill />}</CardTitle>
//          <NewFeatureHint feature={feature} />
//      (all from "@/components/whats-new"). Opening the page marks the
//      feature as seen, so the sidebar pill and header count clear.

export interface WhatsNewEntry {
  id: string
  title: string
  /** One line for the What's new panel. */
  body: string
  /** Short text for the "New here: …" row on the feature's page. */
  hint: string
  href: string
  linkLabel: string
  /** The sidebar link that gets the NEW pill. */
  navHref: string
  roles: DashboardRole[]
  /** Release date, YYYY-MM-DD. */
  addedOn: string
}

export const WHATS_NEW_DAYS = 30

export const whatsNew: WhatsNewEntry[] = [
  {
    id: "live-stock",
    title: "Live stock in Price Management",
    body: "Stock now updates by itself while the page is open. Type the real count or tap − / +, pick a reason and save, one row or all at once.",
    hint: "stock refreshes every 20 seconds; type a number or use − / + to change it, and an order placed meanwhile is never overwritten.",
    href: "/price-management",
    linkLabel: "Open Price Management",
    navHref: "/price-management",
    roles: ["admin"],
    addedOn: "2026-11-23",
  },
  {
    id: "wholesaler-applications",
    title: "Wholesaler applications, all in one place",
    body: "Pending, Accepted, Rejected and Removed tabs with search, proof photos kept private, and who decided each one. The menu shows how many are waiting.",
    hint: "every application is listed here now (none are missed), with tabs, search, private proof photos and who accepted or rejected it.",
    href: "/account-upgrades",
    linkLabel: "Open Account Upgrades",
    navHref: "/account-upgrades",
    roles: ["admin"],
    addedOn: "2026-11-23",
  },
  {
    id: "custom-notifications-v2",
    title: "Smarter notifications",
    body: "Send to people with items in their cart or who saved a product, with their name, Hindi text, a coupon, saved messages and a History tab.",
    hint: "Custom Notification can now reach carts and wishlists, add names, Hindi and coupons, and shows what was sent under History.",
    href: "/customers",
    linkLabel: "Open Customers",
    navHref: "/customers",
    roles: ["admin"],
    addedOn: "2026-11-20",
  },
  {
    id: "product-templates",
    title: "Product templates",
    body: "Write Shipping & Returns and Warranty once in Settings and use them on every product.",
    hint: "type it once, then pick it in the product form.",
    href: "/settings",
    linkLabel: "Open Settings",
    navHref: "/settings",
    roles: ["admin"],
    addedOn: "2026-11-18",
  },
  {
    id: "notification-link-picture",
    title: "Notifications with link and picture",
    body: "Send to all customers or wholesalers, with a product or category link and a photo.",
    hint: "press Custom Notification to send to a whole group, with a link and a picture.",
    href: "/customers",
    linkLabel: "Open Customers",
    navHref: "/customers",
    roles: ["admin"],
    addedOn: "2026-11-18",
  },
]

/** True from the entry's date (local midnight) until 30 days after it. */
export function isWithinWhatsNewWindow(entry: Pick<WhatsNewEntry, "addedOn">, now: number = Date.now()): boolean {
  const [year, month, day] = entry.addedOn.split("-").map(Number)
  if (!year || !month || !day) return false
  const start = new Date(year, month - 1, day).getTime()
  const end = new Date(year, month - 1, day + WHATS_NEW_DAYS).getTime()
  return now >= start && now < end
}

/** The entries this role can use that are still within their 30 days. */
export function currentWhatsNew(role: DashboardRole, now: number = Date.now()): WhatsNewEntry[] {
  return whatsNew.filter((entry) => entry.roles.includes(role) && isWithinWhatsNewWindow(entry, now))
}
