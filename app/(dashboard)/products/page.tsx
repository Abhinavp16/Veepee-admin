"use client"

import Link from "next/link"
import { Plus, Loader2, Pencil, Trash2, LayoutGrid, List, Package, Star, Languages, Search } from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import { useDashboardUser } from "@/components/dashboard-context"
import { productFormHref } from "@/lib/admin-context"
import { fetchAllCategories } from "@/lib/categories"

interface Product {
    _id: string
    name: string
    category: string
    categoryIds?: string[]
    categories?: Array<{ _id: string; name: string; slug: string }>
    primaryCategoryId?: string
    primaryCategory?: { _id: string; name: string; slug: string }
    retailPrice: number
    stock: number
    status: string
    sku: string
    rating: number
}

function ProductCategories({ product, limit = 2 }: { product: Product; limit?: number }) {
    const categories = Array.isArray(product.categories) && product.categories.length > 0
        ? product.categories
        : product.primaryCategory
            ? [product.primaryCategory]
            : []
    const labels = categories.length > 0
        ? categories.map((category) => category.name)
        : product.category
            ? [product.category]
            : []

    return (
        <div className="flex min-w-0 flex-wrap items-center gap-1" aria-label="Product categories">
            {labels.slice(0, limit).map((label, index) => (
                <Badge key={`${label}-${index}`} variant="outline" className="max-w-32 truncate border-[#333] text-gray-300 text-xs">
                    {label}
                </Badge>
            ))}
            {labels.length > limit && (
                <Badge variant="outline" className="border-[#333] text-gray-400 text-xs" title={labels.slice(limit).join(", ")}>
                    +{labels.length - limit}
                </Badge>
            )}
            {labels.length === 0 && <span className="text-xs text-gray-500">Uncategorized</span>}
        </div>
    )
}

function getProductRating(product: any): number | null {
    const candidates = [
        product?.rating,
        product?.averageRating,
        product?.ratings?.average,
    ]

    for (const candidate of candidates) {
        const value = Number(candidate)
        if (Number.isFinite(value)) {
            return value
        }
    }

    return null
}

