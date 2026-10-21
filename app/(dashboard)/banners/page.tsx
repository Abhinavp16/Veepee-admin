"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
    Loader2, Save, Plus, Trash2, GripVertical, Image as ImageIcon, Upload, Search,
    ArrowRight, ChevronUp, ChevronDown
} from "lucide-react"
import { HugeiconsIcon } from "@hugeicons/react"
import * as HugeIconsFree from "@hugeicons/core-free-icons"
import { toast } from "sonner"
import { apiFetch, buildApiUrl } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { placeholderImage } from "@/lib/placeholder-image"
import { SortableItem, SortableProvider } from "@/components/sortable"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"

// Generate a searchable list of all Lucide icons
const ICON_OPTIONS = [
    { label: "Ticket (Offer)", value: "Ticket01Icon" },
    { label: "Discount / %", value: "Percent01Icon" },
    { label: "Deal Tag", value: "Tag01Icon" },
    { label: "Shopping Bag", value: "ShoppingBag01Icon" },
    { label: "Market Cart", value: "ShoppingCart01Icon" },
    { label: "Gift Box", value: "GiftIcon" },
    { label: "Flash Sale", value: "FlashIcon" },
    { label: "Truck / Delivery", value: "DeliveryBox01Icon" },
    { label: "Arrow Right", value: "ArrowRight01Icon" },
    { label: "Sparkles", value: "SparklesIcon" },
]

// Filter and prepare ALL available HugeIcons
const ALL_HUGE_ICONS = Object.keys(HugeIconsFree)
    .filter(key => key.endsWith('Icon'))
    .map(key => ({
        label: key.replace('Icon', '').replace(/([A-Z])/g, ' $1').trim(),
        value: key
    }))

const BUTTON_TEXT_SUGGESTIONS = [
    "Shop Now",
    "Explore",
    "View More",
    "Buy Now"
]

function getIconComponent(iconName: string) {
    if (!iconName || iconName === 'none') return <ArrowRight className="h-4 w-4 text-white" />
    
    // Find the icon in the HugeIcons collection
    const IconData = (HugeIconsFree as any)[iconName]
    if (IconData) {
        return (
            <HugeiconsIcon 
                icon={IconData} 
                size={16} 
                color="currentColor" 
                strokeWidth={2}
            />
        )
    }
    
    return <ArrowRight className="h-4 w-4 text-white" />
}

type BannerLinkType = "url" | "product" | "sale"

interface BannerSaleOption {
    id: string
    name: string
    status: string
    startsAt: string
}

interface BannerProductOption {
    _id: string
    name: string
    category?: string
    slug?: string
}

interface Banner {
    // Stable key while editing; never sent to the server.
    clientId: string
    _id?: string
    title: string
    subtitle: string
    tag: string
    imageUrl: string
    linkUrl: string
    linkType: BannerLinkType
    linkedProductId: string
    // A sale page (/sale/<id>): the banner shows only while that sale is live.
    linkedSaleId: string
    buttonText: string
    buttonIcon: string
    isActive: boolean
    order: number
}

function buildProductLink(productId: string) {
    return productId ? `/product/${productId}` : ""
}

