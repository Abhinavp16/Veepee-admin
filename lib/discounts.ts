import { useRef, useState } from "react"
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

export type DiscountLoad = "ready" | "loading" | "failed"

/**
 * Discount fields in a brand or category dialog. Only admins see or change
 * them (the discounts API is admin-only). They are saved only once loaded
 * and only when changed, so a failed or slow load never resets them to 0%.
 */
export function useDiscountEditor(kind: DiscountKind, enabled: boolean) {
    const [customerPct, setCustomerPct] = useState("")
    const [wholesalerPct, setWholesalerPct] = useState("")
    const [status, setStatus] = useState<DiscountLoad>("ready")
    const original = useRef({ customer: 0, wholesaler: 0 })
    const request = useRef(0)

    function fill(customer: number, wholesaler: number) {
        original.current = { customer, wholesaler }
        setCustomerPct(customer ? String(customer) : "")
        setWholesalerPct(wholesaler ? String(wholesaler) : "")
    }

    /** A new brand or category: no discounts yet. */
    function startNew() {
        request.current += 1
        fill(0, 0)
        setStatus("ready")
    }

    /** Loads the saved discounts of an existing brand or category. */
    function loadFor(id: string) {
        const current = ++request.current
        fill(0, 0)
        if (!enabled) { setStatus("ready"); return }
        setStatus("loading")
        fetchDiscounts()
            .then((data) => {
                if (current !== request.current) return
                const row = (kind === "company" ? data.companies : data.categories).find((item) => item.id === id)
                fill(row?.customerDiscountPercent || 0, row?.wholesalerDiscountPercent || 0)
                setStatus("ready")
            })
            .catch(() => { if (current === request.current) setStatus("failed") })
    }

    /** What stops saving right now, or null. */
    function problem(): string | null {
        if (!enabled || status === "failed") return null
        if (status === "loading") return "Discounts are still loading. Try again in a moment."
        if (parsePercent(customerPct) === null || parsePercent(wholesalerPct) === null) return "Discounts must be between 0 and 99"
        return null
    }

    /** Saves the discounts for `id` if they were changed here. */
    async function saveFor(id: string) {
        if (!enabled || status !== "ready") return
        const customer = parsePercent(customerPct) ?? 0
        const wholesaler = parsePercent(wholesalerPct) ?? 0
        if (customer === original.current.customer && wholesaler === original.current.wholesaler) return
        await saveDiscount(kind, id, customer, wholesaler)
        original.current = { customer, wholesaler }
    }

    return { enabled, status, customerPct, setCustomerPct, wholesalerPct, setWholesalerPct, startNew, loadFor, problem, saveFor }
}