export default function ProductsPage() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const companyId = searchParams.get("companyId")
    const categoryId = searchParams.get("categoryId")
    const includeDescendants = searchParams.get("includeDescendants") === "true"
    const isAdmin = useDashboardUser()?.role === 'admin'
    const [products, setProducts] = useState<Product[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [viewMode, setViewMode] = useState<'list' | 'card'>('card')
    const [isConvertingHindi, setIsConvertingHindi] = useState(false)

    // Pagination & Search state
    const [searchQuery, setSearchQuery] = useState("")
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalProducts, setTotalProducts] = useState(0)
    const [hasMore, setHasMore] = useState(false)
    const [contextCompany, setContextCompany] = useState<{ _id: string; name: string } | null>(null)
    const [contextCategory, setContextCategory] = useState<{ _id: string; name: string } | null>(null)

    useEffect(() => {
        const requestedPage = Math.max(1, Number(searchParams.get("page")) || 1)
        const requestedSearch = searchParams.get("search") || ""
        setSearchQuery(requestedSearch)
        setPage(requestedPage)
        void fetchProducts(requestedPage, true, requestedSearch)
        void fetchContext()
    }, [searchParams])

    async function fetchContext() {
        try {
            if (companyId) {
                const response = await apiFetch(`/companies/${companyId}/categories`)
                const payload = await response.json().catch(() => null)
                if (response.ok) {
                    setContextCompany(payload?.data?.company || null)
                    const associated = Array.isArray(payload?.data?.categories) ? payload.data.categories : []
                    setContextCategory(associated.find((category: any) => category._id === categoryId) || null)
                    return
                }
            }
            setContextCompany(null)
            if (categoryId) {
                const allCategories = await fetchAllCategories()
                setContextCategory(allCategories.find((category) => category._id === categoryId) || null)
            } else {
                setContextCategory(null)
            }
        } catch {
            setContextCompany(null)
            setContextCategory(null)
        }
    }

    async function fetchProducts(pageNum: number = 1, reset: boolean = false, query: string = searchQuery) {
        if (reset) {
            setIsLoading(true)
            setPage(pageNum)
        } else {
            setIsLoadingMore(true)
        }

        try {
            // Build query params
            const params = new URLSearchParams()
            params.append('page', pageNum.toString())
            params.append('limit', '20')
            if (companyId) params.append('companyId', companyId)
            if (categoryId) params.append('categoryId', categoryId)
            if (includeDescendants) params.append('includeDescendants', 'true')
            if (query.trim()) {
                params.append('search', query.trim())
            }

            const res = await apiFetch(`/admin/products?${params.toString()}`)
            const data = await res.json()
            if (res.ok) {
                const items = Array.isArray(data.data) ? data.data : []
                const pagination = data.pagination || {}

                // Only fetch ratings for first page or when resetting to avoid too many API calls
                if (reset || pageNum === 1) {
                    const missingRatingIds: string[] = items
                        .filter((product: any) => getProductRating(product) === null)
                        .map((product: any) => String(product?._id || ""))
                        .filter(Boolean)

                    let ratingsById: Record<string, number> = {}

                    if (missingRatingIds.length > 0) {
                        const detailResults = await Promise.all(
                            missingRatingIds.map(async (productId) => {
                                try {
                                    const detailRes = await apiFetch(`/admin/products/${productId}`)
                                    const detailData = await detailRes.json()
                                    if (!detailRes.ok) return null
                                    const detailedProduct = detailData?.data
                                    const rating = getProductRating(detailedProduct)
                                    return rating === null ? null : { productId, rating }
                                } catch {
                                    return null
                                }
                            })
                        )

                        ratingsById = detailResults.reduce((acc, item) => {
                            if (item) acc[item.productId] = item.rating
                            return acc
                        }, {} as Record<string, number>)
                    }

                    const productsWithRatings = items.map((product: any) => ({
                        ...product,
                        rating: getProductRating(product) ?? ratingsById[String(product?._id || "")] ?? 0,
                    }))

                    setProducts(productsWithRatings)
                } else {
                    // Append new products for load more
                    const missingRatingIds: string[] = items
                        .filter((product: any) => getProductRating(product) === null)
                        .map((product: any) => String(product?._id || ""))
                        .filter(Boolean)

                    let ratingsById: Record<string, number> = {}

                    if (missingRatingIds.length > 0) {
                        const detailResults = await Promise.all(
                            missingRatingIds.map(async (productId) => {
                                try {
                                    const detailRes = await apiFetch(`/admin/products/${productId}`)
                                    const detailData = await detailRes.json()
                                    if (!detailRes.ok) return null
                                    const detailedProduct = detailData?.data
                                    const rating = getProductRating(detailedProduct)
                                    return rating === null ? null : { productId, rating }
                                } catch {
                                    return null
                                }
                            })
                        )

                        ratingsById = detailResults.reduce((acc, item) => {
                            if (item) acc[item.productId] = item.rating
                            return acc
                        }, {} as Record<string, number>)
                    }

                    const newProducts = items.map((product: any) => ({
                        ...product,
                        rating: getProductRating(product) ?? ratingsById[String(product?._id || "")] ?? 0,
                    }))

                    setProducts(prev => [...prev, ...newProducts])
                }

                setTotalPages(pagination.totalPages || 1)
                setTotalProducts(pagination.total || items.length)
                setHasMore((pagination.page || 1) < (pagination.totalPages || 1))
            } else {
                toast.error("Failed to fetch products")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error connecting to server")
        } finally {
            setIsLoading(false)
            setIsLoadingMore(false)
        }
    }

    const handleSearch = useCallback((e: React.FormEvent) => {
        e.preventDefault()
        const next = new URLSearchParams(searchParams.toString())
        if (searchQuery.trim()) next.set("search", searchQuery.trim())
        else next.delete("search")
        next.set("page", "1")
        router.push(`${pathname}?${next.toString()}`)
    }, [pathname, router, searchParams, searchQuery])

    const loadMore = useCallback(() => {
        if (hasMore && !isLoadingMore) {
            const nextPage = page + 1
            const next = new URLSearchParams(searchParams.toString())
            next.set("page", String(nextPage))
            router.push(`${pathname}?${next.toString()}`)
        }
    }, [hasMore, isLoadingMore, page, pathname, router, searchParams])

    function goToPage(nextPage: number) {
        const next = new URLSearchParams(searchParams.toString())
        next.set("page", String(nextPage))
        router.push(`${pathname}?${next.toString()}`)
    }

    const currentQuery = new URLSearchParams(searchParams.toString())
    const addProductHref = productFormHref(null, currentQuery)
    const editProductHref = (id: string) => productFormHref(id, currentQuery)

    async function deleteProduct(productId: string) {
        const confirmed = window.confirm("Are you sure you want to archive this product? It will no longer be visible in the app.")
        if (!confirmed) return

        try {
            const res = await apiFetch(`/admin/products/${productId}`, {
                method: 'DELETE',
            })
            const data = await res.json()

            if (res.ok) {
                toast.success("Product archived successfully")
                fetchProducts(1, true)
            } else {
                toast.error(data.message || "Failed to delete product")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error connecting to server")
        }
    }

    async function convertMissingHindiNames() {
        const confirmed = window.confirm(
            "Convert missing Hindi names for all products that don't have Hindi text yet?"
        )
        if (!confirmed) return

        setIsConvertingHindi(true)
        try {
            const res = await apiFetch('/admin/products/hindi-names/generate-missing', {
                method: 'POST',
                body: JSON.stringify({}),
            })
            const data = await res.json()

            if (!res.ok || !data?.success) {
                toast.error(data?.message || "Failed to convert Hindi names")
                return
            }

            const stats = data.data || {}
            toast.success(
                `Hindi conversion done: ${stats.updated ?? 0} updated, ${stats.skipped ?? 0} skipped (processed ${stats.processed ?? 0}).`
            )
            fetchProducts(1, true)
        } catch (error) {
            console.error(error)
            toast.error("Error converting Hindi names")
        } finally {
            setIsConvertingHindi(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            {(companyId || categoryId) && (
                <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-400">
                    {companyId ? <Link href="/brands" className="hover:text-white">Brands</Link> : <Link href="/categories" className="hover:text-white">Categories</Link>}
                    {companyId && <><span aria-hidden="true">/</span><Link href={`/categories?companyId=${encodeURIComponent(companyId)}`} className="hover:text-white">{contextCompany?.name || "Brand"}</Link></>}
                    {categoryId && <><span aria-hidden="true">/</span><span className="text-gray-300">{contextCategory?.name || "Category"}</span></>}
                    <span aria-hidden="true">/</span><span aria-current="page" className="text-white">Products</span>
                </nav>
            )}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">{contextCategory ? `${contextCategory.name} Products` : contextCompany ? `${contextCompany.name} Products` : "Products"}</h1>
                    <p className="text-gray-400">{includeDescendants && categoryId ? "Including descendant categories. " : "Manage your product catalog. "}{totalProducts > 0 && `(${totalProducts} products)`}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {isAdmin && <Button
                        type="button"
                        onClick={convertMissingHindiNames}
                        disabled={isConvertingHindi}
                        variant="outline"
                        className="border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A]"
                    >
                        {isConvertingHindi ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Languages className="mr-2 h-4 w-4" />
                        )}
                        Convert Missing Hindi Names
                    </Button>}
                    {/* View Toggle */}
                    <div className="flex items-center bg-[#161616] rounded-lg p-1 border border-[#333]">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-[#86efac] text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            <List className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('card')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'card' ? 'bg-[#86efac] text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                    </div>
                    {isAdmin && <Link href={addProductHref} className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#86efac] text-black hover:bg-[#86efac]/90 h-10 px-4 py-2">
                        <Plus className="mr-2 h-4 w-4" /> Add Product
                    </Link>}
                </div>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Search products by name or SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-[#161616] border-[#333] text-white placeholder:text-gray-500 focus-visible:ring-[#86efac]"
                    />
                </div>
                <Button
                    type="submit"
                    variant="outline"
                    className="border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A]"
                >
                    Search
                </Button>
                {searchQuery && (
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            setSearchQuery("")
                            const next = new URLSearchParams(searchParams.toString())
                            next.delete("search")
                            next.set("page", "1")
                            router.push(`${pathname}?${next.toString()}`)
                        }}
                        className="text-gray-400 hover:text-white"
                    >
                        Clear
                    </Button>
                )}
            </form>

            {/* Products Content */}
            {isLoading ? (
                <div className="bg-[#161616] rounded-2xl min-h-[400px] border border-[#333] flex justify-center items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#86efac]" />
                </div>
            ) : products.length === 0 ? (
                <div className="bg-[#161616] rounded-2xl min-h-[400px] border border-[#333] flex flex-col items-center justify-center text-gray-400">
                    <Package className="h-12 w-12 mb-4 opacity-50" />
                    <p>No products found</p>
                    <p className="text-sm">Add your first product to get started</p>
                </div>
            ) : viewMode === 'list' ? (
                /* List View */
                <div className="bg-[#161616] rounded-2xl border border-[#333] overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-[#333] hover:bg-[#1A1A1A]">
                                <TableHead className="text-gray-400">Name</TableHead>
                                <TableHead className="text-gray-400">SKU</TableHead>
                                <TableHead className="text-gray-400">Category</TableHead>
                                <TableHead className="text-gray-400 text-right">Price</TableHead>
                                <TableHead className="text-gray-400 text-right">Stock</TableHead>
                                <TableHead className="text-gray-400 text-center">Rating</TableHead>
                                <TableHead className="text-gray-400 text-center">Status</TableHead>
                                <TableHead className="text-gray-400 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.map((product) => (
                                <TableRow key={product._id} className="border-[#333] hover:bg-[#1A1A1A]">
                                    <TableCell className="text-white font-medium">
                                        {isAdmin ? <Link href={editProductHref(product._id)} className="hover:text-[#86efac] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86efac]">{product.name}</Link> : product.name}
                                    </TableCell>
                                    <TableCell className="text-gray-400">{product.sku}</TableCell>
                                    <TableCell className="text-white">
                                        <ProductCategories product={product} />
                                    </TableCell>
                                    <TableCell className="text-white text-right">₹{product.retailPrice.toLocaleString()}</TableCell>
                                    <TableCell className="text-white text-right">{product.stock}</TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1 text-yellow-500">
                                            <Star className="h-3 w-3 fill-current" />
                                            <span className="text-xs">{product.rating > 0 ? product.rating : "-"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={`${product.status === 'active' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' :
                                            'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20'
                                            }`}>
                                            {product.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {isAdmin && <><Link href={editProductHref(product._id)} aria-label={`Edit ${product.name}`}>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={() => deleteProduct(product._id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button></>}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                /* Card View */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {products.map((product) => (
                        <div
                            key={product._id}
                            className="group relative bg-[#161616] rounded-xl border border-[#333] p-4 hover:border-[#444] transition-colors"
                        >
                            {isAdmin && <Link href={editProductHref(product._id)} className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86efac]" aria-label={`Edit ${product.name}`} />}
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-12 h-12 rounded-xl bg-[#0D0D0D] flex items-center justify-center">
                                    <Package className="h-6 w-6 text-gray-500" />
                                </div>
                                <div className="relative z-10 flex gap-1">
                                    {isAdmin && <><Link href={editProductHref(product._id)} aria-label={`Edit ${product.name}`}>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                    </Link>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={() => deleteProduct(product._id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button></>}
                                </div>
                            </div>
                            <h3 className={`font-semibold text-white text-base mb-1 line-clamp-1 ${isAdmin ? "group-hover:text-[#86efac]" : ""}`}>{product.name}</h3>
                            <p className="text-gray-500 text-xs mb-3">SKU: {product.sku}</p>
                            <div className="flex items-center justify-between mb-3">
                                <ProductCategories product={product} limit={1} />
                                <Badge className={`text-xs ${product.status === 'active' ? 'bg-green-500/10 text-green-500' :
                                    'bg-gray-500/10 text-gray-500'
                                    }`}>
                                    {product.status}
                                </Badge>
                                <div className="flex items-center gap-1 text-yellow-500">
                                    <Star className="h-3 w-3 fill-current" />
                                    <span className="text-xs font-medium">{product.rating > 0 ? product.rating : "-"}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-[#333]">
                                <div>
                                    <p className="text-[#86efac] font-bold text-lg">₹{product.retailPrice.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-500 text-xs">Stock</p>
                                    <p className="text-white font-medium">{product.stock}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {totalPages > 1 && products.length > 0 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                    <Button
                        onClick={() => goToPage(page - 1)}
                        disabled={page <= 1 || isLoading}
                        variant="outline"
                        className="border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A]"
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
                    <Button onClick={loadMore} disabled={!hasMore || isLoading} variant="outline" className="border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A]">Next</Button>
                </div>
            )}
        </div>
    )
}
