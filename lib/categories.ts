import { apiFetch } from "@/lib/api"

export interface CategoryOption {
    _id: string
    name: string
    slug: string
    parent?: { _id: string; name: string; slug: string } | string | null
    order?: number
}

export function getCategoryParentId(category: CategoryOption): string | null {
    if (!category.parent) return null
    return typeof category.parent === "string" ? category.parent : category.parent._id
}

export async function fetchAllCategories(): Promise<CategoryOption[]> {
    const pageSize = 50
    const categories: CategoryOption[] = []
    let page = 1
    let totalPages = 1

    do {
        const response = await apiFetch(`/categories?page=${page}&limit=${pageSize}`, { skipAuth: true })
        if (!response.ok) throw new Error("Failed to load categories")

        const payload = await response.json()
        const items = Array.isArray(payload.data) ? payload.data : []
        categories.push(...items)
        totalPages = Math.max(1, Number(payload.pagination?.totalPages) || 1)
        page += 1
    } while (page <= totalPages)

    return categories
}