function inferLinkedProductId(linkUrl: unknown) {
    const value = String(linkUrl || "").trim()
    const match = value.match(/^\/product\/([^/?#]+)/i)
    return match?.[1] || ""
}

function buildSaleLink(saleId: string) {
    return saleId ? `/sale/${saleId}` : ""
}

function inferLinkedSaleId(linkUrl: unknown) {
    const match = String(linkUrl || "").trim().match(/^\/sale\/([a-f0-9]{24})/i)
    return match?.[1] || ""
}

function newClientId() {
    return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `b-${Math.random().toString(36).slice(2)}`
}

// What gets saved: the on-screen order becomes the stored order.
function toPayload(banners: Banner[]) {
    return banners.map(({ clientId, ...banner }, index) => ({ ...banner, order: index }))
}

function createEmptyBanner(order: number): Banner {
    return {
        clientId: newClientId(),
        title: "",
        subtitle: "",
        tag: "",
        imageUrl: "",
        linkUrl: "",
        linkType: "url",
        linkedProductId: "",
        linkedSaleId: "",
        buttonText: "Shop Now",
        buttonIcon: "ArrowRight",
        isActive: true,
        order,
    }
}

function normalizeBanner(banner: any, index: number): Banner {
    const linkedProductId = String(banner?.linkedProductId || inferLinkedProductId(banner?.linkUrl))
    const linkedSaleId = inferLinkedSaleId(banner?.linkUrl)
    const linkType: BannerLinkType = linkedSaleId
        ? "sale"
        : banner?.linkType === "product" || linkedProductId ? "product" : "url"

    return {
        clientId: newClientId(),
        _id: typeof banner?._id === "string" ? banner._id : undefined,
        title: String(banner?.title || ""),
        subtitle: String(banner?.subtitle || ""),
        tag: String(banner?.tag || ""),
        imageUrl: String(banner?.imageUrl || ""),
        linkUrl: String(banner?.linkUrl || (linkType === "product" ? buildProductLink(linkedProductId) : "")),
        linkType,
        linkedProductId,
        linkedSaleId,
        buttonText: String(banner?.buttonText || "Shop Now"),
        buttonIcon: String(banner?.buttonIcon || "ArrowRight"),
        isActive: banner?.isActive !== false,
        order: Number.isFinite(banner?.order) ? banner.order : index,
    }
}

function BannerIconPicker({ value, onSelect }: { value: string, onSelect: (val: string) => void }) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between bg-[#161616] border-[#333] text-white hover:bg-[#222]"
                >
                    <div className="flex items-center gap-2">
                        {getIconComponent(value)}
                        <span>{ICON_OPTIONS.find(opt => opt.value === value)?.label || 
                              ALL_HUGE_ICONS.find(opt => opt.value === value)?.label || 
                              "Select icon"}</span>
                    </div>
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="w-[300px] p-0 bg-[#161616] border-[#333] z-[100]">
                <Command className="bg-[#161616] text-white" shouldFilter={false}>
                    <CommandInput
                        placeholder="Type to search all icons..."
                        className="text-white"
                        onValueChange={setSearch}
                    />
                    <CommandEmpty>No icon found.</CommandEmpty>

                    <div className="max-h-[300px] overflow-y-auto min-h-[300px]">
                        {/* Show suggestions only when NOT searching */}
                        {!search && (
                            <CommandGroup heading="Product & Offers" className="text-[#919191]">
                                {ICON_OPTIONS.map((opt) => (
                                    <CommandItem
                                        key={opt.value}
                                        value={opt.value}
                                        onSelect={(val) => {
                                            // Directly select the value from ICON_OPTIONS finding logic
                                            const original = ICON_OPTIONS.find(o => o.value.toLowerCase() === val.toLowerCase())?.value || val
                                            onSelect(original)
                                            setOpen(false)
                                            setSearch("")
                                        }}
                                        className="hover:bg-[#333] cursor-pointer text-white"
                                    >
                                        <div className="flex items-center gap-2">
                                            {getIconComponent(opt.value)}
                                            <span>{opt.label}</span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}

                        {/* Show results only when searching */}
                        {search && (
                            <CommandGroup heading="Search Results" className="text-[#919191]">
                                {ALL_HUGE_ICONS.filter(opt =>
                                    opt.label.toLowerCase().includes(search.toLowerCase()) ||
                                    opt.value.toLowerCase().includes(search.toLowerCase()) ||
                                    opt.value === value // keep current icon visible if possible
                                ).slice(0, 50).map((opt: any) => (
                                    <CommandItem
                                        key={opt.value}
                                        value={opt.value}
                                        onSelect={(val) => {
                                            const originalValue = ALL_HUGE_ICONS.find(i => i.value.toLowerCase() === val.toLowerCase())?.value || val
                                            onSelect(originalValue)
                                            setOpen(false)
                                            setSearch("")
                                        }}
                                        className="hover:bg-[#333] cursor-pointer text-white"
                                    >
                                        <div className="flex items-center gap-2">
                                            {getIconComponent(opt.value)}
                                            <span>{opt.label}</span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </div>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

export default function BannersPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [heroBanners, setHeroBanners] = useState<Banner[]>([])
    const [promoBanners, setPromoBanners] = useState<Banner[]>([])
    const [availableProducts, setAvailableProducts] = useState<BannerProductOption[]>([])
    const [isLoadingProductOptions, setIsLoadingProductOptions] = useState(false)
    // Sales a banner can link to (not ended).
    const [saleOptions, setSaleOptions] = useState<BannerSaleOption[]>([])
    useEffect(() => {
        apiFetch("/admin/sales")
            .then((res) => res.json())
            .then((body) => {
                const list = Array.isArray(body?.data) ? body.data : []
                setSaleOptions(list
                    .filter((sale: any) => sale?.status !== "ended")
                    .map((sale: any) => ({ id: String(sale.id), name: String(sale.name || ""), status: String(sale.status || ""), startsAt: String(sale.startsAt || "") })))
            })
            .catch(() => setSaleOptions([]))
    }, [])
    const [isSavingHero, setIsSavingHero] = useState(false)
    const [isSavingPromo, setIsSavingPromo] = useState(false)
    // What was last loaded or saved: edits only count once saved.
    const savedHero = useRef("[]")
    const savedPromo = useRef("[]")
    const [, setSavedVersion] = useState(0)
    const [uploadingIndex, setUploadingIndex] = useState<{ type: 'hero' | 'promo', index: number } | null>(null)

    async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>, type: 'hero' | 'promo', index: number) {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingIndex({ type, index })

        const formData = new FormData()
        formData.append('image', file)

        try {
            const token = localStorage.getItem('accessToken')
            const res = await fetch(buildApiUrl('/upload/image?folder=banners'), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })

            const data = await res.json()
            if (res.ok && data.success) {
                if (type === 'hero') {
                    updateHeroBanner(index, 'imageUrl', data.data.url)
                } else {
                    updatePromoBanner(index, 'imageUrl', data.data.url)
                }
                toast.success("Image uploaded successfully")
            } else {
                toast.error(data.message || "Upload failed")
            }
        } catch (error) {
            toast.error("Error uploading image")
        } finally {
            setUploadingIndex(null)
            // Reset the input value so the same file can be uploaded again if needed
            e.target.value = ''
        }
    }

    useEffect(() => {
        fetchBanners()
        loadProductOptions()
    }, [])

    async function fetchBanners() {
        try {
            const res = await apiFetch('/admin/settings')
            const data = await res.json()
            if (res.ok && data.data) {
                if (data.data.heroBanners) {
                    const loaded = data.data.heroBanners.map((banner: any, index: number) => normalizeBanner(banner, index))
                    savedHero.current = JSON.stringify(toPayload(loaded))
                    setHeroBanners(loaded)
                }
                if (data.data.promoBanners) {
                    const loaded = data.data.promoBanners.map((banner: any, index: number) => normalizeBanner(banner, index))
                    savedPromo.current = JSON.stringify(toPayload(loaded))
                    setPromoBanners(loaded)
                }
            }
        } catch (error) {
            toast.error("Failed to load banners")
        } finally {
            setIsLoading(false)
        }
    }

    async function loadProductOptions() {
        setIsLoadingProductOptions(true)
        try {
            const collected: BannerProductOption[] = []
            let page = 1
            let hasNext = true

            while (hasNext && page <= 20) {
                const res = await apiFetch(`/admin/products?page=${page}&limit=50&status=active&sort=name:asc`)
                const data = await res.json()
                if (!res.ok) throw new Error("failed")

                const items = Array.isArray(data?.data) ? data.data : []
                collected.push(
                    ...items
                        .map((item: any) => ({
                            _id: String(item?._id || ""),
                            name: String(item?.name || ""),
                            category: typeof item?.category === "string" ? item.category : "",
                            slug: typeof item?.slug === "string" ? item.slug : "",
                        }))
                        .filter((item: BannerProductOption) => item._id && item.name)
                )

                hasNext = Boolean(data?.pagination?.hasNext)
                page += 1
            }

            setAvailableProducts(collected)
        } catch {
            toast.error("Failed to load products for banner links")
        } finally {
            setIsLoadingProductOptions(false)
        }
    }

    // Hero Banners CRUD
    function addHeroBanner() {
        setHeroBanners(prev => [...prev, createEmptyBanner(prev.length)])
    }

    function updateHeroBanner(index: number, field: keyof Banner, value: string | boolean | number) {
        setHeroBanners(prev => prev.map((b, i) => i === index ? { ...b, [field]: value } : b))
    }

    function removeHeroBanner(index: number) {
        setHeroBanners(prev => prev.filter((_, i) => i !== index))
    }

    async function saveHeroBanners() {
        setIsSavingHero(true)
        try {
            const res = await apiFetch('/admin/settings', {
                method: 'PUT',
                body: JSON.stringify({ heroBanners: toPayload(heroBanners) })
            })
            if (res.ok) {
                savedHero.current = JSON.stringify(toPayload(heroBanners))
                setSavedVersion((v) => v + 1)
                toast.success("Hero banners saved successfully")
            } else {
                toast.error("Failed to save hero banners")
            }
        } catch {
            toast.error("Error saving hero banners")
        } finally {
            setIsSavingHero(false)
        }
    }

    // Promo Banners CRUD
    function addPromoBanner() {
        setPromoBanners(prev => [...prev, createEmptyBanner(prev.length)])
    }

    function updatePromoBanner(index: number, field: keyof Banner, value: string | boolean | number) {
        setPromoBanners(prev => prev.map((b, i) => i === index ? { ...b, [field]: value } : b))
    }

    function removePromoBanner(index: number) {
        setPromoBanners(prev => prev.filter((_, i) => i !== index))
    }

    // Reorder by the banners' stable keys.
    function reorderBanners(
        setter: React.Dispatch<React.SetStateAction<Banner[]>>,
        orderedIds: string[],
    ) {
        setter(prev => orderedIds
            .map(id => prev.find(banner => banner.clientId === id))
            .filter((banner): banner is Banner => Boolean(banner)))
    }

    // Moves a banner one place up (-1) or down (+1); saved with the list.
    function moveBanner(
        setter: React.Dispatch<React.SetStateAction<Banner[]>>,
        index: number,
        direction: -1 | 1,
    ) {
        setter(prev => {
            const target = index + direction
            if (target < 0 || target >= prev.length) return prev
            const next = [...prev]
            ;[next[index], next[target]] = [next[target], next[index]]
            return next
        })
    }

    async function savePromoBanners() {
        setIsSavingPromo(true)
        try {
            const res = await apiFetch('/admin/settings', {
                method: 'PUT',
                body: JSON.stringify({ promoBanners: toPayload(promoBanners) })
            })
            if (res.ok) {
                savedPromo.current = JSON.stringify(toPayload(promoBanners))
                setSavedVersion((v) => v + 1)
                toast.success("Promo banners saved successfully")
            } else {
                toast.error("Failed to save promo banners")
            }
        } catch {
            toast.error("Error saving promo banners")
        } finally {
            setIsSavingPromo(false)
        }
    }

    const heroUnsaved = !isLoading && JSON.stringify(toPayload(heroBanners)) !== savedHero.current
    const promoUnsaved = !isLoading && JSON.stringify(toPayload(promoBanners)) !== savedPromo.current

    // Leaving the page with unsaved banner changes asks first.
    useEffect(() => {
        if (!heroUnsaved && !promoUnsaved) return
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
        window.addEventListener("beforeunload", warn)
        return () => window.removeEventListener("beforeunload", warn)
    }, [heroUnsaved, promoUnsaved])

    function renderBannerCard(
        banner: Banner,
        index: number,
        type: 'hero' | 'promo',
        updateFn: (index: number, field: keyof Banner, value: string | boolean | number) => void,
        removeFn: (index: number) => void,
        handle?: React.ReactNode,
        moveFn?: (index: number, direction: -1 | 1) => void,
        count = 0,
    ) {
        const isUploading = uploadingIndex?.type === type && uploadingIndex?.index === index
        const selectedProduct = availableProducts.find((product) => product._id === banner.linkedProductId)

        return (
            <div className="border border-[#333] rounded-lg p-4 space-y-4 bg-[#0D0D0D]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {handle ?? <GripVertical className="h-4 w-4 text-[#555]" />}
                        <span className="text-sm font-medium text-white">Banner {index + 1}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {moveFn && (
                            <div className="flex items-center rounded-md border border-[#333]">
                                <Button
                                    variant="ghost" size="icon"
                                    className="h-8 w-8 text-white hover:bg-[#222] disabled:opacity-30"
                                    onClick={() => moveFn(index, -1)}
                                    disabled={index === 0}
                                    aria-label={`Move banner ${index + 1} up`}
                                    title="Move up"
                                >
                                    <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost" size="icon"
                                    className="h-8 w-8 text-white hover:bg-[#222] disabled:opacity-30"
                                    onClick={() => moveFn(index, 1)}
                                    disabled={index >= count - 1}
                                    aria-label={`Move banner ${index + 1} down`}
                                    title="Move down"
                                >
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-[#919191]">Active</span>
                            <Switch
                                checked={banner.isActive}
                                onCheckedChange={(val) => updateFn(index, 'isActive', val)}
                            />
                        </div>
                        <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            onClick={() => removeFn(index)}
                         aria-label="Delete" title="Delete">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex gap-4">
                    {/* Image Preview */}
                    <div className="h-32 w-48 rounded-md border border-[#333] overflow-hidden bg-[#161616] flex-shrink-0 flex items-center justify-center relative">
                        {banner.imageUrl ? (
                            <img
                                src={banner.imageUrl}
                                alt="Preview"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = placeholderImage("Image not found", 600, 400);
                                }}
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-1 text-[#555]">
                                <ImageIcon className="h-8 w-8" />
                                <span className="text-[11px]">No Image</span>
                            </div>
                        )}

                        {isUploading && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-white" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-[#919191] mb-1 block">Title *</label>
                                <Input
                                    className="bg-[#161616] border-[#333] text-white text-sm"
                                    placeholder="e.g. Summer Sale"
                                    value={banner.title}
                                    onChange={(e) => updateFn(index, 'title', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-[#919191] mb-1 block">Tag</label>
                                <Input
                                    className="bg-[#161616] border-[#333] text-white text-sm"
                                    placeholder="e.g. NEW ARRIVAL"
                                    value={banner.tag}
                                    onChange={(e) => updateFn(index, 'tag', e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-[#919191] mb-1 block">Subtitle</label>
                            <Input
                                className="bg-[#161616] border-[#333] text-white text-sm"
                                placeholder="e.g. Up to 20% off on bulk orders"
                                value={banner.subtitle}
                                onChange={(e) => updateFn(index, 'subtitle', e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-[#919191] mb-1 block">Banner Image</label>
                                <input
                                    type="file"
                                    id={`upload-${type}-${index}`}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleBannerUpload(e, type, index)}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A] flex items-center justify-center gap-2 h-10"
                                    onClick={() => document.getElementById(`upload-${type}-${index}`)?.click()}
                                    disabled={isUploading}
                                >
                                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                    <span className="text-sm">
                                        {banner.imageUrl ? "Change Image" : "Upload Image"}
                                    </span>
                                </Button>
                            </div>
                            <div>
                                <label className="text-xs text-[#919191] mb-1 block">Link Type</label>
                                <div className="space-y-2">
                                    <select
                                        className="h-10 w-full rounded-md border border-[#333] bg-[#161616] px-3 text-sm text-white"
                                        value={banner.linkType}
                                        onChange={(e) => {
                                            const nextType = e.target.value as BannerLinkType
                                            updateFn(index, 'linkType', nextType)
                                            if (nextType === 'product') {
                                                updateFn(index, 'linkUrl', buildProductLink(banner.linkedProductId))
                                            }
                                            if (nextType === 'sale') {
                                                updateFn(index, 'linkUrl', buildSaleLink(banner.linkedSaleId))
                                            }
                                        }}
                                    >
                                        <option value="url">Custom URL</option>
                                        <option value="product">Link Product</option>
                                        <option value="sale">Link Sale</option>
                                    </select>

                                    {banner.linkType === 'sale' ? (
                                        <div className="space-y-2">
                                            <select
                                                className="h-10 w-full rounded-md border border-[#333] bg-[#161616] px-3 text-sm text-white"
                                                value={banner.linkedSaleId}
                                                onChange={(e) => {
                                                    updateFn(index, 'linkedSaleId', e.target.value)
                                                    updateFn(index, 'linkUrl', buildSaleLink(e.target.value))
                                                }}
                                            >
                                                <option value="">{saleOptions.length ? "Select sale to link" : "No upcoming or live sales"}</option>
                                                {saleOptions.map((sale) => (
                                                    <option key={sale.id} value={sale.id}>
                                                        {sale.name} ({sale.status === "live" ? "live" : sale.status === "upcoming" ? `starts ${formatDate(sale.startsAt)}` : sale.status})
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-[11px] text-gray-400">
                                                Opens the sale page. The banner shows only while the sale is live, so you can set it up early.
                                            </p>
                                        </div>
                                    ) : banner.linkType === 'product' ? (
                                        <div className="space-y-2">
                                            <select
                                                className="h-10 w-full rounded-md border border-[#333] bg-[#161616] px-3 text-sm text-white"
                                                value={banner.linkedProductId}
                                                onChange={(e) => {
                                                    const nextProductId = e.target.value
                                                    updateFn(index, 'linkedProductId', nextProductId)
                                                    updateFn(index, 'linkUrl', buildProductLink(nextProductId))
                                                }}
                                                disabled={isLoadingProductOptions}
                                            >
                                                <option value="">{isLoadingProductOptions ? "Loading products..." : "Select product to link"}</option>
                                                {availableProducts.map((product) => (
                                                    <option key={product._id} value={product._id}>
                                                        {product.name}{product.category ? ` (${product.category})` : ""}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-[11px] text-gray-400">
                                                {selectedProduct
                                                    ? `Tapping the banner opens ${selectedProduct.name}.`
                                                    : "Choose the product this banner opens."}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Input
                                                className="bg-[#161616] border-[#333] text-white text-sm"
                                                placeholder="e.g. https://www.veepeeimpex.com/products/…"
                                                value={banner.linkUrl}
                                                onChange={(e) => updateFn(index, 'linkUrl', e.target.value)}
                                            />
                                            <p className="text-[11px] text-gray-400">For a link that isn&apos;t a single product.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Button and Icon Customization */}
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#333]">
                            <div>
                                <label className="text-xs text-[#919191] mb-1 block">Button Text</label>
                                <div className="space-y-2">
                                    <Input
                                        className="bg-[#161616] border-[#333] text-white text-sm"
                                        placeholder="e.g. Shop Now"
                                        value={banner.buttonText}
                                        onChange={(e) => updateFn(index, 'buttonText', e.target.value)}
                                        list={`suggestions-${type}-${index}`}
                                    />
                                    <datalist id={`suggestions-${type}-${index}`}>
                                        {BUTTON_TEXT_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                                    </datalist>
                                    <div className="flex flex-wrap gap-1">
                                        {BUTTON_TEXT_SUGGESTIONS.map(suggestion => (
                                            <button
                                                key={suggestion}
                                                type="button"
                                                onClick={() => updateFn(index, 'buttonText', suggestion)}
                                                className="text-[11px] px-2 py-1 rounded bg-[#333] text-white hover:bg-[#444] transition-colors"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-[#919191] mb-1 block">Button Icon</label>
                                <BannerIconPicker
                                    value={banner.buttonIcon}
                                    onSelect={(val) => updateFn(index, 'buttonIcon', val)}
                                />
                                <p className="text-[11px] text-[#555] mt-1">Select an icon for the button. Only top 4 suggested by default.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#86efac]" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 max-w-6xl">
            <div>
                <h1 className="text-3xl font-bold text-white">Banner Management</h1>
                <p className="text-[#919191] mt-1">Manage promotional banners shown on the app home screen</p>
            </div>

            {(heroUnsaved || promoUnsaved) && (
                <div role="status" className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                    <span>You have unsaved changes to the {heroUnsaved && promoUnsaved ? "top and bottom" : heroUnsaved ? "top (hero)" : "bottom (promo)"} banners. They aren&apos;t live until you save.</span>
                    <div className="flex gap-2">
                        {heroUnsaved && <Button size="sm" onClick={saveHeroBanners} disabled={isSavingHero} className="bg-[#86efac] text-black hover:bg-[#86efac]/90">{isSavingHero && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save top banners</Button>}
                        {promoUnsaved && <Button size="sm" onClick={savePromoBanners} disabled={isSavingPromo} className="bg-[#86efac] text-black hover:bg-[#86efac]/90">{isSavingPromo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save bottom banners</Button>}
                    </div>
                </div>
            )}

            <Tabs defaultValue="hero" className="w-full">
                <TabsList className="bg-[#161616] border border-[#333]">
                    <TabsTrigger value="hero" className="data-[state=active]:bg-[#333] data-[state=active]:text-white text-[#919191]">
                        Top Banners (Hero)
                    </TabsTrigger>
                    <TabsTrigger value="promo" className="data-[state=active]:bg-[#333] data-[state=active]:text-white text-[#919191]">
                        Bottom Banners (Promo)
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="hero" className="mt-4">
                    <Card className="bg-[#161616] border-[#333]">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <ImageIcon className="h-5 w-5" /> Top Banners
                                    </CardTitle>
                                    <CardDescription className="text-[#919191]">Main carousel at the top of the home screen</CardDescription>
                                </div>
                                <Button onClick={addHeroBanner} variant="outline" size="sm" className="border-[#333] text-white hover:bg-[#222]">
                                    <Plus className="h-4 w-4 mr-1" /> Add Banner
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {heroBanners.length === 0 ? (
                                <div className="text-center py-8 text-[#919191]">
                                    <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
                                    <p className="text-sm">No hero banners yet. Add your first banner.</p>
                                </div>
                            ) : (
                                <SortableProvider
                                    ids={heroBanners.map(banner => banner.clientId)}
                                    onReorder={(ids) => reorderBanners(setHeroBanners, ids)}
                                >
                                    {heroBanners.map((banner, index) => (
                                        <SortableItem key={banner.clientId} id={banner.clientId}>
                                            {(handle) => renderBannerCard(banner, index, 'hero', updateHeroBanner, removeHeroBanner, handle, (i, d) => moveBanner(setHeroBanners, i, d), heroBanners.length)}
                                        </SortableItem>
                                    ))}
                                </SortableProvider>
                            )}
                            {heroBanners.length > 0 && (
                                <Button onClick={saveHeroBanners} disabled={isSavingHero} className="w-full">
                                    {isSavingHero && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <Save className="mr-2 h-4 w-4" /> Save Hero Banners
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="promo" className="mt-4">
                    <Card className="bg-[#161616] border-[#333]">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <ImageIcon className="h-5 w-5" /> Bottom Banners
                                    </CardTitle>
                                    <CardDescription className="text-[#919191]">Promotional carousel displayed just above the "Why Buy From Us" section</CardDescription>
                                </div>
                                <Button onClick={addPromoBanner} variant="outline" size="sm" className="border-[#333] text-white hover:bg-[#222]">
                                    <Plus className="h-4 w-4 mr-1" /> Add Banner
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {promoBanners.length === 0 ? (
                                <div className="text-center py-8 text-[#919191]">
                                    <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
                                    <p className="text-sm">No promo banners yet. Add your first banner.</p>
                                </div>
                            ) : (
                                <SortableProvider
                                    ids={promoBanners.map(banner => banner.clientId)}
                                    onReorder={(ids) => reorderBanners(setPromoBanners, ids)}
                                >
                                    {promoBanners.map((banner, index) => (
                                        <SortableItem key={banner.clientId} id={banner.clientId}>
                                            {(handle) => renderBannerCard(banner, index, 'promo', updatePromoBanner, removePromoBanner, handle, (i, d) => moveBanner(setPromoBanners, i, d), promoBanners.length)}
                                        </SortableItem>
                                    ))}
                                </SortableProvider>
                            )}
                            {promoBanners.length > 0 && (
                                <Button onClick={savePromoBanners} disabled={isSavingPromo} className="w-full">
                                    {isSavingPromo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <Save className="mr-2 h-4 w-4" /> Save Promo Banners
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
