"use client"

import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Loader2, Plus, Save, Trash2, Upload, Globe } from "lucide-react"

type WebsiteCategory = { name: string; description: string; image: string; products: string[]; isActive: boolean; order: number }
type WebsiteFeaturedProduct = { name: string; price: string; image: string; badge: string; specs: string[]; isActive: boolean; order: number }
type WebsiteHeroCard = { image: string; order: number }
type SectionConfig = { eyebrow: string; title: string; description?: string; sideText?: string; buttonText: string }

const DEFAULT_HERO_CARD_IMAGES = ["/images/Banner/1.jpg", "/images/Banner/2.jpg", "/images/Banner/3.jpg", "/images/Banner/4.jpg", "/images/Banner/5.jpg", "/images/Banner/1.jpg"]
const defaultHeroCards = (): WebsiteHeroCard[] => DEFAULT_HERO_CARD_IMAGES.map((image, order) => ({ image, order }))
const normalizeList = (values: string[]) => values.map((v) => v.trim()).filter(Boolean)
const defaultCategoriesSection: SectionConfig = {
    eyebrow: "PRODUCT CATEGORIES",
    title: "The Heart of Modern Farming",
    description: "Our diverse range of agriculture and industrial machines stands at the core of modern farming practices. Each piece of equipment is designed with utmost precision.",
    buttonText: "Inquire Now",
}
const defaultFeaturedSection: SectionConfig = {
    eyebrow: "PRECISION ENGINEERING",
    title: "Our Popular Product",
    sideText: "Genuine Oxon products engineered for durability, performance, and maximum ROI.",
    buttonText: "Get Quote",
}

