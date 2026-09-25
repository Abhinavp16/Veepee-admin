import { expect, test } from "@playwright/test"
import { productFormHref, safeInternalReturnTo } from "../lib/admin-context"

test.describe("admin context URLs", () => {
    test("accepts only same-origin internal return paths", () => {
        expect(safeInternalReturnTo("/products?companyId=brand-1")).toBe("/products?companyId=brand-1")
        expect(safeInternalReturnTo("https://example.com/products")).toBe("/products")
        expect(safeInternalReturnTo("//example.com/products")).toBe("/products")
        expect(safeInternalReturnTo("/\\example.com/products")).toBe("/products")
    })

    test("preserves product list context in form links", () => {
        const context = new URLSearchParams("companyId=brand-1&categoryId=category-1&includeDescendants=true&page=2")
        const href = new URL(productFormHref("product-1", context), "http://admin.local")

        expect(href.pathname).toBe("/products/add")
        expect(href.searchParams.get("edit")).toBe("product-1")
        expect(href.searchParams.get("companyId")).toBe("brand-1")
        expect(href.searchParams.get("categoryId")).toBe("category-1")
        expect(href.searchParams.get("returnTo")).toBe("/products?companyId=brand-1&categoryId=category-1&includeDescendants=true&page=2")
    })
})
