import { apiFetch } from "@/lib/api"

export type DiscountRow = {
    id: string
    name: string
    customerDiscountPercent: number
    wholesalerDiscountPercent: number
}

export type DiscountKind = "company" | "category"

export async function fetchDiscounts(): Promise<{ companies: DiscountRow[]; categories: DiscountRow[] }> {
    const res = await apiFetch("/admin/discounts")
    if (!res.ok) throw new Error("Failed to load discounts")
    const body = await res.json()
    return body.data
}

export async function saveDiscount(kind: DiscountKind, id: string, customer: number, wholesaler: number) {
    const res = await apiFetch(`/admin/discounts/${kind}/${id}`, {
        method: "PUT",
        body: JSON.stringify({ customerDiscountPercent: customer, wholesalerDiscountPercent: wholesaler }),
    })
    if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || "Failed to save discount")
    }
}

/** "" means no discount (0). Returns null for anything that is not 0-99. */
export function parsePercent(value: string): number | null {
    const trimmed = value.trim()
    if (trimmed === "") return 0
    const n = Number(trimmed)
    return Number.isFinite(n) && n >= 0 && n < 100 ? n : null
}
