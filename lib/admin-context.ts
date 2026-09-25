export function safeInternalReturnTo(value: string | null | undefined, fallback = "/products") {
    if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback

    try {
        const url = new URL(value, "http://admin.local")
        return url.origin === "http://admin.local" ? `${url.pathname}${url.search}${url.hash}` : fallback
    } catch {
        return fallback
    }
}

export function productFormHref(productId: string | null, context: URLSearchParams) {
    const params = new URLSearchParams()
    if (productId) params.set("edit", productId)

    for (const key of ["companyId", "categoryId"] as const) {
        const value = context.get(key)
        if (value) params.set(key, value)
    }

    params.set("returnTo", safeInternalReturnTo(`/products?${context.toString()}`))
    return `/products/add?${params.toString()}`
}
