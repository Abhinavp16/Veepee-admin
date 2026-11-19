"use client"

import { useEffect, useRef, useState } from "react"
import { ImageIcon, Loader2, Search, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { apiFetch } from "@/lib/api"

// Custom notification pieces: a product / category / sale picker (also used
// for "Saved a product") and the picture. The picture is the linked item's
// photo (a sale's banner) unless the admin uploads another one or takes it off.

export type PickerKind = "product" | "category" | "sale"

export interface NotificationLinkTarget {
    type: PickerKind
    id: string
    name: string
    subtitle?: string
    image: string
    /** A sale for one account type only (customers: buyer). */
    role?: "buyer" | "wholesaler" | null
}

export type ImageMode = "linked" | "custom" | "none"

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

interface SaleRow {
    id: string
    name: string
    status: "draft" | "upcoming" | "live" | "ended"
    audience?: string
    startsAt: string
    endsAt: string
    heroImageUrl?: string
}

const productPhoto = (product: ProductRow) =>
    (product.images?.find((image) => image.isPrimary) || product.images?.[0])?.url || ""

const categoryPhoto = (category: CategoryRow) =>
    typeof category.image === "string" ? category.image : category.image?.url || ""

const shortDate = (value: string) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
const saleAudience: Record<string, string> = { customers: "Customers", wholesalers: "Wholesalers", both: "Everyone" }
const saleRole: Record<string, "buyer" | "wholesaler" | null> = { customers: "buyer", wholesalers: "wholesaler", both: null }

const placeholder = { product: "Search products by name or SKU…", category: "Search categories…", sale: "Search sales…" }
const emptyText = { product: "No live products found", category: "No categories found", sale: "No live or upcoming sales. Create one in Sales." }

/**
 * Pick a product, category or sale: a search list, or the chosen one with a
 * Change button.
 */
export function ItemPicker({ kind, value, onChange, label, disabledReason }: {
    kind: PickerKind
    value: NotificationLinkTarget | null
    onChange: (target: NotificationLinkTarget | null) => void
    label?: string
    /** Why an item can't be picked now (e.g. a wholesalers-only sale for All customers). */
    disabledReason?: (target: NotificationLinkTarget) => string | null
}) {
    const [query, setQuery] = useState("")
    const [products, setProducts] = useState<ProductRow[]>([])
    const [categories, setCategories] = useState<CategoryRow[] | null>(null)
    const [sales, setSales] = useState<SaleRow[] | null>(null)
    const [isSearching, setIsSearching] = useState(false)

    // Products: search as the admin types (live products only).
    useEffect(() => {
        if (kind !== "product" || value) return
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
    }, [kind, query, value])

    // Categories: loaded once.
    useEffect(() => {
        if (kind !== "category" || categories) return
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
    }, [kind, categories])

    // Sales: live and upcoming ones (ended and draft sales can't be linked).
    useEffect(() => {
        if (kind !== "sale" || sales) return
        let cancelled = false
        ;(async () => {
            setIsSearching(true)
            try {
                const res = await apiFetch("/admin/sales")
                const data = await res.json().catch(() => ({}))
                const rows: SaleRow[] = res.ok && Array.isArray(data.data) ? data.data : []
                if (!cancelled) setSales(rows.filter((sale) => sale.status === "live" || sale.status === "upcoming"))
            } catch {
                if (!cancelled) setSales([])
            } finally {
                if (!cancelled) setIsSearching(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [kind, sales])

    if (value) {
        return (
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#0D0D0D] border border-[#86efac]/30">
                {value.image
                    ? <img src={value.image} alt="" className="w-12 h-12 rounded-md object-cover bg-white shrink-0" />
                    : <div className="w-12 h-12 rounded-md bg-[#1a1a1a] flex items-center justify-center shrink-0"><ImageIcon className="w-5 h-5 text-gray-600" /></div>}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{value.name}</p>
                    {value.subtitle && <p className="text-xs text-gray-500 truncate">{value.subtitle}</p>}
                </div>
                <button type="button" onClick={() => onChange(null)} className="h-8 px-3 rounded-md text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5">
                    Change<span className="sr-only"> {value.name}</span>
                </button>
            </div>
        )
    }

    const q = query.trim().toLowerCase()
    const filteredCategories = (categories || []).filter((category) => category.name.toLowerCase().includes(q))
    const filteredSales = (sales || []).filter((sale) => sale.name.toLowerCase().includes(q))
    const empty = !isSearching && (
        (kind === "product" && products.length === 0)
        || (kind === "category" && filteredCategories.length === 0)
        || (kind === "sale" && filteredSales.length === 0))
    const rowClass = "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/5 focus:bg-white/5 focus:outline-none"
    const thumb = (url: string, wide = false) => url
        ? <img src={url} alt="" className={`${wide ? "w-16" : "w-10"} h-10 rounded-md object-cover bg-white shrink-0`} />
        : <div className={`${wide ? "w-16" : "w-10"} h-10 rounded-md bg-[#1a1a1a] shrink-0`} />

    return (
        <div className="rounded-lg border border-[#333] bg-[#0D0D0D] overflow-hidden">
            <div className="relative border-b border-[#333]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" aria-hidden="true" />
                <Input
                    aria-label={label || placeholder[kind]}
                    placeholder={placeholder[kind]}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9 border-0 bg-transparent text-white focus-visible:ring-0 h-10"
                />
            </div>
            <div className="max-h-64 overflow-y-auto">
                {isSearching && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-[#86efac]" /></div>}
                {empty && <p className="py-6 px-3 text-center text-sm text-gray-500">{emptyText[kind]}</p>}
                {!isSearching && kind === "product" && products.map((product) => {
                    const price = product.retailPrice != null ? `₹${product.retailPrice.toLocaleString("en-IN")}` : ""
                    return (
                        <button
                            key={product._id}
                            type="button"
                            onClick={() => onChange({ type: "product", id: product._id, name: product.name, subtitle: [product.sku, price].filter(Boolean).join(" · "), image: productPhoto(product) })}
                            className={rowClass}
                        >
                            {thumb(productPhoto(product))}
                            <span className="flex-1 min-w-0">
                                <span className="block text-sm text-white truncate">{product.name}</span>
                                <span className="block text-xs text-gray-500 truncate">{[product.sku, price].filter(Boolean).join(" · ")}</span>
                            </span>
                        </button>
                    )
                })}
                {!isSearching && kind === "category" && filteredCategories.map((category) => (
                    <button
                        key={category._id}
                        type="button"
                        onClick={() => onChange({ type: "category", id: category._id, name: category.name, image: categoryPhoto(category) })}
                        className={rowClass}
                    >
                        {thumb(categoryPhoto(category))}
                        <span className="text-sm text-white truncate">{category.name}</span>
                    </button>
                ))}
                {!isSearching && kind === "sale" && filteredSales.map((sale) => {
                    const when = sale.status === "live" ? `Live · ends ${shortDate(sale.endsAt)}` : `Starts ${shortDate(sale.startsAt)}`
                    const subtitle = [when, saleAudience[sale.audience || ""] && `For ${saleAudience[sale.audience || ""].toLowerCase()}`].filter(Boolean).join(" · ")
                    const target: NotificationLinkTarget = { type: "sale", id: sale.id, name: sale.name, subtitle, image: sale.heroImageUrl || "", role: saleRole[sale.audience || ""] ?? null }
                    const blocked = disabledReason?.(target) || null
                    return (
                        <button
                            key={sale.id}
                            type="button"
                            disabled={Boolean(blocked)}
                            onClick={() => onChange(target)}
                            className={`${rowClass} disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                            {thumb(sale.heroImageUrl || "", true)}
                            <span className="flex-1 min-w-0">
                                <span className="block text-sm text-white truncate">{sale.name}</span>
                                <span className={`block text-xs truncate ${sale.status === "live" ? "text-green-400" : "text-gray-500"}`}>{subtitle}</span>
                                {blocked && <span className="block text-xs text-amber-400 truncate">{blocked}</span>}
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

/** The picture: the linked item's photo, an uploaded one, or none. */
export function NotificationPictureField({ link, imageMode, onImageModeChange, customImage, onCustomImageChange }: {
    link: NotificationLinkTarget | null
    imageMode: ImageMode
    onImageModeChange: (mode: ImageMode) => void
    customImage: string
    onCustomImageChange: (url: string) => void
}) {
    const [isUploading, setIsUploading] = useState(false)
    const fileInput = useRef<HTMLInputElement>(null)

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

    const shownImage = notificationImage(link, imageMode, customImage)
    const photoWord = link?.type === "sale" ? "sale banner" : `${link?.type} photo`

    return (
        <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-300">Picture</span>
            <div className="flex flex-wrap items-center gap-3">
                {shownImage
                    ? <img src={shownImage} alt="Notification picture" className="w-20 h-20 rounded-lg object-cover bg-white border border-[#333]" />
                    : <div className="w-20 h-20 rounded-lg bg-[#0D0D0D] border border-dashed border-[#333] flex items-center justify-center"><ImageIcon className="w-6 h-6 text-gray-600" aria-hidden="true" /></div>}
                <div className="flex flex-col gap-2">
                    {link?.image && imageMode !== "linked" && (
                        <button type="button" onClick={() => onImageModeChange("linked")} className="h-9 px-3 rounded-md text-xs font-semibold border border-[#333] text-gray-300 hover:bg-white/5 text-left">
                            Use the {photoWord}
                        </button>
                    )}
                    <button type="button" disabled={isUploading} onClick={() => fileInput.current?.click()} className="h-9 px-3 rounded-md text-xs font-semibold border border-[#333] text-gray-300 hover:bg-white/5 flex items-center gap-2 disabled:opacity-50">
                        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        {imageMode === "custom" ? "Upload a different picture" : "Upload a picture"}
                    </button>
                    {shownImage && (
                        <button type="button" onClick={() => onImageModeChange("none")} className="h-9 px-3 rounded-md text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 flex items-center gap-2">
                            <X className="w-3.5 h-3.5" /> No picture
                        </button>
                    )}
                </div>
                <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-hidden="true" tabIndex={-1} onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file) }} />
            </div>
            <p className="text-[11px] text-gray-500">Shows in the Android notification and in the app&apos;s inbox. A wide picture (2:1) looks best when the notification is opened out.</p>
        </div>
    )
}