export default function ManageWebsitePage() {
    const [isLoading, setIsLoading] = useState(true)
    const [isSavingHero, setIsSavingHero] = useState(false)
    const [isSavingCategories, setIsSavingCategories] = useState(false)
    const [isSavingProducts, setIsSavingProducts] = useState(false)
    const [uploading, setUploading] = useState<string | null>(null)
    const [heroCards, setHeroCards] = useState<WebsiteHeroCard[]>(defaultHeroCards())
    const [categories, setCategories] = useState<WebsiteCategory[]>([])
    const [featuredProducts, setFeaturedProducts] = useState<WebsiteFeaturedProduct[]>([])
    const [categoriesSection, setCategoriesSection] = useState<SectionConfig>(defaultCategoriesSection)
    const [featuredSection, setFeaturedSection] = useState<SectionConfig>(defaultFeaturedSection)

    const uploadUrl = useMemo(() => {
        const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1"
        const origin = rawBase.replace(/\/api\/v1\/?$/, "")
        return `${origin}/api/v1/upload/image?folder=website`
    }, [])
    const websiteBaseUrl = useMemo(() => {
        const raw = process.env.NEXT_PUBLIC_WEBSITE_BASE_URL || "http://localhost:3000"
        return raw.replace(/\/+$/, "")
    }, [])

    function previewSrc(url: string) {
        if (!url) return ""
        if (url.startsWith("http://") || url.startsWith("https://")) return url
        if (url.startsWith("/")) return `${websiteBaseUrl}${url}`
        return url
    }

    useEffect(() => { loadData() }, [])

    async function loadData() {
        try {
            const res = await apiFetch("/admin/website-settings")
            const data = await res.json()
            if (!res.ok || !data?.data) throw new Error("failed")
            setCategories(data.data.productCategories || [])
            setFeaturedProducts(data.data.featuredProducts || [])
            setCategoriesSection({ ...defaultCategoriesSection, ...(data.data.categoriesSection || {}) })
            setFeaturedSection({ ...defaultFeaturedSection, ...(data.data.featuredSection || {}) })
            const incoming = Array.isArray(data.data.heroCards) ? data.data.heroCards : []
            setHeroCards(incoming.length === 6 ? incoming.map((x: any, i: number) => ({ image: x?.image || DEFAULT_HERO_CARD_IMAGES[i], order: i })) : defaultHeroCards())
        } catch {
            toast.error("Failed to load website settings")
        } finally {
            setIsLoading(false)
        }
    }

    async function uploadImage(e: React.ChangeEvent<HTMLInputElement>, type: "hero" | "category" | "featured", index: number) {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(`${type}-${index}`)
        try {
            const token = localStorage.getItem("accessToken")
            const formData = new FormData()
            formData.append("image", file)
            const res = await fetch(uploadUrl, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData })
            const data = await res.json()
            if (!res.ok || !data?.data?.url) throw new Error("Upload failed")
            if (type === "hero") setHeroCards((prev) => prev.map((h, i) => i === index ? { ...h, image: data.data.url } : h))
            if (type === "category") setCategories((prev) => prev.map((c, i) => i === index ? { ...c, image: data.data.url } : c))
            if (type === "featured") setFeaturedProducts((prev) => prev.map((p, i) => i === index ? { ...p, image: data.data.url } : p))
            toast.success("Image uploaded")
        } catch {
            toast.error("Failed to upload image")
        } finally {
            setUploading(null)
            e.target.value = ""
        }
    }

    async function saveHeroCards() {
        setIsSavingHero(true)
        try {
            const heroCardsPayload = heroCards.map((item, index) => ({ image: item.image || DEFAULT_HERO_CARD_IMAGES[index], order: index }))
            const res = await apiFetch("/admin/website-settings", { method: "PUT", body: JSON.stringify({ heroCards: heroCardsPayload }) })
            if (!res.ok) throw new Error()
            toast.success("Hero images saved")
        } catch {
            toast.error("Failed to save hero images")
        } finally { setIsSavingHero(false) }
    }

    async function saveCategories() {
        setIsSavingCategories(true)
        try {
            const productCategories = categories.map((c, i) => ({ ...c, products: normalizeList(c.products || []), order: Number.isFinite(c.order) ? c.order : i }))
            const res = await apiFetch("/admin/website-settings", { method: "PUT", body: JSON.stringify({ productCategories, categoriesSection }) })
            if (!res.ok) throw new Error()
            toast.success("Website product categories saved")
        } catch {
            toast.error("Failed to save product categories")
        } finally { setIsSavingCategories(false) }
    }

    async function saveProducts() {
        setIsSavingProducts(true)
        try {
            const featuredProductsPayload = featuredProducts.map((p, i) => ({ ...p, specs: normalizeList(p.specs || []), order: Number.isFinite(p.order) ? p.order : i }))
            const res = await apiFetch("/admin/website-settings", { method: "PUT", body: JSON.stringify({ featuredProducts: featuredProductsPayload, featuredSection }) })
            if (!res.ok) throw new Error()
            toast.success("Website featured products saved")
        } catch {
            toast.error("Failed to save featured products")
        } finally { setIsSavingProducts(false) }
    }

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-[#86efac]" /></div>

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3"><Globe className="h-7 w-7 text-[#86efac]" />Manage Website</h1>
                <p className="text-[#919191] mt-1">Hero has fixed 6 cards. Admin can only update image.</p>
            </div>

            <Tabs defaultValue="hero" className="w-full">
                <TabsList className="bg-[#161616] border border-[#333]">
                    <TabsTrigger value="hero" className="data-[state=active]:bg-[#333] data-[state=active]:text-white text-[#919191]">Hero Section</TabsTrigger>
                    <TabsTrigger value="categories" className="data-[state=active]:bg-[#333] data-[state=active]:text-white text-[#919191]">Product Categories</TabsTrigger>
                    <TabsTrigger value="featured" className="data-[state=active]:bg-[#333] data-[state=active]:text-white text-[#919191]">Popular Products</TabsTrigger>
                </TabsList>

                <TabsContent value="hero" className="mt-4">
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                        <Card className="bg-gradient-to-b from-[#181b20] to-[#151515] border-[#2E3340] xl:col-span-8 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 rounded-full bg-[#86efac]" />
                                    Hero Banner Cards
                                </CardTitle>
                                <CardDescription className="text-[#A5A9B5]">Exactly 6 cards. Only image is editable.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {heroCards.map((item, index) => (
                                    <div key={index} className="border border-[#303543] rounded-2xl p-4 bg-[#121417] space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-white font-semibold">Hero Card {index + 1}</p>
                                            <span className="text-[11px] px-2 py-1 rounded-full bg-[#202633] text-[#8FB2FF] border border-[#2E3A50]">Slide {index + 1}</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-[1fr_170px] gap-3 items-start">
                                            <Input value={item.image} onChange={(e) => setHeroCards((prev) => prev.map((h, i) => i === index ? { ...h, image: e.target.value } : h))} className="bg-[#0D0D0D] border-[#2F3542] text-white" />
                                            <div className="h-24 rounded-xl overflow-hidden border border-[#2F3542] bg-[#0D0D0D]">
                                                {item.image ? (
                                                    <img
                                                        src={previewSrc(item.image)}
                                                        alt={`Hero preview ${index + 1}`}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = `https://placehold.co/400x220/0b0f16/9ca3af?text=Hero+${index + 1}`;
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs text-[#666]">No image</div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            <input id={`hero-upload-${index}`} type="file" className="hidden" accept="image/*" onChange={(e) => uploadImage(e, "hero", index)} />
                                            <Button type="button" variant="outline" className="border-[#2F3542] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A]" onClick={() => document.getElementById(`hero-upload-${index}`)?.click()} disabled={uploading === `hero-${index}`}>
                                                {uploading === `hero-${index}` ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}Upload Image
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                <Button onClick={saveHeroCards} disabled={isSavingHero} className="w-full bg-gradient-to-r from-[#86efac] to-[#57d08f] text-black hover:opacity-95">{isSavingHero ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save Hero Images</Button>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-b from-[#171a22] to-[#141414] border-[#2E3340] xl:col-span-4 xl:sticky xl:top-24 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
                            <CardHeader>
                                <CardTitle className="text-white text-lg">Live Preview</CardTitle>
                                <CardDescription className="text-[#A5A9B5]">Final look of all 6 hero slides.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                                    {heroCards.map((item, i) => (
                                        <div key={i} className="rounded-2xl overflow-hidden border border-[#2F3542] bg-[#0C0E13]">
                                            <div className="relative h-28">
                                                {item.image ? (
                                                    <img
                                                        src={previewSrc(item.image)}
                                                        alt={`Hero ${i + 1}`}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = `https://placehold.co/600x260/0b0f16/9ca3af?text=Hero+${i + 1}`;
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs text-[#666]">No Image</div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                                                <div className="absolute top-2 left-2 text-[11px] px-2 py-1 rounded-full bg-black/60 text-white border border-white/20">Hero {i + 1}</div>
                                            </div>
                                            <div className="p-2 flex items-center justify-between">
                                                <p className="text-xs text-[#A5A9B5] truncate">Card {i + 1}</p>
                                                <div className="w-14 h-1.5 rounded-full bg-[#202633] overflow-hidden">
                                                    <div className="h-full bg-[#86efac]" style={{ width: `${((i + 1) / 6) * 100}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="categories" className="mt-4">
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                        <Card className="bg-[#161616] border-[#333] xl:col-span-8">
                            <CardHeader><div className="flex items-center justify-between gap-4"><div><CardTitle className="text-white">The Heart of Modern Farming</CardTitle></div><Button onClick={() => setCategories((prev) => [...prev, { name: "", description: "", image: "", products: [""], isActive: true, order: prev.length }])} variant="outline" className="border-[#333] text-white hover:bg-[#222]"><Plus className="h-4 w-4 mr-2" /> Add Category Card</Button></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="border border-[#333] rounded-lg p-4 space-y-3 bg-[#121212]">
                                    <p className="text-sm font-semibold text-white">Section Content</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Input value={categoriesSection.eyebrow || ""} onChange={(e) => setCategoriesSection((prev) => ({ ...prev, eyebrow: e.target.value }))} placeholder="Eyebrow text" className="bg-[#0D0D0D] border-[#333] text-white" />
                                        <Input value={categoriesSection.title || ""} onChange={(e) => setCategoriesSection((prev) => ({ ...prev, title: e.target.value }))} placeholder="Section title" className="bg-[#0D0D0D] border-[#333] text-white" />
                                    </div>
                                    <Textarea value={categoriesSection.description || ""} onChange={(e) => setCategoriesSection((prev) => ({ ...prev, description: e.target.value }))} placeholder="Section description" className="bg-[#0D0D0D] border-[#333] text-white min-h-[70px]" />
                                    <Input value={categoriesSection.buttonText || ""} onChange={(e) => setCategoriesSection((prev) => ({ ...prev, buttonText: e.target.value }))} placeholder="Card button text" className="bg-[#0D0D0D] border-[#333] text-white" />
                                </div>
                                {categories.map((item, index) => (
                                    <div key={index} className="border border-[#333] rounded-lg p-4 space-y-3">
                                        <div className="flex justify-between items-center"><p className="text-sm text-white font-medium">Card {index + 1}</p><div className="flex items-center gap-3"><span className="text-xs text-[#919191]">Active</span><Switch checked={item.isActive !== false} onCheckedChange={(v) => setCategories((prev) => prev.map((c, i) => i === index ? { ...c, isActive: v } : c))} /><Button type="button" variant="ghost" size="icon" className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-8 w-8" onClick={() => setCategories((prev) => prev.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button></div></div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Input value={item.name} onChange={(e) => setCategories((prev) => prev.map((c, i) => i === index ? { ...c, name: e.target.value } : c))} placeholder="Category title" className="bg-[#0D0D0D] border-[#333] text-white" /><Input value={item.image} onChange={(e) => setCategories((prev) => prev.map((c, i) => i === index ? { ...c, image: e.target.value } : c))} placeholder="Image URL" className="bg-[#0D0D0D] border-[#333] text-white" /></div>
                                        <Textarea value={item.description} onChange={(e) => setCategories((prev) => prev.map((c, i) => i === index ? { ...c, description: e.target.value } : c))} placeholder="Description" className="bg-[#0D0D0D] border-[#333] text-white min-h-[70px]" />
                                        <Textarea value={(item.products || []).join("\n")} onChange={(e) => setCategories((prev) => prev.map((c, i) => i === index ? { ...c, products: e.target.value.split("\n") } : c))} placeholder="List items (one per line)" className="bg-[#0D0D0D] border-[#333] text-white min-h-[90px]" />
                                        <div className="flex justify-end"><div className="flex items-center gap-2"><input id={`category-upload-${index}`} type="file" className="hidden" accept="image/*" onChange={(e) => uploadImage(e, "category", index)} /><Button type="button" variant="outline" className="border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A]" onClick={() => document.getElementById(`category-upload-${index}`)?.click()} disabled={uploading === `category-${index}`}>{uploading === `category-${index}` ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}Upload Image</Button></div></div>
                                    </div>
                                ))}
                                {categories.length > 0 && <Button onClick={saveCategories} disabled={isSavingCategories} className="w-full">{isSavingCategories ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save Product Categories</Button>}
                            </CardContent>
                        </Card>
                        <Card className="bg-[#161616] border-[#333] xl:col-span-4 xl:sticky xl:top-24">
                            <CardHeader>
                                <CardTitle className="text-white text-lg">Live Preview</CardTitle>
                                <CardDescription className="text-[#919191]">Section header + card details preview.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                                    <div className="rounded-2xl border border-[#333] bg-[#111] p-4">
                                        <p className="text-[11px] tracking-[0.2em] text-[#ff8a32] font-semibold uppercase">{categoriesSection.eyebrow || "PRODUCT CATEGORIES"}</p>
                                        <p className="text-white text-xl font-bold mt-2">{categoriesSection.title || "The Heart of Modern Farming"}</p>
                                        <p className="text-[#a7b0bf] text-xs mt-2 line-clamp-3">{categoriesSection.description || "Section description"}</p>
                                    </div>
                                    {categories
                                        .filter((c) => c.isActive !== false)
                                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                                        .map((item, i) => (
                                            <div key={i} className="rounded-2xl overflow-hidden border border-[#333] bg-[#111]">
                                                <div className="relative h-32">
                                                    {item.image ? (
                                                        <img
                                                            src={previewSrc(item.image)}
                                                            alt={item.name || "Category"}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = `https://placehold.co/600x300/0b0f16/9ca3af?text=Category+${i + 1}`;
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs text-[#666]">No Image</div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                                                    <div className="absolute bottom-2 left-2 right-2">
                                                        <p className="text-white text-base font-semibold line-clamp-1">{item.name || "Category title"}</p>
                                                        <p className="text-[#ff8a32] text-xs mt-0.5 line-clamp-1">{item.description || "Short description"}</p>
                                                    </div>
                                                </div>
                                                <div className="p-3">
                                                    <ul className="space-y-1.5">
                                                        {normalizeList(item.products || []).slice(0, 3).map((product, idx) => (
                                                            <li key={idx} className="text-[11px] text-[#c8ced8] line-clamp-1 flex items-center gap-2">
                                                                <span className="w-1 h-1 rounded-full bg-[#86efac] shrink-0" />
                                                                {product}
                                                            </li>
                                                        ))}
                                                        {normalizeList(item.products || []).length === 0 && (
                                                            <li className="text-[11px] text-[#717171]">No list items yet</li>
                                                        )}
                                                    </ul>
                                                    <button className="mt-3 w-full py-2 rounded-lg border border-[#2f3742] bg-[#171c23] text-[#d6dde8] text-xs font-semibold">
                                                        {categoriesSection.buttonText || "Inquire Now"}
                                                    </button>
                                                    <div className="mt-3 text-[11px] text-[#9aa3b2] flex items-center justify-between">
                                                        <span>Order: {item.order ?? i}</span>
                                                        <span className="px-2 py-0.5 rounded-full bg-[#1d2a1f] text-[#86efac] border border-[#2e4d35]">Active</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="featured" className="mt-4">
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                        <Card className="bg-[#161616] border-[#333] xl:col-span-8">
                            <CardHeader><div className="flex items-center justify-between gap-4"><div><CardTitle className="text-white">Our Popular Product</CardTitle></div><Button onClick={() => setFeaturedProducts((prev) => [...prev, { name: "", price: "", image: "", badge: "", specs: [""], isActive: true, order: prev.length }])} variant="outline" className="border-[#333] text-white hover:bg-[#222]"><Plus className="h-4 w-4 mr-2" /> Add Product Card</Button></div></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="border border-[#333] rounded-lg p-4 space-y-3 bg-[#121212]">
                                    <p className="text-sm font-semibold text-white">Section Content</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Input value={featuredSection.eyebrow || ""} onChange={(e) => setFeaturedSection((prev) => ({ ...prev, eyebrow: e.target.value }))} placeholder="Eyebrow text" className="bg-[#0D0D0D] border-[#333] text-white" />
                                        <Input value={featuredSection.title || ""} onChange={(e) => setFeaturedSection((prev) => ({ ...prev, title: e.target.value }))} placeholder="Section title" className="bg-[#0D0D0D] border-[#333] text-white" />
                                    </div>
                                    <Textarea value={featuredSection.sideText || ""} onChange={(e) => setFeaturedSection((prev) => ({ ...prev, sideText: e.target.value }))} placeholder="Right side section text" className="bg-[#0D0D0D] border-[#333] text-white min-h-[70px]" />
                                    <Input value={featuredSection.buttonText || ""} onChange={(e) => setFeaturedSection((prev) => ({ ...prev, buttonText: e.target.value }))} placeholder="Card button text" className="bg-[#0D0D0D] border-[#333] text-white" />
                                </div>
                                {featuredProducts.map((item, index) => (
                                    <div key={index} className="border border-[#333] rounded-lg p-4 space-y-3">
                                        <div className="flex justify-between items-center"><p className="text-sm text-white font-medium">Card {index + 1}</p><div className="flex items-center gap-3"><span className="text-xs text-[#919191]">Active</span><Switch checked={item.isActive !== false} onCheckedChange={(v) => setFeaturedProducts((prev) => prev.map((p, i) => i === index ? { ...p, isActive: v } : p))} /><Button type="button" variant="ghost" size="icon" className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-8 w-8" onClick={() => setFeaturedProducts((prev) => prev.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button></div></div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Input value={item.name} onChange={(e) => setFeaturedProducts((prev) => prev.map((p, i) => i === index ? { ...p, name: e.target.value } : p))} placeholder="Product title" className="bg-[#0D0D0D] border-[#333] text-white" /><Input value={item.price} onChange={(e) => setFeaturedProducts((prev) => prev.map((p, i) => i === index ? { ...p, price: e.target.value } : p))} placeholder="Price text" className="bg-[#0D0D0D] border-[#333] text-white" /><Input value={item.image} onChange={(e) => setFeaturedProducts((prev) => prev.map((p, i) => i === index ? { ...p, image: e.target.value } : p))} placeholder="Image URL" className="bg-[#0D0D0D] border-[#333] text-white" /><Input value={item.badge} onChange={(e) => setFeaturedProducts((prev) => prev.map((p, i) => i === index ? { ...p, badge: e.target.value } : p))} placeholder="Badge" className="bg-[#0D0D0D] border-[#333] text-white" /></div>
                                        <Textarea value={(item.specs || []).join("\n")} onChange={(e) => setFeaturedProducts((prev) => prev.map((p, i) => i === index ? { ...p, specs: e.target.value.split("\n") } : p))} placeholder="Specs (one per line)" className="bg-[#0D0D0D] border-[#333] text-white min-h-[90px]" />
                                        <div className="flex justify-end"><div className="flex items-center gap-2"><input id={`featured-upload-${index}`} type="file" className="hidden" accept="image/*" onChange={(e) => uploadImage(e, "featured", index)} /><Button type="button" variant="outline" className="border-[#333] bg-[#0D0D0D] text-white hover:bg-[#1A1A1A]" onClick={() => document.getElementById(`featured-upload-${index}`)?.click()} disabled={uploading === `featured-${index}`}>{uploading === `featured-${index}` ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}Upload Image</Button></div></div>
                                    </div>
                                ))}
                                {featuredProducts.length > 0 && <Button onClick={saveProducts} disabled={isSavingProducts} className="w-full">{isSavingProducts ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save Popular Products</Button>}
                            </CardContent>
                        </Card>
                        <Card className="bg-[#161616] border-[#333] xl:col-span-4 xl:sticky xl:top-24">
                            <CardHeader>
                                <CardTitle className="text-white text-lg">Live Preview</CardTitle>
                                <CardDescription className="text-[#919191]">Section header + card details preview.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                                    <div className="rounded-2xl border border-[#333] bg-[#111] p-4">
                                        <p className="text-[11px] tracking-[0.2em] text-[#ff8a32] font-semibold uppercase">{featuredSection.eyebrow || "PRECISION ENGINEERING"}</p>
                                        <p className="text-white text-xl font-bold mt-2">{featuredSection.title || "Our Popular Product"}</p>
                                        <p className="text-[#a7b0bf] text-xs mt-2 line-clamp-3">{featuredSection.sideText || "Section side description"}</p>
                                    </div>
                                    {featuredProducts
                                        .filter((p) => p.isActive !== false)
                                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                                        .map((item, i) => (
                                            <div key={i} className="rounded-2xl overflow-hidden border border-[#333] bg-[#111] p-3">
                                                <div className="relative h-28 rounded-xl overflow-hidden bg-[#0d0d0d]">
                                                    {item.image ? (
                                                        <img
                                                            src={previewSrc(item.image)}
                                                            alt={item.name || "Product"}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = `https://placehold.co/600x300/0b0f16/9ca3af?text=Product+${i + 1}`;
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs text-[#666]">No Image</div>
                                                    )}
                                                    {item.badge && (
                                                        <span className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded-full bg-white/90 text-black font-semibold">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="pt-3">
                                                    <p className="text-white text-sm font-semibold line-clamp-1">{item.name || "Product title"}</p>
                                                    <p className="text-[#86efac] text-xs font-semibold mt-1">{item.price || "Price text"}</p>
                                                    <ul className="mt-2 space-y-1.5">
                                                        {normalizeList(item.specs || []).slice(0, 3).map((spec, idx) => (
                                                            <li key={idx} className="text-[11px] text-[#c8ced8] line-clamp-1 flex items-center gap-2">
                                                                <span className="w-1 h-1 rounded-full bg-[#ff8a32] shrink-0" />
                                                                {spec}
                                                            </li>
                                                        ))}
                                                        {normalizeList(item.specs || []).length === 0 && (
                                                            <li className="text-[11px] text-[#717171]">No specs yet</li>
                                                        )}
                                                    </ul>
                                            </div>
                                            <button className="mt-3 w-full py-2 rounded-lg border border-[#2f3742] bg-[#171c23] text-[#d6dde8] text-xs font-semibold">
                                                {featuredSection.buttonText || "Get Quote"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
