import { apiFetch } from "@/lib/api"

// Settings → Product templates, as the admin pages use them.

export interface SpecItem { key: string; value: string }
export interface SpecSet { name: string; items: SpecItem[] }
export interface TextBlock { name: string; text: string }
export interface ProductTemplates {
    shippingTerms: string
    warranty: string
    specSets: SpecSet[]
    textBlocks: TextBlock[]
}

export const emptyTemplates: ProductTemplates = { shippingTerms: "", warranty: "", specSets: [], textBlocks: [] }

/**
 * The saved templates, or null when they couldn't be loaded (so a page
 * never mistakes "not loaded" for "empty" and saves over them).
 */
export async function fetchProductTemplates(): Promise<ProductTemplates | null> {
    try {
        const res = await apiFetch("/admin/settings")
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data?.data) return null
        const saved = data.data.productTemplates || {}
        return {
            shippingTerms: saved.shippingTerms ?? "",
            warranty: saved.warranty ?? "",
            specSets: Array.isArray(saved.specSets) ? saved.specSets : [],
            textBlocks: Array.isArray(saved.textBlocks) ? saved.textBlocks : [],
        }
    } catch {
        return null
    }
}
