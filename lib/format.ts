// One way to show dates and times across the admin, always in India time:
// "21 Oct 2026" and "21 Oct 2026, 1:51 pm".
const TIME_ZONE = "Asia/Kolkata"

function toDate(value: string | number | Date | null | undefined): Date | null {
    if (value === null || value === undefined || value === "") return null
    const date = value instanceof Date ? value : new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: string | number | Date | null | undefined, empty = "—"): string {
    const date = toDate(value)
    return date ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: TIME_ZONE }) : empty
}

export function formatDateTime(value: string | number | Date | null | undefined, empty = "—"): string {
    const date = toDate(value)
    return date
        ? date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: TIME_ZONE })
        : empty
}

// Friendly names for values stored in the database ("payment_verified",
// "buyer", "UNPAID"), so raw codes never show on screen.
const LABELS: Record<string, string> = {
    buyer: "Customer",
    wholesaler: "Wholesaler",
    admin: "Admin",
    staff: "Staff",
    superseded: "Replaced",
    pending_payment: "Pending payment",
    payment_uploaded: "Payment uploaded",
    payment_verified: "Payment verified",
}

export function labelFor(value: string | null | undefined, empty = "—"): string {
    if (!value) return empty
    const key = String(value).toLowerCase()
    if (LABELS[key]) return LABELS[key]
    const words = key.replace(/_/g, " ")
    return words.charAt(0).toUpperCase() + words.slice(1)
}

// Coupon and code dates are whole days in the admin's own time zone (the
// browser's), not UTC: the 12th starts at midnight on the 12th and an end
// date lasts until the end of that day.

/** A stored date as the YYYY-MM-DD a date field shows, in local time. */
export function toDateInput(value: string | Date | null | undefined): string {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** A date field's YYYY-MM-DD as the start (or end) of that local day. */
export function fromDateInput(value: string, end = false): string | undefined {
    if (!value) return undefined
    const [y, m, d] = value.split("-").map(Number)
    const date = end ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d)
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}
