"use client"

import { useEffect, useRef, useState } from "react"
import { ImageIcon, Loader2, Package, Search, Tag, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { apiFetch } from "@/lib/api"

// What a custom notification opens, and its picture. The picture is the
// linked item's photo unless the admin uploads another one or takes it off.

export type LinkType = "none" | "product" | "category"

export interface NotificationLinkTarget {
    type: "product" | "category"
    id: string
    name: string
    subtitle?: string
    image: string
}

export type ImageMode = "linked" | "custom" | "none"

interface Props {
    link: NotificationLinkTarget | null
    onLinkChange: (link: NotificationLinkTarget | null) => void
    imageMode: ImageMode
    onImageModeChange: (mode: ImageMode) => void
    customImage: string
    onCustomImageChange: (url: string) => void
}

/** The picture that will be sent ('' for none). */
export function notificationImage(link: NotificationLinkTarget | null, mode: ImageMode, customImage: string) {
    if (mode === "custom") return customImage
    if (mode === "linked") return link?.image || ""
    return ""
}

interface ProductRow {
    _id: string
    name: string
    sku?: string
    retailPrice?: number
    images?: { url: string; isPrimary?: boolean }[]
}

interface CategoryRow {
    _id: string
    name: string
    slug: string
    image?: { url?: string } | string | null
}

const productPhoto = (product: ProductRow) =>
    (product.images?.find((image) => image.isPrimary) || product.images?.[0])?.url || ""

const categoryPhoto = (category: CategoryRow) =>
    typeof category.image === "string" ? category.image : category.image?.url || ""

const tabClass = (active: boolean) =>
    `flex-1 h-9 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${active ? "bg-[#86efac] text-black" : "text-gray-400 hover:text-white"}`

export function NotificationLinkField({ link, onLinkChange, imageMode, onImageModeChange, customImage, onCustomImageChange }: Props) {
    const [tab, setTab] = useState<LinkType>(link?.type || "none")
    const [query, setQuery] = useState("")
    const [products, setProducts] = useState<ProductRow[]>([])
    const [categories, setCategories] = useState<CategoryRow[] | null>(null)
    const [isSearching, setIsSearching] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const fileInput = useRef<HTMLInputElement>(null)

    // Products: search as the admin types (live products only).
    useEffect(() => {
        if (tab !== "product" || link) return
        let cancelled = false
        const timer = setTimeout(async () => {
            setIsSearching(true)
            try {
                const params = new URLSearchParams({ limit: "8", status: "active" })
                if (query.trim()) params.set("search", query.trim())
                const res = await apiFetch(`/admin/products?${params.toString()}`)
                const data = await res.json().catch(() => ({}))
                if (!cancelled) setProducts(res.ok && Array.isArray(data.data) ? data.data : [])
            } catch {
                if (!cancelled) setProducts([])
            } finally {
                if (!cancelled) setIsSearching(false)
            }
        }, 300)
        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [tab, query, link])

    // Categories: loaded once.
    useEffect(() => {
        if (tab !== "category" || categories) return
        let cancelled = false
        ;(async () => {
            setIsSearching(true)
            try {
                const all: CategoryRow[] = []
                for (let page = 1; page <= 20; page += 1) {
                    // Only categories shoppers can open.
                    const res = await apiFetch(`/categories?page=${page}&limit=50&active=true`, { skipAuth: true })
                    const data = await res.json().catch(() => ({}))
                    if (!res.ok) break
                    all.push(...(Array.isArray(data.data) ? data.data : []))
                    if (page >= (Number(data.pagination?.totalPages) || 1)) break
                }
                if (!cancelled) setCategories(all)
            } catch {
                if (!cancelled) setCategories([])
            } finally {
                if (!cancelled) setIsSearching(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [tab, categories])

    function chooseTab(next: LinkType) {
        setTab(next)
        setQuery("")
        if (next === "none") {
            onLinkChange(null)
            if (imageMode === "linked") onImageModeChange("none")
        } else if (link && link.type !== next) {
            onLinkChange(null)
        }
    }

    function pick(target: NotificationLinkTarget) {
        onLinkChange(target)
        // Its photo, unless the admin already chose another picture.
        if (imageMode !== "custom") onImageModeChange(target.image ? "linked" : "none")
    }

    async function upload(file: File) {
        if (!file.type.startsWith("image/")) {
            toast.error("Choose a picture (JPG, PNG or WebP)")
            return
        }
        setIsUploading(true)
        try {
            const form = new FormData()
            form.append("image", file)
            const res = await apiFetch("/upload/image?folder=notifications", { method: "POST", body: form })
            const data = await res.json().catch(() => null)
            if (!res.ok || !data?.success) throw new Error(data?.message || "Upload failed")
            onCustomImageChange(data.data.url as string)
            onImageModeChange("custom")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Upload failed")
        } finally {
            setIsUploading(false)
            if (fileInput.current) fileInput.current.value = ""
        }
    }

    const filteredCategories = (categories || []).filter((category) =>
        category.name.toLowerCase().includes(query.trim().toLowerCase()))
    const shownImage = notificationImage(link, imageMode, customImage)

    return (
        <div className="space-y-5">
            <div className="space-y-2">
                <span className="text-[11px] uppercase text-gray-400 font-bold tracking-[0.1em] ml-1">Opens (optional)</span>
                <div className="flex gap-1 p-1 rounded-lg bg-[#0D0D0D] border border-[#333]" role="tablist" aria-label="What the notification opens">
                    <button type="button" role="tab" aria-selected={tab === "none"} className={tabClass(tab === "none")} onClick={() => chooseTab("none")}>Nothing</button>
                    <button type="button" role="tab" aria-selected={tab === "product"} className={tabClass(tab === "product")} onClick={() => chooseTab("product")}><Package className="w-3.5 h-3.5" /> Product</button>
                    <button type="button" role="tab" aria-selected={tab === "category"} className={tabClass(tab === "category")} onClick={() => chooseTab("category")}><Tag className="w-3.5 h-3.5" /> Category</button>
                </div>

                {tab !== "none" && link && (
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#0D0D0D] border border-[#86efac]/30">
                        {link.image
                            ? <img src={link.image} alt="" className="w-12 h-12 rounded-md object-cover bg-white" />
                            : <div className="w-12 h-12 rounded-md bg-[#1a1a1a] flex items-center justify-center"><ImageIcon className="w-5 h-5 text-gray-600" /></div>}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{link.name}</p>
                            {link.subtitle && <p className="text-xs text-gray-500 truncate">{link.subtitle}</p>}
                        </div>
                        <button type="button" onClick={() => { onLinkChange(null); if (imageMode === "linked") onImageModeChange("none") }} className="h-8 px-3 rounded-md text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5">Change</button>
                    </div>
                )}

                {tab !== "none" && !link && (
                    <div className="rounded-lg border border-[#333] bg-[#0D0D0D] overflow-hidden">
                        <div className="relative border-b border-[#333]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <Input
                                autoFocus
                                aria-label={tab === "product" ? "Search products" : "Search categories"}
                                placeholder={tab === "product" ? "Search products by name or SKU…" : "Search categories…"}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="pl-9 border-0 bg-transparent text-white focus-visible:ring-0 h-10"
                            />
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {isSearching && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-[#86efac]" /></div>}
                            {!isSearching && tab === "product" && products.length === 0 && <p className="py-6 text-center text-sm text-gray-500">No live products found</p>}
                            {!isSearching && tab === "category" && filteredCategories.length === 0 && <p className="py-6 text-center text-sm text-gray-500">No categories found</p>}
                            {!isSearching && tab === "product" && products.map((product) => (
                                <button
                                    key={product._id}
                                    type="button"
                                    onClick={() => pick({
                                        type: "product",
                                        id: product._id,
                                        name: product.name,
                                        subtitle: [product.sku, product.retailPrice != null ? `₹${product.retailPrice.toLocaleString("en-IN")}` : ""].filter(Boolean).join(" · "),
                                        image: productPhoto(product),
                                    })}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/5"
                                >
                                    {productPhoto(product)
                                        ? <img src={productPhoto(product)} alt="" className="w-10 h-10 rounded-md object-cover bg-white" />
                                        : <div className="w-10 h-10 rounded-md bg-[#1a1a1a]" />}
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-sm text-white truncate">{product.name}</span>
                                        <span className="block text-xs text-gray-500 truncate">{product.sku}{product.retailPrice != null ? ` · ₹${product.retailPrice.toLocaleString("en-IN")}` : ""}</span>
                                    </span>
                                </button>
                            ))}
                            {!isSearching && tab === "category" && filteredCategories.map((category) => (
                                <button
                                    key={category._id}
                                    type="button"
                                    onClick={() => pick({ type: "category", id: category._id, name: category.name, image: categoryPhoto(category) })}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/5"
                                >
                                    {categoryPhoto(category)
                                        ? <img src={categoryPhoto(category)} alt="" className="w-10 h-10 rounded-md object-cover bg-white" />
                                        : <div className="w-10 h-10 rounded-md bg-[#1a1a1a]" />}
                                    <span className="text-sm text-white truncate">{category.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <span className="text-[11px] uppercase text-gray-400 font-bold tracking-[0.1em] ml-1">Picture</span>
                <div className="flex flex-wrap items-center gap-3">
                    {shownImage
                        ? <img src={shownImage} alt="Notification picture" className="w-20 h-20 rounded-lg object-cover bg-white border border-[#333]" />
                        : <div className="w-20 h-20 rounded-lg bg-[#0D0D0D] border border-dashed border-[#333] flex items-center justify-center"><ImageIcon className="w-6 h-6 text-gray-600" /></div>}
                    <div className="flex flex-col gap-2">
                        {link?.image && imageMode !== "linked" && (
                            <button type="button" onClick={() => onImageModeChange("linked")} className="h-9 px-3 rounded-md text-xs font-semibold border border-[#333] text-gray-200 hover:bg-white/5 text-left">
                                Use the {link.type === "product" ? "product" : "category"} photo
                            </button>
                        )}
                        <button type="button" disabled={isUploading} onClick={() => fileInput.current?.click()} className="h-9 px-3 rounded-md text-xs font-semibold border border-[#333] text-gray-200 hover:bg-white/5 flex items-center gap-2 disabled:opacity-50">
                            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            {imageMode === "custom" ? "Upload a different picture" : "Upload a picture"}
                        </button>
                        {shownImage && (
                            <button type="button" onClick={() => onImageModeChange("none")} className="h-9 px-3 rounded-md text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 flex items-center gap-2">
                                <X className="w-3.5 h-3.5" /> No picture
                            </button>
                        )}
                    </div>
                    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file) }} />
                </div>
                <p className="text-[11px] text-gray-500">Shows in the Android notification and in the app&apos;s inbox. A wide picture (2:1) looks best when the notification is opened out.</p>
            </div>
        </div>
    )
}
